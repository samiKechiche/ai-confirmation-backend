const app = require('./app');
const prisma = require('./config/prisma');

/**
 * Server Entry Point
 *
 * Starts the Express server on the configured port.
 * The app logic is separated into app.js for testability.
 */

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`+--------------------------------------------------------------+`);
  console.log(`|       AI Confirmation Backend -- Server Running              |`);
  console.log(`+--------------------------------------------------------------+`);
  console.log(`|  Port:        ${PORT.toString().padEnd(53)} |`);
  console.log(`|  Environment: ${(process.env.NODE_ENV || 'development').padEnd(53)} |`);
  console.log(`|  API Base:    ${`http://localhost:${PORT}/api/v1`.padEnd(53)} |`);
  console.log(`|  API Docs:    ${`http://localhost:${PORT}/api-docs`.padEnd(53)} |`);
  console.log(`|  Health:      ${`http://localhost:${PORT}/health`.padEnd(53)} |`);
  console.log(`+--------------------------------------------------------------+`);
});

// Graceful shutdown: close server and disconnect Prisma
function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    prisma.$disconnect()
      .then(() => {
        console.log('Prisma disconnected.');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Error disconnecting Prisma:', err);
        process.exit(1);
      });
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle port-in-use and other server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

module.exports = server;
