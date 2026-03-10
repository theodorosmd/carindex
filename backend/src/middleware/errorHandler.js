import { logger } from '../utils/logger.js';

/**
 * Enhanced error handler middleware
 * Provides clear, user-friendly error messages
 */
export function errorHandler(err, req, res, next) {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    details: err.details,
    hint: err.hint,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });

  // Default error
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Une erreur est survenue';
  let code = err.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Données invalides: ' + err.message;
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentification requise';
    code = 'UNAUTHORIZED';
  } else if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Cette ressource existe déjà';
    code = 'DUPLICATE_ENTRY';
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Référence invalide';
    code = 'FOREIGN_KEY_ERROR';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service temporairement indisponible';
    code = 'SERVICE_UNAVAILABLE';
  } else if (err.code === 'ETIMEDOUT') {
    statusCode = 504;
    message = 'Délai d\'attente dépassé';
    code = 'TIMEOUT';
  } else if (err.code === '57014') {
    // PostgreSQL: canceling statement due to statement timeout
    statusCode = 504;
    message = 'The search is taking too long. Try using fewer or different filters.';
    code = 'QUERY_TIMEOUT';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Une erreur interne est survenue. Veuillez réessayer plus tard.';
  }

  // Log full error to console for debugging (always)
  console.error('[500]', req.method, req.url, err.message);

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && !err.details && {
        details: err.message,
        stack: err.stack
      })
    }
  });
}
