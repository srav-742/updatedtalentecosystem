import { queueRepository } from '../repositories/queue.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { EmailProviderFactory } from '../providers/email/emailProvider.factory.js';
import { SmsProviderFactory } from '../providers/sms/smsProvider.factory.js';
import { PushProviderFactory } from '../providers/push/pushProvider.factory.js';
import { CHANNELS, STATUS, QUEUE_STATUS, RETRY_STATUS } from '../constants/notification.constants.js';
import environment from '../config/environment.js';
import { logger } from '@hire1percent/shared';

const log = logger.createLogger('queue-worker');

let workerIntervalId = null;

/**
 * Calculates exponential backoff duration in milliseconds.
 * 
 * @param {number} attempt 
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoff(attempt) {
  // 5s, 10s, 20s, etc.
  return Math.pow(2, attempt) * 5000;
}

/**
 * Main queue processing iteration.
 */
export async function processQueue() {
  const now = new Date();
  try {
    const pendingItems = await queueRepository.findPendingToRun(now);
    
    if (pendingItems.length > 0) {
      log.info(`Queue Worker: Found ${pendingItems.length} pending notification queue items to process.`);
    }

    for (const item of pendingItems) {
      await processQueueItem(item);
    }
  } catch (err) {
    log.error('Queue Worker: Error during processing loop:', err);
  }
}

/**
 * Processes a single queue item.
 * 
 * @param {Object} item - Mongoose NotificationQueue document
 */
async function processQueueItem(item) {
  log.info(`Queue Worker: Processing queue item ${item._id} for notification ${item.notificationId} (Attempt: ${item.attempts + 1})`);
  
  // Set processing status to avoid concurrent processing
  await queueRepository.updateQueueItem(item._id, { status: QUEUE_STATUS.PROCESSING });

  const payload = item.payload;
  const channel = payload.channel;
  
  let success = false;
  let errorMsg = null;
  let providerName = 'Unknown';

  try {
    if (channel === CHANNELS.EMAIL) {
      const provider = EmailProviderFactory.getProvider();
      providerName = provider.constructor.name;
      const res = await provider.send({
        to: payload.recipientEmail || payload.metadata?.email,
        subject: payload.title,
        body: payload.body,
        metadata: payload.metadata,
      });
      success = res.success;
      errorMsg = res.error;
    } else if (channel === CHANNELS.SMS) {
      const provider = SmsProviderFactory.getProvider();
      providerName = provider.constructor.name;
      const res = await provider.send({
        to: payload.recipientPhone || payload.metadata?.phone,
        body: payload.body,
        metadata: payload.metadata,
      });
      success = res.success;
      errorMsg = res.error;
    } else if (channel === CHANNELS.PUSH) {
      const provider = PushProviderFactory.getProvider();
      providerName = provider.constructor.name;
      const res = await provider.send({
        tokens: payload.recipientPushTokens || payload.metadata?.pushTokens || [],
        title: payload.title,
        body: payload.body,
        data: payload.metadata,
      });
      success = res.success;
      errorMsg = res.error;
    } else {
      errorMsg = `Unsupported queue channel: ${channel}`;
    }
  } catch (err) {
    errorMsg = err.message || 'Worker execution error';
  }

  const nextAttempts = item.attempts + 1;

  // Audit log for this retry attempt
  await notificationRepository.createLog({
    notificationId: item.notificationId,
    recipientId: payload.recipientId,
    channel,
    provider: providerName,
    status: success ? 'success' : 'failed',
    error: errorMsg || null,
    attempts: nextAttempts,
  });

  if (success) {
    log.info(`Queue Worker: Item ${item._id} sent successfully.`);
    
    // Update queue status
    await queueRepository.updateQueueItem(item._id, {
      status: 'sent', // successfully completed
      attempts: nextAttempts,
      error: null,
    });

    // Update main notification
    await notificationRepository.update(item.notificationId, {
      status: STATUS.SENT,
      sentAt: new Date(),
    });

    // Complete any pending retry schedules
    const retries = await queueRepository.findRetries({ queueItemId: item._id, status: RETRY_STATUS.PENDING });
    for (const r of retries) {
      r.status = RETRY_STATUS.COMPLETED;
      await r.save();
    }

  } else {
    log.warn(`Queue Worker: Item ${item._id} failed to send. Error: ${errorMsg}`);

    if (nextAttempts < item.maxAttempts) {
      const backoffDelay = calculateBackoff(nextAttempts);
      const nextRunAt = new Date(Date.now() + backoffDelay);

      await queueRepository.updateQueueItem(item._id, {
        status: QUEUE_STATUS.PENDING,
        attempts: nextAttempts,
        nextRunAt,
        error: errorMsg,
      });

      // Create a Retry schedule record
      await queueRepository.createRetry({
        queueItemId: item._id,
        attemptNumber: nextAttempts,
        scheduledFor: nextRunAt,
        reason: errorMsg,
        status: RETRY_STATUS.PENDING,
      });

      log.info(`Queue Worker: Scheduled retry attempt ${nextAttempts + 1} for item ${item._id} at ${nextRunAt.toISOString()}`);
    } else {
      log.error(`Queue Worker: Item ${item._id} has exceeded max attempts (${item.maxAttempts}). Sending to DLQ.`);

      await queueRepository.updateQueueItem(item._id, {
        status: QUEUE_STATUS.DLQ,
        attempts: nextAttempts,
        error: `Max attempts exceeded. Last error: ${errorMsg}`,
      });

      // Update main notification status to failed
      await notificationRepository.update(item.notificationId, {
        status: STATUS.FAILED,
      });

      // Mark any pending retry schedules as failed
      const retries = await queueRepository.findRetries({ queueItemId: item._id, status: RETRY_STATUS.PENDING });
      for (const r of retries) {
        r.status = RETRY_STATUS.FAILED;
        await r.save();
      }
    }
  }
}

/**
 * Starts the background queue worker loop.
 */
export function startQueueWorker() {
  const pollInterval = parseInt(environment.QUEUE_POLL_INTERVAL_MS, 10) || 5000;
  log.info(`Queue Worker starting... Polling every ${pollInterval}ms`);
  
  // Run immediately on boot
  processQueue();

  workerIntervalId = setInterval(processQueue, pollInterval);
}

/**
 * Stops the background queue worker loop.
 */
export function stopQueueWorker() {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    log.info('Queue Worker stopped.');
  }
}

export default {
  startQueueWorker,
  stopQueueWorker,
  processQueue,
};
