/**
 * @fileoverview Security Configuration
 * @module core/config/security
 *
 * Centralizes security-related configuration for Helmet, CORS,
 * body parser limits, and rate limiting. All security middleware
 * reads from this single source of truth.
 */

import environment from './environment.js';

/**
 * Helmet configuration options.
 * Removes server fingerprinting and applies strict security headers.
 *
 * @type {Object}
 */
const helmetConfig = Object.freeze({
  /** Remove the X-Powered-By header */
  hidePoweredBy: true,

  /** Prevent clickjacking via X-Frame-Options */
  frameguard: { action: 'deny' },

  /** Strict transport security (HSTS) — enabled in production */
  hsts: environment.isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,

  /** Prevent MIME type sniffing */
  noSniff: true,

  /** XSS filter header */
  xssFilter: true,

  /** Content Security Policy — basic restrictive defaults */
  contentSecurityPolicy: environment.isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      }
    : false,
});

/**
 * CORS configuration options.
 * Supports profile-based origins (development vs production).
 *
 * @type {Object}
 */
const corsConfig = Object.freeze({
  /** Allowed origin(s) — single string or array */
  origin: environment.cors.origin,

  /** Allowed HTTP methods */
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  /** Headers the client is allowed to send */
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Correlation-ID',
    'X-Request-ID',
    'Accept',
    'Origin',
  ],

  /** Headers exposed to the client in the response */
  exposedHeaders: ['X-Correlation-ID', 'X-Request-ID'],

  /** Allow credentials (cookies, authorization headers) */
  credentials: true,

  /** Cache preflight responses for 24 hours */
  maxAge: 86400,
});

/**
 * Body parser size limits.
 * Prevents oversized payloads from consuming gateway resources.
 *
 * @type {Object}
 */
const bodyParserConfig = Object.freeze({
  /** Maximum JSON payload size */
  jsonLimit: '10mb',

  /** Maximum URL-encoded payload size */
  urlencodedLimit: '10mb',
});

/**
 * Rate limiter configuration.
 * Limits the number of requests per IP within a sliding time window.
 *
 * @type {Object}
 */
const rateLimiterConfig = Object.freeze({
  /** Time window in milliseconds */
  windowMs: environment.rateLimit.windowMs,

  /** Maximum number of requests per window per IP */
  max: environment.rateLimit.max,

  /** Use standard rate-limit headers (RateLimit-*) */
  standardHeaders: true,

  /** Disable legacy X-RateLimit-* headers */
  legacyHeaders: false,

  /** Custom message returned when rate limit is exceeded */
  message: {
    success: false,
    status: 429,
    message: 'Too many requests. Please try again later.',
    errorCode: 'RATE_001',
  },
});

/**
 * Aggregated security configuration export.
 * @type {Object}
 */
const securityConfig = Object.freeze({
  helmet: helmetConfig,
  cors: corsConfig,
  bodyParser: bodyParserConfig,
  rateLimiter: rateLimiterConfig,
});

export default securityConfig;
