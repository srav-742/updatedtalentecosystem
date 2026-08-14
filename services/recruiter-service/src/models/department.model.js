import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';

const departmentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: '',
    },
    managerId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

departmentSchema.virtual('id').get(function () {
  return this._id;
});

departmentSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Department = mongoose.model('Department', departmentSchema);
export default Department;
