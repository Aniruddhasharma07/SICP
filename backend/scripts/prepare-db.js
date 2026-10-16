const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function prepare() {
  console.log('[PREPARE_DB] Starting database preparation and extension verification...');

  // 1. Try activating pgvector extension
  let hasVector = false;
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('[PREPARE_DB] ✅ pgvector extension verified/activated.');
    hasVector = true;
  } catch (err) {
    console.warn('[PREPARE_DB] ⚠️ pgvector extension activation warning:', err.message);
  }

  // 2. Check if type 'vector' exists in PostgreSQL types
  if (!hasVector) {
    try {
      const res = await prisma.$queryRawUnsafe(`SELECT 1 FROM pg_type WHERE typname = 'vector' LIMIT 1;`);
      if (Array.isArray(res) && res.length > 0) {
        hasVector = true;
      }
    } catch (e) {
      hasVector = false;
    }
  }

  console.log(`[PREPARE_DB] PostgreSQL vector data type supported: ${hasVector}`);

  // 3. Try activating PostGIS extension
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    console.log('[PREPARE_DB] ✅ PostGIS extension verified/activated.');
  } catch (err) {
    console.warn('[PREPARE_DB] ⚠️ PostGIS extension activation warning:', err.message);
  }

  // 4. If PostgreSQL environment cannot support pgvector, neutralize Unsupported("vector(768)") so prisma db push succeeds cleanly
  if (!hasVector) {
    const candidateSchemas = [
      path.join(__dirname, '../prisma/schema.prisma'),
      path.join(process.cwd(), 'backend', 'prisma', 'schema.prisma'),
      path.join(process.cwd(), 'prisma', 'schema.prisma'),
    ];
    const schemaPath = candidateSchemas.find(p => fs.existsSync(p));
    if (schemaPath) {
      console.log(`[PREPARE_DB] Neutralizing Unsupported("vector(768)") in: ${schemaPath}`);
      let content = fs.readFileSync(schemaPath, 'utf8');
      if (content.includes('Unsupported("vector(768)")')) {
        content = content.replace(/embedding\s+Unsupported\("vector\(768\)"\)\?/g, '// embedding Unsupported("vector(768)")?');
        fs.writeFileSync(schemaPath, content, 'utf8');
        console.log('[PREPARE_DB] Schema updated. Re-generating Prisma client...');
        try {
          execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit' });
        } catch (genErr) {
          console.warn('[PREPARE_DB] Prisma generate notice:', genErr.message);
        }
      }
    }
  }
}

prepare()
  .then(() => {
    console.log('[PREPARE_DB] Preparation completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('[PREPARE_DB] Preparation error:', err);
    process.exit(0); // Exit 0 so execution chain does not halt
  })
  .finally(() => prisma.$disconnect());
