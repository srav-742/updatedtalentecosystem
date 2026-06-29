import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';
import { CHANNELS } from '../constants/notification.constants.js';

const notificationLogSchema = new mongoose.Schema(
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
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(CHANNELS),
      required: true,
    },
    provider: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true,
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 1,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

notificationLogSchema.virtual('id').get(function () {
  return this._id;
});

notificationLogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
export default NotificationLog;
