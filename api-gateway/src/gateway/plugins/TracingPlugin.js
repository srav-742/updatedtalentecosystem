/**
 * @fileoverview Tracing Plugin
 * @module gateway/plugins/TracingPlugin
 *
 * Tracks the full lifecycle of a request through the gateway for
 * distributed tracing visibility. Logs start/end/error events with
 * timing data so each request can be traced end-to-end.
 */

import EVENTS from '../../core/constants/events.js';
import logger from '../../core/logger/logger.js';

/**
 * Tracing Plugin definition.
 * @type {Object}
 */
const TracingPlugin = {
  name: 'TracingPlugin',
  version: '1.0.0',

  /**
   * Registers event hooks with the PluginManager.
   *
   * @param {import('./PluginManager.js').PluginManager} manager
   */
  register(manager) {
    // Request received at the gateway
    manager.on(EVENTS.REQUEST_RECEIVED, (data) => {
      logger.debug(`[TRACE] Request received: ${data.method} ${data.path}`, {
        traceEvent: 'REQUEST_RECEIVED',
        requestId: data.requestId,
        correlationId: data.correlationId,
        method: data.method,
        path: data.path,
        clientIp: data.clientIp,
      });
    });

    // Authentication completed
    manager.on(EVENTS.REQUEST_AUTHENTICATED, (data) => {
      logger.debug(`[TRACE] Authenticated: user=${data.userId}`, {
        traceEvent: 'AUTHENTICATED',
        requestId: data.requestId,
        userId: data.userId,
        role: data.role,
      });
    });

    // Proxy request start
    manager.on(EVENTS.PROXY_REQUEST_START, (data) => {
      logger.debug(`[TRACE] Proxy start → ${data.serviceKey}: ${data.method} ${data.path}`, {
        traceEvent: 'PROXY_START',
        serviceKey: data.serviceKey,
        target: data.target,
      });
    });

    // Proxy request end
    manager.on(EVENTS.PROXY_REQUEST_END, (data) => {
      logger.debug(
        `[TRACE] Proxy end ← ${data.serviceKey}: ${data.statusCode} in ${data.responseTimeMs}ms`,
        {
          traceEvent: 'PROXY_END',
          serviceKey: data.serviceKey,
          statusCode: data.statusCode,
          responseTimeMs: data.responseTimeMs,
        }
      );
    });

    // Proxy error
    manager.on(EVENTS.PROXY_REQUEST_ERROR, (data) => {
      logger.debug(`[TRACE] Proxy error ✗ ${data.serviceKey}: ${data.error}`, {
        traceEvent: 'PROXY_ERROR',
        serviceKey: data.serviceKey,
        error: data.error,
        responseTimeMs: data.responseTimeMs,
      });
    });

    // Gateway timeout
    manager.on(EVENTS.PROXY_TIMEOUT, (data) => {
      logger.debug(`[TRACE] Timeout ⏱ ${data.serviceKey}`, {
        traceEvent: 'TIMEOUT',
        serviceKey: data.serviceKey,
        timeoutMs: data.timeoutMs,
      });
    });
  },
};

export default TracingPlugin;
