/**
 * @fileoverview Prometheus Metrics Endpoint
 * @module gateway/metrics/prometheus
 *
 * Exposes a /metrics endpoint that returns gateway metrics
 * in a format compatible with Prometheus scraping.
 */

import { Router } from 'express';
import { getRequestMetrics } from './metrics.middleware.js';
import MetricsPlugin from '../plugins/MetricsPlugin.js';
import { getCircuitBreakerStatus } from '../proxy/proxyFactory.js';
import { sendSuccess } from '../../core/utils/response.js';

const router = Router();

/**
 * GET /metrics
 * Returns aggregated gateway metrics.
 */
router.get('/metrics', (req, res) => {
  const requestMetrics = getRequestMetrics();
  const pluginMetrics = MetricsPlugin.getMetrics();
  const circuitBreakerStatus = getCircuitBreakerStatus();

  sendSuccess(res, {
    message: 'Gateway metrics retrieved.',
    data: {
      gateway: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        pid: process.pid,
        nodeVersion: process.version,
      },
      requests: requestMetrics,
      proxy: pluginMetrics,
      circuitBreakers: circuitBreakerStatus,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /metrics/prometheus
 * Returns metrics in Prometheus text exposition format.
 */
router.get('/metrics/prometheus', (req, res) => {
  const metrics = getRequestMetrics();
  const pluginMetrics = MetricsPlugin.getMetrics();

  let output = '';

  // Gateway uptime
  output += `# HELP gateway_uptime_seconds Gateway uptime in seconds\n`;
  output += `# TYPE gateway_uptime_seconds gauge\n`;
  output += `gateway_uptime_seconds ${process.uptime().toFixed(2)}\n\n`;

  // Total requests
  output += `# HELP gateway_requests_total Total number of requests\n`;
  output += `# TYPE gateway_requests_total counter\n`;
  output += `gateway_requests_total ${metrics.totalRequests}\n\n`;

  // Status code counts
  output += `# HELP gateway_responses_total Total responses by status code\n`;
  output += `# TYPE gateway_responses_total counter\n`;
  for (const [code, count] of Object.entries(metrics.statusCodeCounts)) {
    output += `gateway_responses_total{status="${code}"} ${count}\n`;
  }
  output += '\n';

  // Response time percentiles
  output += `# HELP gateway_response_time_ms Response time in milliseconds\n`;
  output += `# TYPE gateway_response_time_ms summary\n`;
  output += `gateway_response_time_ms{quantile="0.5"} ${metrics.responseTime.p50}\n`;
  output += `gateway_response_time_ms{quantile="0.95"} ${metrics.responseTime.p95}\n`;
  output += `gateway_response_time_ms{quantile="0.99"} ${metrics.responseTime.p99}\n\n`;

  // Proxy errors
  output += `# HELP gateway_proxy_errors_total Total proxy errors\n`;
  output += `# TYPE gateway_proxy_errors_total counter\n`;
  output += `gateway_proxy_errors_total ${pluginMetrics.totalErrors}\n\n`;

  // Auth failures
  output += `# HELP gateway_auth_failures_total Total auth failures\n`;
  output += `# TYPE gateway_auth_failures_total counter\n`;
  output += `gateway_auth_failures_total ${pluginMetrics.authFailures}\n\n`;

  // Circuit breaker trips
  output += `# HELP gateway_circuit_breaker_trips_total Total circuit breaker trips\n`;
  output += `# TYPE gateway_circuit_breaker_trips_total counter\n`;
  output += `gateway_circuit_breaker_trips_total ${pluginMetrics.circuitBreakerTrips}\n\n`;

  // Rate limit hits
  output += `# HELP gateway_rate_limit_hits_total Total rate limit hits\n`;
  output += `# TYPE gateway_rate_limit_hits_total counter\n`;
  output += `gateway_rate_limit_hits_total ${pluginMetrics.rateLimitHits}\n`;

  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(output);
});

export default router;
