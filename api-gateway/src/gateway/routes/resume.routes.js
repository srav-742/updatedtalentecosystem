/**
 * @fileoverview Resume Routes
 * @module gateway/routes/resume.routes
 *
 * Mounts the resume proxy route. All requests to /api/v1/resumes/**
 * are forwarded to the RESUME_SERVICE.
 */

import { Router } from 'express';
import { ServiceKeys } from '../../core/config/serviceRegistry.js';
import { createProxyMiddleware } from '../proxy/proxyFactory.js';

const router = Router();

router.use('/', createProxyMiddleware(ServiceKeys.RESUME_SERVICE));

export default router;
