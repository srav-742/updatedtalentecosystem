import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';

const resumeFileSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    resumeId: {
      type: String,
      required: true,
      index: true,
    },
    versionId: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileKey: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    storageProvider: {
      type: String,
      required: true,
      enum: ['local', 's3', 'azure', 'gcs'],
      default: 'local',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

resumeFileSchema.virtual('id').get(function () {
  return this._id;
});

resumeFileSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const ResumeFile = mongoose.model('ResumeFile', resumeFileSchema);
export default ResumeFile;
