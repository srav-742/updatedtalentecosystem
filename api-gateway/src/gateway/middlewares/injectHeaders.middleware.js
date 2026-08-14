/**
 * @fileoverview Trusted Header Injection Middleware
 * @module gateway/middlewares/injectHeaders.middleware
 *
 * After authentication and policy evaluation, this middleware injects
 * verified identity headers into the request so that the proxy factory
 * forwards them to downstream microservices.
 *
 * Injected headers (from the verified RequestContext):
 *  - X-H1P-User-Id        : The verified user ID
 *  - X-H1P-Role           : The user's role
 *  - X-H1P-Permissions    : Comma-separated permissions
 *  - X-H1P-Session        : JSON session metadata
 *  - X-H1P-Auth-Version   : Auth header schema version (fixed "1")
 *  - X-H1P-Service-Token  : Service-to-service trust token
 *  - X-Correlation-ID     : Correlation ID for tracing
 *  - X-Request-ID         : Request ID for tracing
 *  - traceparent          : W3C distributed tracing context
 *  - tracestate           : W3C tracing state
 *
 * This middleware modifies `req.headers` in-place so the proxy factory's
 * `onProxyReq` hook reads them when building the forwarded request.
 */

import contextStore from '../../core/context/contextStore.js';
import HEADERS from '../../core/constants/headers.js';
import environment from '../../core/config/environment.js';
import logger from '../../core/logger/logger.js';

/**
 * Inject Headers middleware.
 * Enriches the request with verified identity headers from the RequestContext.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
const injectHeadersMiddleware = (req, _res, next) => {
  const ctx = contextStore.getContext();

  if (!ctx) {
    return next();
  }

  // ─── Verified Identity Headers ───────────────────────
  if (ctx.userId) {
    req.headers['x-h1p-user-id'] = String(ctx.userId);
  }

  if (ctx.role) {
    req.headers['x-h1p-role'] = String(ctx.role);
  }

  if (ctx.permissions && ctx.permissions.length > 0) {
    req.headers['x-h1p-permissions'] = ctx.permissions.join(',');
  }

  if (ctx.session) {
    try {
      req.headers['x-h1p-session'] = JSON.stringify(ctx.session);
    } catch {
      // Silently skip if session is not serializable
    }
  }

  // Auth version — always "1"
  req.headers['x-h1p-auth-version'] = '1';

  // ─── Service-to-Service Trust Token ─────────────────
  req.headers['x-h1p-service-token'] =
    environment.security?.serviceToken || 'trusted-gateway-token';

  // ─── Tracing Headers ────────────────────────────────
  if (ctx.requestId) {
    req.headers[HEADERS.REQUEST_ID.toLowerCase()] = ctx.requestId;
  }

  if (ctx.correlationId) {
    req.headers[HEADERS.CORRELATION_ID.toLowerCase()] = ctx.correlationId;
  }

  logger.debug('Injected trusted X-H1P-* headers into request', {
    source: 'injectHeaders.middleware',
    userId: ctx.userId,
    role: ctx.role,
  });

  next();
};

export default injectHeadersMiddleware;
