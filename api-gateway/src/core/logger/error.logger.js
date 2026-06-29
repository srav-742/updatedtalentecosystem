/**
 * @fileoverview Error Logger
 * @module core/logger/error.logger
 *
 * Specialized error logging helper that structures error data for
 * consistent log entries. Extracts stack traces, error codes, and
 * request context for searchable, actionable error logs.
 */

import logger from './logger.js';

/**
 * Logs an error with structured metadata.
 *
 * @param {Error} error - The error object.
 * @param {Object} [meta={}] - Additional metadata to include.
 * @param {string} [meta.source] - Source module/middleware that caught the error.
 * @param {string} [meta.action] - The action that was being performed.
 * @param {number} [meta.statusCode] - HTTP status code associated with the error.
 */
export const logError = (error, meta = {}) => {
  const errorData = {
    errorName: error.name || 'Error',
    errorCode: error.errorCode || error.code || 'UNKNOWN',
    statusCode: meta.statusCode || error.statusCode || 500,
    source: meta.source || 'unknown',
    action: meta.action || 'unknown',
    stack: error.stack,
    ...meta,
  };

  // Remove duplicate keys already in errorData
  delete errorData.error;

  logger.error(error.message, errorData);
};

/**
 * Logs an unhandled rejection with full context.
 *
 * @param {Error} error - The rejected promise error.
 */
export const logUnhandledRejection = (error) => {
  logError(error, {
    source: 'process',
    action: 'unhandledRejection',
    critical: true,
  });
};

/**
 * Logs an uncaught exception with full context.
 *
 * @param {Error} error - The uncaught error.
 */
export const logUncaughtException = (error) => {
  logError(error, {
    source: 'process',
    action: 'uncaughtException',
    critical: true,
    fatal: true,
  });
};

export default { logError, logUnhandledRejection, logUncaughtException };
