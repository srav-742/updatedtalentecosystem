/**
 * @fileoverview Proxy Configuration
 * @module gateway/config/proxy.config
 *
 * Defines http-proxy-middleware options and circuit breaker settings
 * used by the proxy factory. Keeps proxy behavior centralized and
 * environment-aware.
 */

import environment from '../../core/config/environment.js';
import gatewayConfig from './gateway.config.js';

/**
 * Default http-proxy-middleware options.
 * These are merged with per-route overrides in the proxy factory.
 *
 * @type {Object}
 */
export const proxyDefaults = Object.freeze({
  /** Change the origin header to match the target */
  changeOrigin: true,

  /** Proxy WebSocket connections */
  ws: false,

  /** Follow HTTP redirects from upstream */
  followRedirects: false,

  /** Timeout for the proxy request in ms */
  timeout: environment.timeouts.proxy,

  /** Timeout for the proxy response in ms */
  proxyTimeout: environment.timeouts.proxy,

  /** Preserve the host header from the original request */
  xfwd: true,

  /** Custom headers added to every proxied request */
  headers: {
    'X-Gateway-ID': gatewayConfig.gatewayId,
    'X-Gateway-Version': gatewayConfig.version,
  },
});

/**
 * Circuit breaker configuration for opossum.
 *
 * @type {Object}
 */
export const circuitBreakerConfig = Object.freeze({
  /** Time in ms before the circuit breaker resets after opening */
  resetTimeout: environment.circuitBreakers.resetTimeout,

  /** Error threshold percentage to trip the breaker */
  errorThresholdPercentage: environment.circuitBreakers.errorThresholdPercentage,

  /** Minimum number of requests in the rolling window before the breaker can trip */
  volumeThreshold: environment.circuitBreakers.volumeThreshold,

  /** Length of the statistical rolling window in ms */
  rollingCountTimeout: 10000,

  /** Number of buckets in the rolling window */
  rollingCountBuckets: 10,

  /** Timeout for each individual request in ms */
  timeout: environment.timeouts.proxy,

  /** Whether to enable the circuit breaker (profile-dependent) */
  enabled: gatewayConfig.enableCircuitBreaker,
});

export default { proxyDefaults, circuitBreakerConfig };
