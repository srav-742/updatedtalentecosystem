/**
 * @fileoverview Admin Routes
 * @module gateway/routes/admin.routes
 *
 * Mounts the admin proxy route. All requests to /api/v1/admin/**
 * are forwarded to the ADMIN_SERVICE.
 */

import { Router } from 'express';
import { ServiceKeys } from '../../core/config/serviceRegistry.js';
import { createProxyMiddleware } from '../proxy/proxyFactory.js';

const router = Router();

router.use('/', createProxyMiddleware(ServiceKeys.ADMIN_SERVICE));

export default router;
