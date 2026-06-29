/**
 * @fileoverview Metrics Plugin
 * @module gateway/plugins/MetricsPlugin
 *
 * Collects in-memory metrics from proxy lifecycle events.
 * These counters and histograms can be exposed via /metrics
 * for Prometheus scraping.
 */

import EVENTS from '../../core/constants/events.js';
import logger from '../../core/logger/logger.js';

/**
 * In-memory metrics store.
 * In a production setup, these would feed into a Prometheus client.
 */
const metrics = {
  /** Total requests proxied */
  totalRequests: 0,

  /** Total successful proxy responses (2xx-4xx) */
  totalSuccess: 0,

  /** Total proxy errors (5xx, timeouts, connection refused) */
  totalErrors: 0,

  /** Total circuit breaker trips */
  circuitBreakerTrips: 0,

  /** Total rate limit hits */
  rateLimitHits: 0,

  /** Total auth failures */
  authFailures: 0,

  /** Response time histogram buckets (service → [times]) */
  responseTimeBuckets: {},

  /** Per-service request counts */
  serviceRequestCounts: {},

  /** Per-service error counts */
  serviceErrorCounts: {},
};

/**
 * Metrics Plugin definition.
 * @type {Object}
 */
const MetricsPlugin = {
  name: 'MetricsPlugin',
  version: '1.0.0',

  /**
   * Registers event hooks with the PluginManager.
   *
   * @param {import('./PluginManager.js').PluginManager} manager
   */
  register(manager) {
    // Proxy start
    manager.on(EVENTS.PROXY_REQUEST_START, (data) => {
      metrics.totalRequests++;
      const key = data.serviceKey || 'unknown';
      metrics.serviceRequestCounts[key] = (metrics.serviceRequestCounts[key] || 0) + 1;
    });

    // Proxy end (success)
    manager.on(EVENTS.PROXY_REQUEST_END, (data) => {
      metrics.totalSuccess++;
      const key = data.serviceKey || 'unknown';

      // Record response time
      if (!metrics.responseTimeBuckets[key]) {
        metrics.responseTimeBuckets[key] = [];
      }
      metrics.responseTimeBuckets[key].push(data.responseTimeMs || 0);

      // Keep only the last 1000 entries per service
      if (metrics.responseTimeBuckets[key].length > 1000) {
        metrics.responseTimeBuckets[key] = metrics.responseTimeBuckets[key].slice(-1000);
      }
    });

    // Proxy error
    manager.on(EVENTS.PROXY_REQUEST_ERROR, (data) => {
      metrics.totalErrors++;
      const key = data.serviceKey || 'unknown';
      metrics.serviceErrorCounts[key] = (metrics.serviceErrorCounts[key] || 0) + 1;
    });

    // Circuit breaker open
    manager.on(EVENTS.CIRCUIT_OPEN, () => {
      metrics.circuitBreakerTrips++;
    });

    // Rate limit exceeded
    manager.on(EVENTS.RATE_LIMIT_EXCEEDED, () => {
      metrics.rateLimitHits++;
    });

    // Auth failure
    manager.on(EVENTS.AUTH_FAILURE, () => {
      metrics.authFailures++;
    });
  },

  /**
   * Returns a snapshot of the current metrics.
   *
   * @returns {Object} The metrics snapshot.
   */
  getMetrics() {
    return { ...metrics };
  },

  /**
   * Resets all metrics to zero (useful for testing).
   */
  resetMetrics() {
    metrics.totalRequests = 0;
    metrics.totalSuccess = 0;
    metrics.totalErrors = 0;
    metrics.circuitBreakerTrips = 0;
    metrics.rateLimitHits = 0;
    metrics.authFailures = 0;
    metrics.responseTimeBuckets = {};
    metrics.serviceRequestCounts = {};
    metrics.serviceErrorCounts = {};
  },
};

export default MetricsPlugin;
