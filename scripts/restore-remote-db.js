/**
 * Turnkey script to initialize and restore all SICP data into a new Railway PostgreSQL database.
 * 
 * Usage:
 *   node scripts/restore-remote-db.js "postgresql://postgres:password@host:port/railway"
 */
const { execSync } = require('child_process');
const path = require('path');

const targetUrl = process.argv[2] || process.env.DATABASE_URL;

if (!targetUrl || targetUrl.includes('localhost')) {
  console.error('\n❌ ERROR: Please provide the public DATABASE_URL of your new Railway PostgreSQL database.');
  console.error('Usage: node scripts/restore-remote-db.js "<DATABASE_URL>"\n');
  process.exit(1);
}

console.log('================================================================');
console.log('🚀 SICP DATABASE MIGRATION TO NEW RAILWAY ACCOUNT');
console.log('================================================================');

try {
  console.log('\n[Step 1/2] Verifying schema and running Prisma db push...');
  execSync('npm run db:push', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: targetUrl },
    cwd: path.resolve(__dirname, '..'),
  });

  console.log('\n[Step 2/2] Restoring all 18 organizations, users, and solution memory...');
  execSync('node backend/dist/database/restore_universe_backup.js', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: targetUrl },
    cwd: path.resolve(__dirname, '..'),
  });

  console.log('\n================================================================');
  console.log('✅ DATABASE RESTORATION COMPLETE!');
  console.log('All 18 institutional organizations, users, and solution memories');
  console.log('have been successfully restored into your new Railway database.');
  console.log('================================================================\n');
} catch (error) {
  console.error('\n❌ Restoration failed:', error.message);
  process.exit(1);
}
