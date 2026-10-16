const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function prepare() {
  console.log('[PREPARE_DB] Connecting to PostgreSQL to verify extensions...');
  
  // 1. Vector extension (required for SolutionMemory embedding vector(768))
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('[PREPARE_DB] ✅ pgvector extension verified/activated.');
  } catch (err) {
    console.warn('[PREPARE_DB] ⚠️ pgvector extension activation warning:', err.message);
  }

  // 2. PostGIS extension (for geospatial queries)
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    console.log('[PREPARE_DB] ✅ PostGIS extension verified/activated.');
  } catch (err) {
    console.warn('[PREPARE_DB] ⚠️ PostGIS extension activation warning:', err.message);
  }
}

prepare()
  .then(() => {
    console.log('[PREPARE_DB] Extensions preparation complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('[PREPARE_DB] Fatal error during preparation:', err);
    process.exit(0); // Exit 0 so db push can still attempt to run
  })
  .finally(() => prisma.$disconnect());
