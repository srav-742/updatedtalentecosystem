/**
 * @fileoverview Timeout Middleware
 * @module gateway/middlewares/timeout.middleware
 *
 * Applies a gateway-level timeout to all incoming requests.
 * If the request takes longer than the configured timeout,
 * a 504 Gateway Timeout response is returned.
 */

import ApiError from '../../core/errors/ApiError.js';
import environment from '../../core/config/environment.js';
import logger from '../../core/logger/logger.js';
import EVENTS from '../../core/constants/events.js';
import { pluginManager } from '../plugins/PluginManager.js';
import contextStore from '../../core/context/contextStore.js';

/**
 * Creates a timeout middleware with configurable duration.
 *
 * @param {number} [timeoutMs] - Timeout in milliseconds. Defaults to GATEWAY_TIMEOUT_MS.
 * @returns {Function} Express middleware.
 */
const createTimeoutMiddleware = (timeoutMs) => {
  const timeout = timeoutMs || environment.timeouts.gateway;

  return (req, res, next) => {
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;

      const ctx = contextStore.getContext();

      logger.error(`Gateway timeout after ${timeout}ms: ${req.method} ${req.originalUrl}`, {
        source: 'timeout.middleware',
        timeoutMs: timeout,
      });

      // Emit timeout event
      pluginManager.emit(EVENTS.PROXY_TIMEOUT, {
        serviceKey: ctx?.targetService,
        timeoutMs: timeout,
        method: req.method,
        path: req.originalUrl,
      });

      if (!res.headersSent) {
        const error = ApiError.gatewayTimeout();
        res.status(error.statusCode).json({
          ...error.toJSON(),
          correlationId: ctx?.correlationId || null,
          timestamp: new Date().toISOString(),
        });
      }
    }, timeout);

    // Clear the timer when the response finishes
    res.on('finish', () => {
      clearTimeout(timer);
    });

    res.on('close', () => {
      clearTimeout(timer);
    });

    // Patch next to prevent execution after timeout
    const originalNext = next;
    next = (err) => {
      if (!timedOut) {
        originalNext(err);
      }
    };

    next();
  };
};

export default createTimeoutMiddleware;
