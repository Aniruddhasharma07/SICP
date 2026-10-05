const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPostgis() {
  try {
    const ext = await prisma.$queryRawUnsafe("SELECT * FROM pg_extension WHERE extname = 'postgis'");
    console.log('PostGIS extension check:', ext);
    if (ext.length === 0) {
      console.log('Attempting to create PostGIS extension...');
      await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis');
      const extAfter = await prisma.$queryRawUnsafe("SELECT * FROM pg_extension WHERE extname = 'postgis'");
      console.log('PostGIS extension after CREATE:', extAfter);
    }
    const version = await prisma.$queryRawUnsafe('SELECT PostGIS_Version()');
    console.log('PostGIS Version:', version);
  } catch (err) {
    console.error('PostGIS error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkPostgis();
