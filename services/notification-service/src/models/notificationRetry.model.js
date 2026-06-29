import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';
import { RETRY_STATUS } from '../constants/notification.constants.js';

const notificationRetrySchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    queueItemId: {
      type: String,
      required: true,
      ref: 'NotificationQueue',
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(RETRY_STATUS),
      default: RETRY_STATUS.PENDING,
      index: true,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

notificationRetrySchema.virtual('id').get(function () {
  return this._id;
});

notificationRetrySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const NotificationRetry = mongoose.model('NotificationRetry', notificationRetrySchema);
export default NotificationRetry;
