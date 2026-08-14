import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';

const subscriptionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    organizationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'growth', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'trialing'],
      default: 'active',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

subscriptionSchema.virtual('id').get(function () {
  return this._id;
});

subscriptionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
