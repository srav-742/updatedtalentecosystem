/**
 * @fileoverview Custom Request Logger Middleware
 * @module middlewares/requestLogger
 *
 * Intercepts requests and responses to log HTTP status codes,
 * response times, and method details via the Winston logger.
 */

import logger from '../logger/logger.js';

/**
 * Express middleware to log incoming HTTP requests and response times.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    const logMsg = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

    const meta = {
      method,
      path: originalUrl,
      statusCode,
      durationMs: duration,
      clientIp: ip,
    };

    if (statusCode >= 500) {
      logger.error(logMsg, meta);
    } else if (statusCode >= 400) {
      logger.warn(logMsg, meta);
    } else {
      logger.info(logMsg, meta);
    }
  });

  next();
};

export default requestLogger;
