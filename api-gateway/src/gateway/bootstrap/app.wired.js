/**
 * @fileoverview Fully-Wired Express Application
 * @module gateway/bootstrap/app.wired
 *
 * Constructs the Express application with the COMPLETE 19-step middleware
 * pipeline from the enterprise architecture plan. This file does NOT modify
 * the original `app.js` scaffold — it is a standalone replacement.
 *
 * Pipeline Order:
 *  1.  Helmet             — Security headers
 *  2.  Compression        — Gzip response compression
 *  3.  CORS               — Cross-Origin Resource Sharing
 *  4.  Request ID         — UUID + W3C traceparent generation
 *  5.  Correlation & Ctx  — Correlation ID + AsyncLocalStorage context setup
 *  6.  Request Logger     — Morgan access logging → Winston
 *  7.  Request Validator  — Content-Type / path validation
 *  8.  Global Rate Limit  — DOS / abuse protection
 *  9.  Strip Headers      — Anti-spoofing: remove client-sent X-H1P-* headers
 *  10. Metrics            — Observability hooks
 *  11. Body Parser        — JSON / URL-encoded parsing (default limits)
 *  12. Dynamic Routes     — Route Registry (auth, policy, inject, freeze, timeout, proxy)
 *  13. Health Endpoints   — /health, /ready, /live
 *  14. 404 Handler        — Catch unmatched routes
 *  15. Error Handler      — Global error formatter
 */

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';

// ─── Core Configuration ─────────────────────────────────────
import securityConfig from '../../core/config/security.js';
import environment from '../../core/config/environment.js';

// ─── Core Middleware ─────────────────────────────────────────
import requestIdMiddleware from '../middlewares/requestId.middleware.js';
import correlationMiddleware from '../middlewares/correlation.middleware.js';
import requestLogger from '../../core/logger/request.logger.js';
import requestValidatorMiddleware from '../middlewares/requestValidator.middleware.js';
import globalRateLimiter from '../middlewares/rateLimiter.middleware.js';
import stripHeadersMiddleware from '../middlewares/stripHeaders.middleware.js';
import metricsMiddleware from '../metrics/metrics.middleware.js';

// ─── Route System ────────────────────────────────────────────
import dynamicRoutes from '../routes/index.js';
import healthController from '../health/health.controller.js';

// ─── Error Handling ──────────────────────────────────────────
import errorHandler, { notFoundHandler } from '../../core/errors/errorHandler.js';

// ─── Logger ──────────────────────────────────────────────────
import logger from '../../core/logger/logger.js';

/** Create the Express application instance */
const app = express();

logger.info('Assembling wired Express application pipeline...');

// ═══════════════════════════════════════════════════════════════
// 1. Helmet — Security Headers
// ═══════════════════════════════════════════════════════════════
app.use(helmet(securityConfig.helmet));
app.disable('x-powered-by');

// ═══════════════════════════════════════════════════════════════
// 2. Compression — Gzip
// ═══════════════════════════════════════════════════════════════
app.use(compression());

// ═══════════════════════════════════════════════════════════════
// 3. CORS — Cross-Origin Resource Sharing
// ═══════════════════════════════════════════════════════════════
app.use(cors(securityConfig.cors));

// ═══════════════════════════════════════════════════════════════
// 4. Request ID — UUID + W3C traceparent
// ═══════════════════════════════════════════════════════════════
app.use(requestIdMiddleware);

// ═══════════════════════════════════════════════════════════════
// 5. Correlation ID & Request Context (AsyncLocalStorage)
// ═══════════════════════════════════════════════════════════════
app.use(correlationMiddleware);

// ═══════════════════════════════════════════════════════════════
// 6. Request Logger — Morgan → Winston
// ═══════════════════════════════════════════════════════════════
app.use(requestLogger);

// ═══════════════════════════════════════════════════════════════
// 7. Request Validator — Content-Type / path validation
// ═══════════════════════════════════════════════════════════════
app.use(requestValidatorMiddleware);

// ═══════════════════════════════════════════════════════════════
// 8. Global Rate Limiter — DOS / abuse protection
// ═══════════════════════════════════════════════════════════════
app.use(globalRateLimiter);

// ═══════════════════════════════════════════════════════════════
// 9. Strip Headers — Anti-spoofing (remove client-sent X-H1P-*)
// ═══════════════════════════════════════════════════════════════
app.use(stripHeadersMiddleware);

// ═══════════════════════════════════════════════════════════════
// 10. Metrics Middleware — Observability hooks
// ═══════════════════════════════════════════════════════════════
app.use(metricsMiddleware);

// ═══════════════════════════════════════════════════════════════
// 11. Body Parser — JSON / URL-encoded (default limits)
// ═══════════════════════════════════════════════════════════════
app.use(express.json({ limit: securityConfig.bodyParser.jsonLimit }));
app.use(
  express.urlencoded({
    extended: true,
    limit: securityConfig.bodyParser.urlencodedLimit,
  })
);

// ═══════════════════════════════════════════════════════════════
// 12. Dynamic Routes — Route Registry
// Each route dynamically applies: body limits, rate limits,
// auth middleware, policy middleware, freeze context,
// inject headers, timeout, circuit breaker, and proxy.
// ═══════════════════════════════════════════════════════════════
app.use(dynamicRoutes);

// ═══════════════════════════════════════════════════════════════
// 13. Health Endpoints — /health, /ready, /live
// ═══════════════════════════════════════════════════════════════
app.use(healthController);

// ═══════════════════════════════════════════════════════════════
// 14. 404 Catch-All Handler
// ═══════════════════════════════════════════════════════════════
app.use(notFoundHandler);

// ═══════════════════════════════════════════════════════════════
// 15. Global Error Handler
// ═══════════════════════════════════════════════════════════════
app.use(errorHandler);

logger.info('Wired Express application pipeline assembled successfully.');

export default app;
