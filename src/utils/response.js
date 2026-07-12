/**
 * Standardized response formatters.
 * Every API response uses one of these two functions.
 */

/**
 * Send a success response.
 * @param {Object} res - Express response object
 * @param {Object|Array} data - Response payload
 * @param {number} statusCode - HTTP status code (default 200)
 */
function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * Send an error response.
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {Array} details - Optional validation error details
 */
function sendError(res, message, statusCode = 500, details = null) {
  const response = {
    success: false,
    error: {
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  sendSuccess,
  sendError,
};