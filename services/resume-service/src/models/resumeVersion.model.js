import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';

const educationSchema = new mongoose.Schema({
  institution: { type: String, trim: true },
  degree: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
});

const experienceSchema = new mongoose.Schema({
  company: { type: String, trim: true },
  position: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  description: { type: String, trim: true },
});

const metadataSchema = new mongoose.Schema({
  rawTextLength: { type: Number },
  pageCount: { type: Number },
  language: { type: String, default: 'en' },
  parserModel: { type: String },
});

const resumeVersionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    resumeId: {
      type: String,
      required: true,
      index: true,
      ref: 'Resume',
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    fileId: {
      type: String,
      required: true,
      ref: 'ResumeFile',
    },
    metadata: {
      type: metadataSchema,
      default: () => ({}),
    },
    skills: {
      type: [String],
      default: [],
    },
    education: {
      type: [educationSchema],
      default: [],
    },
    experience: {
      type: [experienceSchema],
      default: [],
    },
    uploadedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

// Compound index to guarantee uniqueness of versions per resume
resumeVersionSchema.index({ resumeId: 1, versionNumber: 1 }, { unique: true });

resumeVersionSchema.virtual('id').get(function () {
  return this._id;
});

resumeVersionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const ResumeVersion = mongoose.model('ResumeVersion', resumeVersionSchema);
export default ResumeVersion;
