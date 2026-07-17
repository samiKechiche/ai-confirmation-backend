const { AppError } = require('../utils/errors');
const { sendError } = require('../utils/response');

/**
 * Global Error Handler — the FINAL middleware in the Express pipeline.
 * 
 * All errors from controllers and services flow here.
 * This middleware:
 * - Catches all unhandled errors
 * - Returns standardized error responses
 * - Hides internal details from the client
 * - Logs unexpected errors for debugging
 * 
 * Placed AFTER all routes in app.js.
 */
function globalErrorHandler(err, req, res, next) {
  // Log unexpected errors for debugging
  if (!err.isOperational) {
    console.error('[UNEXPECTED ERROR]', err);
  } else {
    console.error('[OPERATIONAL ERROR]', err.message, err.statusCode);
  }

  // Handle our custom AppError types
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.details || null);
  }

  // Handle Joi validation errors that might slip through (shouldn't happen with middleware)
  if (err.isJoi) {
    const details = err.details.map((d) => d.message);
    return sendError(res, 'Validation failed', 422, details);
  }

  // Handle malformed JSON body (thrown by express.json())
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 'Malformed JSON in request body', 400);
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    // Unique constraint violation
    return sendError(res, 'A record with this value already exists', 409);
  }

  if (err.code === 'P2025') {
    // Record not found
    return sendError(res, 'Record not found', 404);
  }

  if (err.code === 'P2023') {
    // Invalid value format (e.g. malformed UUID in a path parameter)
    return sendError(res, 'Invalid ID format (expected a UUID)', 400);
  }

  if (err.code?.startsWith('P')) {
    // Other Prisma errors
    return sendError(res, 'Database error', 500);
  }

  // Handle all other unexpected errors
  // NEVER expose internal error details to the client
  const message = process.env.NODE_ENV === 'development'
    ? err.message
    : 'An unexpected error occurred';

  return sendError(res, message, 500);
}

/**
 * Handle 404 errors for routes that don't exist.
 */
function notFoundHandler(req, res) {
  sendError(res, `Route ${req.method} ${req.path} not found`, 404);
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
};