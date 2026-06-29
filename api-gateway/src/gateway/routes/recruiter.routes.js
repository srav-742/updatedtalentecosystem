/**
 * @fileoverview Recruiter Routes
 * @module gateway/routes/recruiter.routes
 *
 * Mounts the recruiter proxy route. All requests to /api/v1/recruiters/**
 * are forwarded to the RECRUITER_SERVICE.
 */

import { Router } from 'express';
import { ServiceKeys } from '../../core/config/serviceRegistry.js';
import { createProxyMiddleware } from '../proxy/proxyFactory.js';

const router = Router();

router.use('/', createProxyMiddleware(ServiceKeys.RECRUITER_SERVICE));

export default router;
