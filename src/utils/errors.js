/**
 * Custom error classes for the application.
 * Each error type maps to a specific HTTP status code.
 */

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes expected errors from programming bugs

    Error.captureStackTrace(this, this.constructor);
  }
}


class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  BadRequestError,
};