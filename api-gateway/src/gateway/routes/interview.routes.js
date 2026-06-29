/**
 * @fileoverview Interview Routes
 * @module gateway/routes/interview.routes
 *
 * Mounts the interview proxy route. All requests to /api/v1/interviews/**
 * are forwarded to the INTERVIEW_SERVICE.
 */

import { Router } from 'express';
import { ServiceKeys } from '../../core/config/serviceRegistry.js';
import { createProxyMiddleware } from '../proxy/proxyFactory.js';

const router = Router();

router.use('/', createProxyMiddleware(ServiceKeys.INTERVIEW_SERVICE));

export default router;
