import express from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { preferenceController } from '../controllers/preference.controller.js';
import { trustedContextMiddleware } from '../middlewares/trustedContext.js';

const router = express.Router();

// All Notification routes require trusted context forwarded by the Gateway
router.use(trustedContextMiddleware);

// POST /notifications/send
router.post('/notifications/send', notificationController.send);
router.post('/api/v1/notifications/send', notificationController.send);

// POST /notifications/bulk
router.post('/notifications/bulk', notificationController.bulk);
router.post('/api/v1/notifications/bulk', notificationController.bulk);

// GET /notifications
router.get('/notifications', notificationController.list);
router.get('/api/v1/notifications', notificationController.list);

// GET /notifications/:id
router.get('/notifications/:id', notificationController.getById);
router.get('/api/v1/notifications/:id', notificationController.getById);

// PUT /notifications/preferences
router.put('/notifications/preferences', preferenceController.update);
router.put('/api/v1/notifications/preferences', preferenceController.update);

// Simulation / webhooks route (for manual triggers and testing event consumption)
router.post('/notifications/events', notificationController.simulateEvent);
router.post('/api/v1/notifications/events', notificationController.simulateEvent);

export default router;
