/**
 * @fileoverview Health Controller
 * @module gateway/health/health.controller
 *
 * Implements /health, /ready, and /live endpoints.
 * The /health endpoint performs parallel pings to all registered
 * downstream services to report their availability.
 */

import { Router } from 'express';
import axios from 'axios';
import { serviceRegistry } from '../../core/config/serviceRegistry.js';
import environment from '../../core/config/environment.js';
import { sendSuccess } from '../../core/utils/response.js';
import MESSAGES from '../../core/constants/messages.js';
import STATUS_CODES from '../../core/constants/statusCodes.js';
import EVENTS from '../../core/constants/events.js';
import { pluginManager } from '../plugins/PluginManager.js';
import { getCircuitBreakerStatus } from '../proxy/proxyFactory.js';
import logger from '../../core/logger/logger.js';

const router = Router();

/**
 * GET /
 * Root health endpoint.
 */
router.get('/', (req, res) => {
  sendSuccess(res, {
    status: STATUS_CODES.OK,
    message: 'Gateway is operational.',
    data: {
      status: 'HEALTHY',
      service: 'api-gateway',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

/** @type {number} Timeout for individual health check pings (ms) */
const PING_TIMEOUT = 3000;

/**
 * Pings a single downstream service.
 *
 * @param {string} serviceKey - The service key.
 * @param {string} url - The service base URL.
 * @returns {Promise<Object>} Health status object.
 */
const pingService = async (serviceKey, url) => {
  const start = Date.now();
  try {
    const response = await axios.get(`${url}/health`, {
      timeout: PING_TIMEOUT,
      validateStatus: () => true, // Accept any status
    });
    const latency = Date.now() - start;

    const isHealthy = response.status >= 200 && response.status < 400;

    if (isHealthy) {
      pluginManager.emit(EVENTS.SERVICE_HEALTHY, { serviceKey, latency });
    } else {
      pluginManager.emit(EVENTS.SERVICE_UNHEALTHY, { serviceKey, latency, status: response.status });
    }

    return {
      status: isHealthy ? 'UP' : 'DEGRADED',
      statusCode: response.status,
      latencyMs: latency,
    };
  } catch (error) {
    const latency = Date.now() - start;

    pluginManager.emit(EVENTS.SERVICE_UNHEALTHY, {
      serviceKey,
      latency,
      error: error.message,
    });

    return {
      status: 'DOWN',
      error: error.code || error.message,
      latencyMs: latency,
    };
  }
};

/**
 * GET /health
 * Full health check with downstream service pings.
 */
router.get('/health', async (req, res) => {
  pluginManager.emit(EVENTS.HEALTH_CHECK_START, {});

  const entries = serviceRegistry.getEntries();
  const results = {};

  // Ping all services in parallel
  const pings = entries.map(async ([key, url]) => {
    results[key] = await pingService(key, url);
  });

  await Promise.allSettled(pings);

  // Determine overall gateway health
  const allUp = Object.values(results).every((r) => r.status === 'UP');
  const anyDown = Object.values(results).some((r) => r.status === 'DOWN');

  const gatewayStatus = allUp ? 'HEALTHY' : anyDown ? 'DEGRADED' : 'PARTIAL';
  const message = allUp ? MESSAGES.HEALTH_OK : MESSAGES.HEALTH_DEGRADED;
  const statusCode = allUp ? STATUS_CODES.OK : STATUS_CODES.OK; // Return 200 even if degraded

  pluginManager.emit(EVENTS.HEALTH_CHECK_COMPLETE, {
    status: gatewayStatus,
    services: results,
  });

  sendSuccess(res, {
    status: statusCode,
    message,
    data: {
      gateway: gatewayStatus,
      version: '1.0.0',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      environment: environment.nodeEnv,
      services: results,
      circuitBreakers: getCircuitBreakerStatus(),
    },
  });
});

/**
 * GET /ready
 * Kubernetes readiness probe.
 * Returns 200 if the gateway is ready to accept traffic.
 */
router.get('/ready', (req, res) => {
  sendSuccess(res, {
    status: STATUS_CODES.OK,
    message: MESSAGES.READY,
    data: {
      ready: true,
      uptime: process.uptime(),
    },
  });
});

/**
 * GET /live
 * Kubernetes liveness probe.
 * Returns 200 if the gateway process is alive.
 */
router.get('/live', (req, res) => {
  sendSuccess(res, {
    status: STATUS_CODES.OK,
    message: MESSAGES.LIVE,
    data: {
      alive: true,
      pid: process.pid,
      uptime: process.uptime(),
    },
  });
});

export default router;
