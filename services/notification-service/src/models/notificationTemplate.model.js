import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';
import { CHANNELS } from '../constants/notification.constants.js';

const notificationTemplateSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    titleTemplate: {
      type: String,
      required: true,
    },
    bodyTemplate: {
      type: String,
      required: true,
    },
    channels: {
      type: [String],
      enum: Object.values(CHANNELS),
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

notificationTemplateSchema.virtual('id').get(function () {
  return this._id;
});

notificationTemplateSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
export default NotificationTemplate;
