/**
 * @fileoverview Candidate Routes
 * @module gateway/routes/candidate.routes
 *
 * Mounts the candidate proxy route. All requests to /api/v1/candidates/**
 * are forwarded to the CANDIDATE_SERVICE.
 */

import { Router } from 'express';
import { ServiceKeys } from '../../core/config/serviceRegistry.js';
import { createProxyMiddleware } from '../proxy/proxyFactory.js';

const router = Router();

router.use('/', createProxyMiddleware(ServiceKeys.CANDIDATE_SERVICE));

export default router;
