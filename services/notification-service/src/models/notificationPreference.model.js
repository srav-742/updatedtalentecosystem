import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';

const notificationPreferenceSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: Boolean,
      default: true,
    },
    sms: {
      type: Boolean,
      default: true,
    },
    push: {
      type: Boolean,
      default: true,
    },
    inApp: {
      type: Boolean,
      default: true,
    },
    eventPreferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Format: { JOB_CREATED: { email: true, sms: false, push: true, inApp: true } }
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

notificationPreferenceSchema.virtual('id').get(function () {
  return this._id;
});

notificationPreferenceSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);
export default NotificationPreference;
