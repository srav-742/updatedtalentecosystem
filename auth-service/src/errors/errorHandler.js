/**
 * @fileoverview Global Error Handler Middleware
 * @module errors/errorHandler
 *
 * Express error-handling middleware (4-arg signature). Catches all errors
 * thrown or passed via next(err) and formats them into consistent JSON
 * responses. Distinguishes operational ApiErrors from unexpected bugs.
 */

import ApiError from './ApiError.js';
import logger from '../logger/logger.js';
import STATUS_CODES from '../constants/statusCodes.js';
import ERROR_CODES from '../constants/errors.js';
import MESSAGES from '../constants/messages.js';

/**
 * Global error handler middleware.
 *
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} _next - Express next.
 */
const errorHandler = (err, req, res, _next) => {
  // Determine if this is an operational (expected) error
  const isOperational = err instanceof ApiError && err.isOperational;

  // Default to 500 for unexpected errors
  const statusCode = err.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
  const errorCode = err.errorCode || ERROR_CODES.INTERNAL_001;
  const message = isOperational ? err.message : MESSAGES.INTERNAL_ERROR;

  // Log the error
  logger.error(err.message || message, {
    errorName: err.name || 'Error',
    errorCode,
    statusCode,
    isOperational,
    path: req.originalUrl,
    method: req.method,
    stack: err.stack,
  });

  // Build the response body in the standardized enterprise format
  const responseBody = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
    timestamp: new Date().toISOString(),
  };

  // In development, include the stack trace for debugging
  if (process.env.NODE_ENV === 'development' && err.stack) {
    responseBody.stack = err.stack.split('\n').map((line) => line.trim());
  }

  // Ensure headers haven't already been sent
  if (res.headersSent) {
    return;
  }

  res.status(statusCode).json(responseBody);
};

/**
 * 404 catch-all middleware. Mount AFTER all route handlers.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
export const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

export { errorHandler };
export default errorHandler;
