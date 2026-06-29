/**
 * @fileoverview Job Routes
 * @module gateway/routes/job.routes
 *
 * Mounts the job proxy route. All requests to /api/v1/jobs/**
 * are forwarded to the JOB_SERVICE.
 */

import { Router } from 'express';
import { ServiceKeys } from '../../core/config/serviceRegistry.js';
import { createProxyMiddleware } from '../proxy/proxyFactory.js';

const router = Router();

router.use('/', createProxyMiddleware(ServiceKeys.JOB_SERVICE));

export default router;
