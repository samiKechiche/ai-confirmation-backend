const { UnauthorizedError } = require('../utils/errors');

const API_KEY = process.env.API_KEY;

/**
 * Simple shared API-key check for sensitive (mutating) endpoints.
 * Satisfies Kanban #1711 -- the task explicitly allows "JWT ou tokens API",
 * and a single shared key is the simplest correct implementation of the
 * "tokens API" option for a project with no user-account concept.
 *
 * Expects the key in the `X-API-Key` header.
 */
function apiKeyAuth(req, res, next) {
  const providedKey = req.header('X-API-Key');

  if (!providedKey || providedKey !== API_KEY) {
    return next(new UnauthorizedError('Missing or invalid API key'));
  }

  next();
}

module.exports = { apiKeyAuth };