/**
 * @fileoverview Metrics Middleware
 * @module gateway/metrics/metrics.middleware
 *
 * Express middleware that records per-request metrics
 * (response time, status codes) for Prometheus exposition.
 */

import contextStore from '../../core/context/contextStore.js';
import HEADERS from '../../core/constants/headers.js';

/**
 * In-memory metrics counters.
 */
const requestMetrics = {
  totalRequests: 0,
  statusCodeCounts: {},
  methodCounts: {},
  pathCounts: {},
  responseTimeSamples: [],
};

/**
 * Metrics middleware.
 * Records request start time and captures response metrics on finish.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  requestMetrics.totalRequests++;

  // Count by method
  requestMetrics.methodCounts[req.method] =
    (requestMetrics.methodCounts[req.method] || 0) + 1;

  // On response finish, record the outcome
  res.on('finish', () => {
    const duration = Date.now() - start;

    // Set response time header
    if (!res.getHeader(HEADERS.RESPONSE_TIME)) {
      res.setHeader(HEADERS.RESPONSE_TIME, `${duration}ms`);
    }

    // Count by status code
    const statusBucket = `${res.statusCode}`;
    requestMetrics.statusCodeCounts[statusBucket] =
      (requestMetrics.statusCodeCounts[statusBucket] || 0) + 1;

    // Record response time (keep last 5000 samples)
    requestMetrics.responseTimeSamples.push(duration);
    if (requestMetrics.responseTimeSamples.length > 5000) {
      requestMetrics.responseTimeSamples = requestMetrics.responseTimeSamples.slice(-5000);
    }
  });

  next();
};

/**
 * Returns a snapshot of the current request metrics.
 * @returns {Object}
 */
export const getRequestMetrics = () => {
  const samples = requestMetrics.responseTimeSamples;
  const sorted = [...samples].sort((a, b) => a - b);

  return {
    totalRequests: requestMetrics.totalRequests,
    statusCodeCounts: { ...requestMetrics.statusCodeCounts },
    methodCounts: { ...requestMetrics.methodCounts },
    responseTime: {
      samples: samples.length,
      avg: samples.length > 0 ? (samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2) : 0,
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      max: sorted[sorted.length - 1] || 0,
    },
  };
};

export { metricsMiddleware };
export default metricsMiddleware;
