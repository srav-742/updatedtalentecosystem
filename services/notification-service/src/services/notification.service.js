import { notificationRepository } from '../repositories/notification.repository.js';
import { templateRepository } from '../repositories/template.repository.js';
import { preferenceRepository } from '../repositories/preference.repository.js';
import { queueRepository } from '../repositories/queue.repository.js';
import { EmailProviderFactory } from '../providers/email/emailProvider.factory.js';
import { SmsProviderFactory } from '../providers/sms/smsProvider.factory.js';
import { PushProviderFactory } from '../providers/push/pushProvider.factory.js';
import { sendInAppNotification } from '../websocket/wsServer.js';
import { compile } from './templateCompiler.js';
import { CHANNELS, STATUS } from '../constants/notification.constants.js';
import { logger, errors } from '@hire1percent/shared';

const log = logger.createLogger('notification-service');

export class NotificationService {
  /**
   * Send a single notification.
   * Checks user preferences and dispatches to the requested channel.
   * 
   * @param {Object} data 
   * @returns {Promise<Object>} The created notification document
   */
  async sendNotification(data) {
    const {
      recipientId,
      channel,
      title,
      body,
      recipientEmail,
      recipientPhone,
      recipientPushTokens,
      metadata = {},
      templateId,
      providerOverride = null,
    } = data;

    if (!recipientId || !channel || !title || !body) {
      throw new errors.ValidationError('Missing required notification dispatch fields (recipientId, channel, title, body).');
    }

    if (!Object.values(CHANNELS).includes(channel)) {
      throw new errors.ValidationError(`Invalid notification channel: ${channel}`);
    }

    // 1. Resolve Preferences
    const preference = await preferenceRepository.findByUserId(recipientId);
    let isOptedIn = true;

    if (preference) {
      // Check global channel setting
      if (channel === CHANNELS.EMAIL && !preference.email) isOptedIn = false;
      if (channel === CHANNELS.SMS && !preference.sms) isOptedIn = false;
      if (channel === CHANNELS.PUSH && !preference.push) isOptedIn = false;
      if (channel === CHANNELS.IN_APP && !preference.inApp) isOptedIn = false;

      // Check template/event level setting if metadata.eventName exists
      if (metadata.eventName && preference.eventPreferences && preference.eventPreferences[metadata.eventName]) {
        const eventPref = preference.eventPreferences[metadata.eventName];
        if (eventPref[channel] === false) {
          isOptedIn = false;
        }
      }
    }

    if (!isOptedIn) {
      log.info(`Skipped notification to recipient ${recipientId} on channel ${channel} due to opt-out preference.`);
      // Return a skipped notification object without saving to queue
      return {
        recipientId,
        channel,
        title,
        body,
        status: STATUS.FAILED,
        metadata: { ...metadata, skipped: true, reason: 'preference_opt_out' },
      };
    }

    // 2. Create Notification Record
    const notification = await notificationRepository.create({
      recipientId,
      recipientEmail,
      recipientPhone,
      recipientPushTokens,
      title,
      body,
      channel,
      status: STATUS.PENDING,
      metadata,
      templateId,
    });

    // 3. Dispatch Channel
    try {
      if (channel === CHANNELS.EMAIL) {
        await this._dispatchEmail(notification, providerOverride);
      } else if (channel === CHANNELS.SMS) {
        await this._dispatchSms(notification, providerOverride);
      } else if (channel === CHANNELS.PUSH) {
        await this._dispatchPush(notification, providerOverride);
      } else if (channel === CHANNELS.IN_APP) {
        await this._dispatchInApp(notification);
      }
    } catch (err) {
      log.error(`Critical error during direct dispatch of notification ${notification._id}:`, err);
      await this._handleDispatchFailure(notification, err.message || 'Direct dispatch critical failure.');
    }

    return await notificationRepository.findById(notification._id);
  }

  /**
   * Sends multiple notifications in batch.
   * 
   * @param {Object[]} items 
   * @returns {Promise<Object[]>} List of results
   */
  async sendBulk(items) {
    if (!Array.isArray(items)) {
      throw new errors.ValidationError('Bulk notification payloads must be an array.');
    }

    log.info(`Processing bulk notification request of size: ${items.length}`);
    const results = [];

    for (const item of items) {
      try {
        const res = await this.sendNotification(item);
        results.push(res);
      } catch (err) {
        log.error('Bulk item failed to enqueue/dispatch:', err);
        results.push({
          error: err.message,
          success: false,
          recipientId: item.recipientId,
          channel: item.channel,
        });
      }
    }

    return results;
  }

  /**
   * Retrieves notification list based on filter criteria.
   */
  async getNotifications(filter) {
    return await notificationRepository.find(filter);
  }

  /**
   * Retrieves single notification by ID.
   */
  async getNotificationById(id) {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw new errors.NotFoundError(`Notification with ID ${id} not found.`);
    }
    return notification;
  }

  /**
   * Updates notification preferences.
   */
  async updatePreferences(userId, data) {
    return await preferenceRepository.update(userId, data);
  }

  /**
   * Dispatch via Email Provider
   * 
   * @private
   */
  async _dispatchEmail(notification, providerOverride) {
    const provider = EmailProviderFactory.getProvider(providerOverride);
    const emailTo = notification.recipientEmail || notification.metadata?.email;

    if (!emailTo) {
      throw new Error('No recipient email address resolved.');
    }

    const result = await provider.send({
      to: emailTo,
      subject: notification.title,
      body: notification.body,
      metadata: notification.metadata,
    });

    await this._logAttempt(notification, provider.constructor.name, result);
  }

  /**
   * Dispatch via SMS Provider
   * 
   * @private
   */
  async _dispatchSms(notification, providerOverride) {
    const provider = SmsProviderFactory.getProvider(providerOverride);
    const smsTo = notification.recipientPhone || notification.metadata?.phone;

    if (!smsTo) {
      throw new Error('No recipient phone number resolved.');
    }

    const result = await provider.send({
      to: smsTo,
      body: notification.body,
      metadata: notification.metadata,
    });

    await this._logAttempt(notification, provider.constructor.name, result);
  }

  /**
   * Dispatch via Push Provider
   * 
   * @private
   */
  async _dispatchPush(notification, providerOverride) {
    const provider = PushProviderFactory.getProvider(providerOverride);
    const tokens = notification.recipientPushTokens && notification.recipientPushTokens.length > 0
      ? notification.recipientPushTokens
      : (notification.metadata?.pushTokens || []);

    if (tokens.length === 0) {
      throw new Error('No push registration tokens resolved.');
    }

    const result = await provider.send({
      tokens,
      title: notification.title,
      body: notification.body,
      data: notification.metadata,
    });

    await this._logAttempt(notification, provider.constructor.name, result);
  }

  /**
   * Dispatch via WebSocket In-App Channel
   * 
   * @private
   */
  async _dispatchInApp(notification) {
    // In-app notifications do not retry since they are stored in DB. We attempt to push over websocket
    const pushed = sendInAppNotification(notification.recipientId, notification);
    
    // Marked as sent in history
    await notificationRepository.update(notification._id, {
      status: STATUS.SENT,
      sentAt: new Date(),
    });

    await notificationRepository.createLog({
      notificationId: notification._id,
      recipientId: notification.recipientId,
      channel: CHANNELS.IN_APP,
      provider: 'WebSocket',
      status: 'success',
      attempts: 1,
    });
  }

  /**
   * Log sending attempt and update notification status.
   * 
   * @private
   */
  async _logAttempt(notification, providerName, result) {
    await notificationRepository.createLog({
      notificationId: notification._id,
      recipientId: notification.recipientId,
      channel: notification.channel,
      provider: providerName,
      status: result.success ? 'success' : 'failed',
      error: result.error || null,
      attempts: 1,
    });

    if (result.success) {
      await notificationRepository.update(notification._id, {
        status: STATUS.SENT,
        sentAt: new Date(),
      });
      log.info(`Notification ${notification._id} successfully sent on channel ${notification.channel}`);
    } else {
      await this._handleDispatchFailure(notification, result.error, providerName);
    }
  }

  /**
   * Handle failures by placing them in the retry queue.
   * 
   * @private
   */
  async _handleDispatchFailure(notification, errorMessage, providerName = 'Unknown') {
    log.warn(`Direct dispatch failed for notification ${notification._id}. Enqueueing for retry queue. Error: ${errorMessage}`);
    
    // Update status to queued
    await notificationRepository.update(notification._id, {
      status: STATUS.QUEUED,
    });

    // Enqueue
    await queueRepository.enqueue({
      notificationId: notification._id,
      payload: {
        recipientId: notification.recipientId,
        recipientEmail: notification.recipientEmail,
        recipientPhone: notification.recipientPhone,
        recipientPushTokens: notification.recipientPushTokens,
        title: notification.title,
        body: notification.body,
        channel: notification.channel,
        metadata: notification.metadata,
        templateId: notification.templateId,
      },
      status: 'pending',
      attempts: 1, // first attempt failed
      maxAttempts: 3,
      nextRunAt: new Date(Date.now() + 5000), // First retry scheduled in 5 seconds
      error: errorMessage,
    });
  }

  /**
   * Helper to send notification using a dynamic template.
   * 
   * @param {string} eventName - Template identifier (e.g. JOB_CREATED)
   * @param {Object} recipientData - Recipient contact info (id, email, phone, pushTokens)
   * @param {Object} templateContext - Dynamic placeholders variables
   */
  async sendFromTemplate(eventName, recipientData, templateContext) {
    const template = await templateRepository.findByName(eventName);
    if (!template) {
      log.warn(`No notification template found for event: ${eventName}. Skipping dispatch.`);
      return [];
    }

    if (!template.isActive) {
      log.info(`Notification template ${eventName} is disabled. Skipping dispatch.`);
      return [];
    }

    const { id, email, phone, pushTokens } = recipientData;
    const results = [];

    // Loop through allowed channels in template
    for (const channel of template.channels) {
      try {
        const title = compile(template.titleTemplate, templateContext);
        const body = compile(template.bodyTemplate, templateContext);

        const res = await this.sendNotification({
          recipientId: id,
          recipientEmail: email,
          recipientPhone: phone,
          recipientPushTokens: pushTokens,
          channel,
          title,
          body,
          templateId: template._id,
          metadata: { eventName, ...templateContext },
        });

        results.push(res);
      } catch (err) {
        log.error(`Failed to send event notification ${eventName} on channel ${channel}:`, err);
      }
    }

    return results;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
