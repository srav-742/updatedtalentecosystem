import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';

const jobSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    employmentType: {
      type: String,
      required: true,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary'],
      default: 'full-time',
    },
    experienceLevel: {
      type: String,
      required: true,
      enum: ['junior', 'mid', 'senior', 'lead', 'executive'],
      default: 'mid',
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    salary: {
      type: String,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    department: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    visibility: {
      type: String,
      required: true,
      enum: ['public', 'internal', 'private'],
      default: 'public',
    },
    organizationId: {
      type: String,
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
    },
    recruiterId: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
    },
    publishedAt: {
      type: Date,
    },
    archivedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

jobSchema.virtual('id').get(function () {
  return this._id;
});

jobSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Job = mongoose.model('Job', jobSchema);
export default Job;
