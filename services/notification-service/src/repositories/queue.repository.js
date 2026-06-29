import NotificationQueue from '../models/notificationQueue.model.js';
import NotificationRetry from '../models/notificationRetry.model.js';

export class QueueRepository {
  async enqueue(data) {
    const item = new NotificationQueue(data);
    return await item.save();
  }

  async findById(id) {
    return await NotificationQueue.findById(id);
  }

  async findPendingToRun(now = new Date()) {
    return await NotificationQueue.find({
      status: 'pending',
      nextRunAt: { $lte: now },
    }).sort({ nextRunAt: 1 });
  }

  async updateQueueItem(id, data) {
    return await NotificationQueue.findByIdAndUpdate(id, data, { new: true });
  }

  // Retry operations
  async createRetry(data) {
    const retry = new NotificationRetry(data);
    return await retry.save();
  }

  async findRetries(filter = {}) {
    return await NotificationRetry.find(filter).sort({ scheduledFor: 1 });
  }
}

export const queueRepository = new QueueRepository();
export default queueRepository;
