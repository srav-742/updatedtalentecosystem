import Notification from '../models/notification.model.js';
import NotificationLog from '../models/notificationLog.model.js';

export class NotificationRepository {
  async create(data) {
    const notification = new Notification(data);
    return await notification.save();
  }

  async findById(id) {
    return await Notification.findById(id);
  }

  async find(filter = {}) {
    return await Notification.find(filter).sort({ createdAt: -1 });
  }

  async update(id, data) {
    return await Notification.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return await Notification.findByIdAndDelete(id);
  }

  // Log operations
  async createLog(data) {
    const log = new NotificationLog(data);
    return await log.save();
  }

  async findLogs(filter = {}) {
    return await NotificationLog.find(filter).sort({ sentAt: -1 });
  }
}

export const notificationRepository = new NotificationRepository();
export default notificationRepository;
