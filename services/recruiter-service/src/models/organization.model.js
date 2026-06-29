import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';

const organizationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    billingEmail: {
      type: String,
      trim: true,
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

organizationSchema.virtual('id').get(function () {
  return this._id;
});

organizationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
