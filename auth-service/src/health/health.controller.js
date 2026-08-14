/**
 * @fileoverview Health Controller
 * @module health/health.controller
 *
 * Implements /health, /ready, and /live endpoints for the Auth Service.
 */

import { Router } from 'express';
import environment from '../config/environment.js';
import { sendSuccess } from '../utils/response.js';
import MESSAGES from '../constants/messages.js';
import STATUS_CODES from '../constants/statusCodes.js';

import checkInfrastructureHealth from '../config/health.js';

const router = Router();

/**
 * GET /
 * Root health endpoint.
 */
router.get('/', (req, res) => {
  sendSuccess(res, {
    status: STATUS_CODES.OK,
    message: 'Auth Service is operational.',
    data: {
      status: 'HEALTHY',
      service: 'auth-service',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /health
 * Full health status reports.
 */
router.get('/health', async (req, res) => {
  const infraHealth = await checkInfrastructureHealth();
  const serviceStatus = infraHealth.healthy ? 'HEALTHY' : 'DEGRADED';
  const message = infraHealth.healthy ? MESSAGES.HEALTH_OK : MESSAGES.HEALTH_DEGRADED;

  sendSuccess(res, {
    status: STATUS_CODES.OK,
    message,
    data: {
      status: serviceStatus,
      service: 'auth-service',
      version: '1.0.0',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      environment: environment.nodeEnv,
      dependencies: {
        database: infraHealth.database,
        redis: infraHealth.redis,
      },
    },
  });
});

/**
 * GET /ready
 * Readiness probe.
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
 * Liveness probe.
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
