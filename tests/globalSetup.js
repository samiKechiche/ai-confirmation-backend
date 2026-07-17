const { execSync } = require('child_process');

/**
 * Jest global setup -- runs ONCE before the test suites.
 * Applies all Prisma migrations to the TEST database.
 * Loads .env.test so Prisma uses the test DATABASE_URL.
 */
module.exports = async () => {
  require('dotenv').config({ path: '.env.test' });
  console.log('\n[TEST SETUP] Applying migrations to the test database...');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
};