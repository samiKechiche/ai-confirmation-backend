require('dotenv').config();

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const routes = require('./routes');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

/**
 * Express Application Setup
 * 
 * Order of middleware matters:
 * 1. Body parsing
 * 2. API routes
 * 3. Swagger documentation
 * 4. 404 handler (for unknown routes)
 * 5. Global error handler (catches all errors)
 */

const app = express();

// Parse JSON request bodies
app.use(express.json({limit: '1mb'}));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging (simple console output)
app.use((req, res, next) => {
console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================================
// API ROUTES
// ============================================================

// All routes mounted under /api/v1
app.use('/api/v1', routes);

// ============================================================
// SWAGGER DOCUMENTATION
// ============================================================

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }', // Hide the Swagger top bar
  customSiteTitle: 'AI Confirmation API Docs',
}));



// ============================================================
// ERROR HANDLING (MUST BE LAST)
// ============================================================

// Handle requests to unknown routes
app.use(notFoundHandler);

// Global error handler — catches everything
app.use(globalErrorHandler);

module.exports = app;