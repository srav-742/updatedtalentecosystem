/**
 * @fileoverview Rate Limiter Middleware
 * @module gateway/middlewares/rateLimiter.middleware
 *
 * Wraps express-rate-limit with the gateway's security configuration.
 * Also provides a factory for creating route-specific rate limiters.
 */

import rateLimit from 'express-rate-limit';
import securityConfig from '../../core/config/security.js';
import EVENTS from '../../core/constants/events.js';
import { pluginManager } from '../plugins/PluginManager.js';
import logger from '../../core/logger/logger.js';
import contextStore from '../../core/context/contextStore.js';

/**
 * Global rate limiter middleware.
 * Uses the configuration from security.js.
 *
 * @type {Function} Express middleware
 */
const globalRateLimiter = rateLimit({
  ...securityConfig.rateLimiter,
  handler: (req, res, _next, options) => {
    const ctx = contextStore.getContext();

    logger.warn(`Rate limit exceeded: ${req.ip} — ${req.method} ${req.originalUrl}`, {
      source: 'rateLimiter.middleware',
      clientIp: req.ip,
    });

    // Emit rate limit event
    pluginManager.emit(EVENTS.RATE_LIMIT_EXCEEDED, {
      clientIp: req.ip,
      method: req.method,
      path: req.originalUrl,
    });

    res.status(options.statusCode).json({
      ...options.message,
      correlationId: ctx?.correlationId || null,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Creates a route-specific rate limiter.
 *
 * @param {Object} options - Rate limit options.
 * @param {number} options.max - Max requests per window.
 * @param {number} options.windowMs - Window duration in ms.
 * @param {string} [options.message] - Custom rate limit message.
 * @returns {Function} Express middleware.
 */
export const createRouteLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 60000,
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      status: 429,
      message: options.message || 'Too many requests for this endpoint. Please slow down.',
      errorCode: 'RATE_001',
    },
  });
};

export default globalRateLimiter;
