import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';
import { QUEUE_STATUS } from '../constants/notification.constants.js';

const notificationQueueSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    notificationId: {
      type: String,
      required: true,
      ref: 'Notification',
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(QUEUE_STATUS),
      default: QUEUE_STATUS.PENDING,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    nextRunAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

notificationQueueSchema.virtual('id').get(function () {
  return this._id;
});

notificationQueueSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const NotificationQueue = mongoose.model('NotificationQueue', notificationQueueSchema);
export default NotificationQueue;
