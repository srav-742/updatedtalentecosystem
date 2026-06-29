import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';

const resumeSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    candidateId: {
      type: String,
      required: true,
      unique: true, // A candidate has one active resume document which tracks versions
      index: true,
    },
    currentVersionId: {
      type: String,
      default: null,
      ref: 'ResumeVersion',
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

resumeSchema.virtual('id').get(function () {
  return this._id;
});

resumeSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;
