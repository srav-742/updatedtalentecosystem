/**
 * @fileoverview Express Application Assembly
 * @module app
 *
 * Constructs the Express application and wires up the middleware pipeline
 * in the strict enterprise order:
 *
 *  1. Helmet           — Security headers
 *  2. Compression      — Response compression
 *  3. CORS             — Cross-Origin Resource Sharing
 *  4. Request ID       — W3C Tracing / ID generation
 *  5. Correlation ID   — Tracing token generation
 *  6. Request Logger   — Morgan logger with request context
 *  7. Request Validator— Content-type and traverse validation
 *  8. Rate Limiter     — Global DOS protection
 *  9. Routes / Proxy   — Dynamic router mounting (Auth, Policy, Timeout, Proxy)
 *  10. Error Handler   — Global standardized JSON error formatter
 */

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';

// Core imports
import securityConfig from './core/config/security.js';
import environment from './core/config/environment.js';

// Middlewares
import requestIdMiddleware from './gateway/middlewares/requestId.middleware.js';
import correlationMiddleware from './gateway/middlewares/correlation.middleware.js';
import requestLogger from './core/logger/request.logger.js';
import requestValidator from './gateway/middlewares/requestValidator.middleware.js';
import globalRateLimiter from './gateway/middlewares/rateLimiter.middleware.js';
import healthController from './gateway/health/health.controller.js';
import routes from './gateway/routes/index.js';
import errorHandler from './core/errors/errorHandler.js';

/** Create the Express application instance */
const app = express();

// ─── 1. Helmet — Security Headers ──────────────────────────────────
app.use(helmet(securityConfig.helmet));
app.disable('x-powered-by');

// ─── 2. Compression — Gzip ─────────────────────────────────────────
app.use(compression());

// ─── 3. CORS — Cross-Origin Resource Sharing ───────────────────────
app.use(cors(securityConfig.cors));

// ─── 4. Request ID Middleware ──────────────────────────────────────
app.use(requestIdMiddleware);

// ─── 5. Correlation ID & Request Context Middleware ────────────────
app.use(correlationMiddleware);

// ─── 6. Request Logger ─────────────────────────────────────────────
app.use(requestLogger);

// ─── 7. Request Validator Middleware ────────────────────────────────
app.use(requestValidator);

// ─── 8. Global Rate Limiter ────────────────────────────────────────
app.use(globalRateLimiter);

// ─── Health Checks ─────────────────────────────────────────────────
app.use(healthController);

// ─── 9. Routes / Dynamic Proxy Handler ─────────────────────────────
app.use(routes);

// ─── 10. Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

/**
 * Fallback 404 handler for unmatched routes.
 * Ensures a consistent JSON response structure.
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_001',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    requestId: req.requestId || null,
    correlationId: req.correlationId || null,
    timestamp: new Date().toISOString(),
  });
});

export default app;

// Trigger nodemon reload
