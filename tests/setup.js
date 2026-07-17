// Jest setup file -- runs before EACH test FILE.
// Loads the test environment BEFORE the app (and Prisma) are imported.
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test', override: true });