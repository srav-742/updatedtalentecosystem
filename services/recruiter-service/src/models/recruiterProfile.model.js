import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';

const recruiterProfileSchema = new mongoose.Schema(
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
    basics: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, trim: true, index: true },
      phone: { type: String, trim: true },
      designation: { type: String, trim: true },
      profilePic: { type: String, trim: true },
    },
    company: {
      name: { type: String, trim: true },
      website: { type: String, trim: true },
      logo: { type: String, trim: true },
      description: { type: String, trim: true },
    },
    organizationId: {
      type: String,
      index: true,
      default: null,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    profileCompletion: {
      type: Number,
      default: 0,
    },
    settings: {
      emailNotifications: { type: Boolean, default: true },
      theme: { type: String, default: 'light' },
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

recruiterProfileSchema.virtual('id').get(function () {
  return this._id;
});

recruiterProfileSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const RecruiterProfile = mongoose.model('RecruiterProfile', recruiterProfileSchema);
export default RecruiterProfile;
