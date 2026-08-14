import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';
import { CHANNELS, STATUS } from '../constants/notification.constants.js';

const notificationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      trim: true,
    },
    recipientPhone: {
      type: String,
      trim: true,
    },
    recipientPushTokens: {
      type: [String],
      default: [],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: Object.values(CHANNELS),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.PENDING,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    templateId: {
      type: String,
      ref: 'NotificationTemplate',
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

notificationSchema.virtual('id').get(function () {
  return this._id;
});

notificationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
