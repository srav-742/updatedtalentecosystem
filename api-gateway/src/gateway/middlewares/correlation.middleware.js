/**
 * @fileoverview Correlation ID & Request Context Middleware
 * @module gateway/middlewares/correlation.middleware
 *
 * Resolves the correlation ID, parses W3C tracing, extracts locale,
 * and initializes the RequestContext in AsyncLocalStorage.
 */

import { v4 as uuidv4 } from 'uuid';
import HEADERS from '../../core/constants/headers.js';
import contextStore from '../../core/context/contextStore.js';
import { createRequestContext } from '../../core/context/RequestContext.js';
import { findRoute } from '../routes/routeRegistry.js';
import EVENTS from '../../core/constants/events.js';
import { pluginManager } from '../plugins/PluginManager.js';

/**
 * Correlation ID and Request Context middleware.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const correlationMiddleware = (req, res, next) => {
  const existingCid = req.headers[HEADERS.CORRELATION_ID.toLowerCase()];
  const correlationId = existingCid || `CID-${uuidv4()}`;

  // Set on headers
  req.headers[HEADERS.CORRELATION_ID.toLowerCase()] = correlationId;
  res.setHeader(HEADERS.CORRELATION_ID, correlationId);
  req.correlationId = correlationId;

  // Resolve client IP address
  const clientIp =
    req.headers[HEADERS.FORWARDED_FOR.toLowerCase()]?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  // Extract client locale from Accept-Language
  const acceptLang = req.headers['accept-language'];
  const locale = acceptLang ? acceptLang.split(',')[0].split(';')[0].trim() : 'en';

  // Find matching route definition
  const routeDef = findRoute(req.originalUrl || req.path, req.method);

  // Build the request context
  const context = createRequestContext({
    requestId: req.requestId,
    correlationId,
    traceId: req.traceId,
    spanId: req.spanId,
    method: req.method,
    path: req.originalUrl || req.path,
    ip: clientIp,
    userAgent: req.headers['user-agent'] || 'unknown',
    locale,
    targetService: routeDef?.serviceKey || null,
    routePattern: routeDef?.path || null,
  });

  // Run the request execution context
  contextStore.run(context, () => {
    // Emit event bus start
    pluginManager.emit(EVENTS.REQUEST_RECEIVED, {
      requestId: context.requestId,
      correlationId: context.correlationId,
      traceId: context.traceId,
      method: context.method,
      path: context.path,
      clientIp: context.ip,
    });

    next();
  });
};

export default correlationMiddleware;
