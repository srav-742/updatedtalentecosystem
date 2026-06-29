/**
 * @fileoverview Assessment Routes
 * @module gateway/routes/assessment.routes
 *
 * Mounts the assessment proxy route. All requests to /api/v1/assessments/**
 * are forwarded to the ASSESSMENT_SERVICE.
 */

import { Router } from 'express';
import { ServiceKeys } from '../../core/config/serviceRegistry.js';
import { createProxyMiddleware } from '../proxy/proxyFactory.js';

const router = Router();

router.use('/', createProxyMiddleware(ServiceKeys.ASSESSMENT_SERVICE));

export default router;
