/**
 * @fileoverview Request Access Logger
 * @module core/logger/request.logger
 *
 * Morgan-based HTTP access logger integrated with Winston.
 * Logs every incoming request with method, URL, status code,
 * response time, and tracing IDs.
 */

import morgan from 'morgan';
import logger from './logger.js';
import HEADERS from '../constants/headers.js';

/**
 * Custom Morgan token — request ID.
 */
morgan.token('request-id', (req) => req.headers[HEADERS.REQUEST_ID.toLowerCase()] || '-');

/**
 * Custom Morgan token — correlation ID.
 */
morgan.token('correlation-id', (req) => req.headers[HEADERS.CORRELATION_ID.toLowerCase()] || '-');

/**
 * Custom Morgan token — client IP (handles proxied requests).
 */
morgan.token('client-ip', (req) => {
  return (
    req.headers[HEADERS.FORWARDED_FOR.toLowerCase()]?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '-'
  );
});

/**
 * Morgan stream adapter — pipes Morgan output into Winston.
 */
const stream = {
  write: (message) => {
    // Remove trailing newline that Morgan appends
    logger.info(message.trim(), { logType: 'access' });
  },
};

/**
 * Custom Morgan format string.
 * Includes request/correlation IDs for distributed tracing.
 */
const FORMAT =
  ':client-ip :method :url :status :response-time[0]ms :res[content-length]b req=:request-id cid=:correlation-id';

/**
 * Pre-configured Morgan middleware instance.
 *
 * @type {Function} Express middleware
 */
const requestLogger = morgan(FORMAT, { stream });

export default requestLogger;
