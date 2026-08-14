/**
 * @fileoverview Dynamic Proxy Factory
 * @module gateway/proxy/proxyFactory
 *
 * Creates configured http-proxy-middleware instances with circuit breaker
 * wrapping (via opossum), lifecycle hooks, and automatic W3C tracing & X-H1P-*
 * header injection. Cleans client-spoofed headers and supports request cancellation.
 */

import { createProxyMiddleware as hpmCreateProxy, fixRequestBody } from 'http-proxy-middleware';
import CircuitBreaker from 'opossum';
import { serviceRegistry } from '../../core/config/serviceRegistry.js';
import { proxyDefaults, circuitBreakerConfig } from '../config/proxy.config.js';
import logger from '../../core/logger/logger.js';
import { logError } from '../../core/logger/error.logger.js';
import contextStore from '../../core/context/contextStore.js';
import HEADERS from '../../core/constants/headers.js';
import ApiError from '../../core/errors/ApiError.js';
import EVENTS from '../../core/constants/events.js';
import { createGatewayResponse } from '../types/GatewayResponse.js';
import { pluginManager } from '../plugins/PluginManager.js';
import environment from '../../core/config/environment.js';

/**
 * Map of isolated circuit breakers per downstream service key.
 * @type {Map<string, CircuitBreaker>}
 */
const circuitBreakers = new Map();

/**
 * Resolves or instantiates a dedicated circuit breaker for a given service key.
 *
 * @param {string} serviceKey - The target service key.
 * @returns {CircuitBreaker} The configured circuit breaker.
 */
const getOrCreateCircuitBreaker = (serviceKey) => {
  if (circuitBreakers.has(serviceKey)) {
    return circuitBreakers.get(serviceKey);
  }

  const breaker = new CircuitBreaker(
    async (action) => action(),
    {
      ...circuitBreakerConfig,
      name: `cb-${serviceKey}`,
    }
  );

  breaker.on('open', () => {
    logger.warn(`Circuit breaker OPEN for ${serviceKey}`, {
      event: EVENTS.CIRCUIT_OPEN,
      serviceKey,
    });
    pluginManager.emit(EVENTS.CIRCUIT_OPEN, { serviceKey });
  });

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker HALF-OPEN for ${serviceKey}`, {
      event: EVENTS.CIRCUIT_HALF_OPEN,
      serviceKey,
    });
    pluginManager.emit(EVENTS.CIRCUIT_HALF_OPEN, { serviceKey });
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED for ${serviceKey}`, {
      event: EVENTS.CIRCUIT_CLOSE,
      serviceKey,
    });
    pluginManager.emit(EVENTS.CIRCUIT_CLOSE, { serviceKey });
  });

  circuitBreakers.set(serviceKey, breaker);
  return breaker;
};

/**
 * Creates a proxy middleware for a given service key.
 *
 * @param {string} serviceKey - The target service key (from ServiceKeys enum).
 * @param {Object} [options={}] - Additional proxy options to merge.
 * @returns {Function} Express middleware function.
 */
export const createProxyMiddleware = (serviceKey, options = {}) => {
  const targetUrl = serviceRegistry.resolve
    ? serviceRegistry.resolve(serviceKey)
    : serviceRegistry.getUrl(serviceKey);

  const proxyMiddleware = hpmCreateProxy({
    target: targetUrl,
    ...proxyDefaults,
    ...options,

    on: {
      proxyReq: (proxyReq, req, _res) => {
        const ctx = contextStore.getContext();

        // ─── 1. Anti-Spoofing: Strip Client-Sent headers ───
        proxyReq.removeHeader('X-User-Context');
        proxyReq.removeHeader('X-User-ID');
        proxyReq.removeHeader('X-User-Role');
        proxyReq.removeHeader('X-User-Email');
        proxyReq.removeHeader('X-Gateway-ID');
        proxyReq.removeHeader('X-Gateway-Version');

        Object.keys(req.headers).forEach((h) => {
          if (h.toLowerCase().startsWith('x-h1p-') || h.toLowerCase().startsWith('x-authenticated-')) {
            proxyReq.removeHeader(h);
          }
        });

        // ─── 2. Forward Trace, Auth, and Idempotency Headers ───
        if (ctx?.requestId) {
          proxyReq.setHeader(HEADERS.REQUEST_ID, ctx.requestId);
        }
        if (ctx?.correlationId) {
          proxyReq.setHeader(HEADERS.CORRELATION_ID, ctx.correlationId);
        }
        if (req.headers['traceparent']) {
          proxyReq.setHeader('traceparent', req.headers['traceparent']);
        }
        if (req.headers['tracestate']) {
          proxyReq.setHeader('tracestate', req.headers['tracestate']);
        }
        if (req.headers['authorization']) {
          proxyReq.setHeader('Authorization', req.headers['authorization']);
        }
        if (req.headers['idempotency-key']) {
          proxyReq.setHeader('Idempotency-Key', req.headers['idempotency-key']);
        }

        // ─── 3. Inject Verified X-H1P-* Identity Headers ───
        if (ctx?.userId) {
          proxyReq.setHeader('X-H1P-User-Id', ctx.userId);
        }
        if (ctx?.role) {
          proxyReq.setHeader('X-H1P-Role', ctx.role);
        }
        if (ctx?.permissions && ctx.permissions.length > 0) {
          proxyReq.setHeader('X-H1P-Permissions', ctx.permissions.join(','));
        }
        if (ctx?.session) {
          proxyReq.setHeader('X-H1P-Session', JSON.stringify(ctx.session));
        }
        proxyReq.setHeader('X-H1P-Auth-Version', '1');

        // Service-to-service trusted token
        proxyReq.setHeader('X-H1P-Service-Token', environment.security?.serviceToken || 'trusted-gateway-token');

        // Restream the body if it has been consumed by express.json()
        if (req.body) {
          fixRequestBody(proxyReq, req);
        }

        // ─── 4. Client Request Cancellation Support ───
        _res.on('close', () => {
          if (!_res.writableEnded) {
            proxyReq.destroy();
          }
        });

        logger.debug(`Proxying ${req.method} ${req.originalUrl} → ${targetUrl}`, {
          source: 'proxyFactory',
        });

        pluginManager.emit(EVENTS.PROXY_STARTED, {
          serviceKey,
          method: req.method,
          path: req.originalUrl,
          target: targetUrl,
        });
      },

      proxyRes: (proxyRes, req, _res) => {
        const ctx = contextStore.getContext();
        const responseTime = ctx ? Date.now() - ctx.startTime : 0;

        _res.setHeader(HEADERS.RESPONSE_TIME, `${responseTime}ms`);

        const gatewayResponse = createGatewayResponse({
          upstreamStatusCode: proxyRes.statusCode,
          responseTimeMs: responseTime,
          targetService: serviceKey,
        });

        logger.info(
          `Proxy response: ${proxyRes.statusCode} from ${serviceKey} in ${responseTime}ms`,
          {
            event: EVENTS.PROXY_COMPLETED,
            serviceKey,
            statusCode: proxyRes.statusCode,
            responseTimeMs: responseTime,
          }
        );

        pluginManager.emit(EVENTS.PROXY_COMPLETED, {
          serviceKey,
          statusCode: proxyRes.statusCode,
          responseTimeMs: responseTime,
          gatewayResponse,
        });

        // Record successful call in Circuit Breaker
        if (circuitBreakerConfig.enabled) {
          const breaker = getOrCreateCircuitBreaker(serviceKey);
          if (proxyRes.statusCode < 500) {
            breaker.fire(async () => true).catch(() => {});
          }
        }
      },

      error: (err, req, res) => {
        const ctx = contextStore.getContext();
        const responseTime = ctx ? Date.now() - ctx.startTime : 0;

        logError(err, {
          source: 'proxyFactory',
          action: `proxy:${serviceKey}`,
          statusCode: 502,
          target: targetUrl,
          responseTimeMs: responseTime,
        });

        if (circuitBreakerConfig.enabled) {
          const breaker = getOrCreateCircuitBreaker(serviceKey);
          breaker.fire(async () => { throw err; }).catch(() => {});
        }

        pluginManager.emit(EVENTS.PROXY_FAILED, {
          serviceKey,
          error: err.message,
          responseTimeMs: responseTime,
        });

        if (!res.headersSent) {
          const apiError = ApiError.serviceUnavailable(
            `Service ${serviceKey} is currently unavailable.`
          );
          res.status(apiError.statusCode).json({
            ...apiError.toJSON(),
            requestId: ctx?.requestId || null,
            correlationId: ctx?.correlationId || null,
            timestamp: new Date().toISOString(),
          });
        }
      },
    },
  });

  if (circuitBreakerConfig.enabled) {
    return (req, res, next) => {
      const breaker = getOrCreateCircuitBreaker(serviceKey);

      if (breaker.opened) {
        logger.warn(`Circuit breaker is OPEN for ${serviceKey} — rejecting request`, {
          event: EVENTS.CIRCUIT_FALLBACK,
          serviceKey,
        });

        const apiError = ApiError.circuitOpen();
        const ctx = contextStore.getContext();

        return res.status(apiError.statusCode).json({
          ...apiError.toJSON(),
          requestId: ctx?.requestId || null,
          correlationId: ctx?.correlationId || null,
          timestamp: new Date().toISOString(),
        });
      }

      return proxyMiddleware(req, res, next);
    };
  }

  return proxyMiddleware;
};

export const getCircuitBreakerStatus = () => {
  const status = {};
  for (const [key, breaker] of circuitBreakers.entries()) {
    status[key] = {
      state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: breaker.stats ? breaker.stats.snapshot : null,
    };
  }
  return status;
};

export default { createProxyMiddleware, getCircuitBreakerStatus };
