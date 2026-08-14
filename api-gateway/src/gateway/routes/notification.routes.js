/**
 * @fileoverview Notification Routes
 * @module gateway/routes/notification.routes
 *
 * Mounts the notification proxy route. All requests to /api/v1/notifications/**
 * are forwarded to the NOTIFICATION_SERVICE.
 */

import { Router } from 'express';
import { ServiceKeys } from '../../core/config/serviceRegistry.js';
import { createProxyMiddleware } from '../proxy/proxyFactory.js';

const router = Router();

router.use('/', createProxyMiddleware(ServiceKeys.NOTIFICATION_SERVICE));

export default router;
