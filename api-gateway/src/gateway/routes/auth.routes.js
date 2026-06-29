/**
 * @fileoverview Auth Routes
 * @module gateway/routes/auth.routes
 *
 * Mounts the auth proxy route. All requests to /api/v1/auth/**
 * are forwarded to the AUTH_SERVICE.
 */

import { Router } from 'express';
import { ServiceKeys } from '../../core/config/serviceRegistry.js';
import { createProxyMiddleware } from '../proxy/proxyFactory.js';

const router = Router();

/**
 * Auth routes — no authentication required (login, register, etc.).
 * The entire /api/v1/auth path subtree is proxied to AUTH_SERVICE.
 */
router.use('/', createProxyMiddleware(ServiceKeys.AUTH_SERVICE));

export default router;
