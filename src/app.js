require('dotenv').config();

const express = require('express');
const { randomUUID } = require('crypto');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const routes = require('./routes');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

/**
 * Express Application Setup
 *
 * Order of middleware matters:
 * 1. CORS
 * 2. Body parsing
 * 3. API routes
 * 4. Swagger documentation
 * 5. Health check
 * 6. 404 handler (for unknown routes)
 * 7. Global error handler (catches all errors)
 */

const app = express();

// Enable CORS for all origins (frontend and teammate modules)
app.use(cors());

// Parse JSON request bodies
app.use(express.json({ limit: '1mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging with request_id, status code and duration (Kanban #1709)
app.use((req, res, next) => {
  req.requestId = randomUUID();
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      `[${new Date().toISOString()}] [${req.requestId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`
    );
  });
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
// HEALTH CHECK
// ============================================================

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns 200 when the server is running. Used for monitoring.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================================
// ERROR HANDLING (MUST BE LAST)
// ============================================================

// Handle requests to unknown routes
app.use(notFoundHandler);

// Global error handler -- catches everything
app.use(globalErrorHandler);

module.exports = app;
