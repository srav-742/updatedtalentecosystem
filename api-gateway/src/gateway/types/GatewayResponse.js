/**
 * @fileoverview Gateway Response Schema
 * @module gateway/types/GatewayResponse
 *
 * Defines the structure for gateway-level response metadata.
 * Used by plugins and the proxy factory to track response lifecycle data.
 */

/**
 * Creates a GatewayResponse metadata object.
 *
 * @param {Object} [overrides={}] - Override values.
 * @returns {Object} The gateway response metadata.
 */
export const createGatewayResponse = (overrides = {}) => {
  return {
    /** @type {number|null} HTTP status code from upstream */
    upstreamStatusCode: overrides.upstreamStatusCode || null,

    /** @type {number|null} Response time in milliseconds */
    responseTimeMs: overrides.responseTimeMs || null,

    /** @type {string|null} Target service that handled the request */
    targetService: overrides.targetService || null,

    /** @type {boolean} Whether the response was served from circuit breaker fallback */
    isCircuitBreakerFallback: overrides.isCircuitBreakerFallback || false,

    /** @type {boolean} Whether the response timed out */
    isTimeout: overrides.isTimeout || false,

    /** @type {boolean} Whether the proxy encountered an error */
    isProxyError: overrides.isProxyError || false,

    /** @type {string|null} Error message if proxy failed */
    proxyErrorMessage: overrides.proxyErrorMessage || null,

    /** @type {Object} Plugin metadata bag for response hooks */
    pluginData: overrides.pluginData || {},

    /** @type {string} ISO timestamp of the response */
    timestamp: overrides.timestamp || new Date().toISOString(),
  };
};

export default { createGatewayResponse };
