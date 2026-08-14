import { notificationService } from '../services/notification.service.js';
import { response, errors, events } from '@hire1percent/shared';

export class NotificationController {
  /**
   * Dispatches a single notification.
   */
  async send(req, res, next) {
    try {
      const notification = await notificationService.sendNotification(req.body);
      response.sendCreated(res, notification, 'Notification processed and sent/queued successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Dispatches bulk notifications.
   */
  async bulk(req, res, next) {
    try {
      // Body can be { items: [...] } or direct array [...]
      const items = Array.isArray(req.body) ? req.body : (req.body.items || []);
      const results = await notificationService.sendBulk(items);
      response.sendSuccess(res, {
        data: results,
        message: 'Bulk notifications processed.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List notifications for the authenticated user.
   */
  async list(req, res, next) {
    try {
      const userId = req.user.userId;
      const role = req.user.role;

      // Regular users can only see their own notifications. Admins can filter by query.
      let filter = { recipientId: userId };
      if (role === 'admin' && req.query.recipientId) {
        filter.recipientId = req.query.recipientId;
      }
      
      // Allow filtering by status or channel
      if (req.query.status) filter.status = req.query.status;
      if (req.query.channel) filter.channel = req.query.channel;

      const notifications = await notificationService.getNotifications(filter);
      response.sendSuccess(res, { data: notifications });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieve notification details by ID with ownership enforcement.
   */
  async getById(req, res, next) {
    try {
      const id = req.params.id;
      const userId = req.user.userId;
      const role = req.user.role;

      const notification = await notificationService.getNotificationById(id);

      // Ownership enforcement: Only recipient or admin can access
      if (notification.recipientId !== userId && role !== 'admin') {
        return next(new errors.AuthorizationError('Access denied: You do not own this notification.'));
      }

      response.sendSuccess(res, { data: notification });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Helper endpoint to simulate consumed event bus triggers (useful for integrations and testing).
   */
  async simulateEvent(req, res, next) {
    try {
      const { eventName, recipient, context } = req.body;
      if (!eventName || !recipient) {
        throw new errors.ValidationError('Missing eventName or recipient specifications.');
      }

      // Emit on the event bus
      events.eventBus.emit(eventName, { recipient, context });

      response.sendSuccess(res, {
        message: `Simulated event "${eventName}" emitted on the eventBus.`,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
export default notificationController;

