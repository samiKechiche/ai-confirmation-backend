const app = require('./app');

/**
 * Server Entry Point
 * 
 * Starts the Express server on the configured port.
 * The app logic is separated into app.js for testability.
 */

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`╔════════════════════════════════════════════════════════════╗`);
  console.log(`║       AI Confirmation Backend — Server Running             ║`);
  console.log(`╠════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port:        ${PORT.toString().padEnd(47)} ║`);
  console.log(`║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(47)} ║`);
  console.log(`║  API Base:    ${`http://localhost:${PORT}/api/v1`.padEnd(47)} ║`);
  console.log(`║  API Docs:    ${`http://localhost:${PORT}/api-docs`.padEnd(47)} ║`);
  console.log(`║  Health:      ${`http://localhost:${PORT}/health`.padEnd(47)} ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝`);
});