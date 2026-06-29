import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';

const candidateProfileSchema = new mongoose.Schema(
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
      location: { type: String, trim: true },
      bio: { type: String, trim: true },
      profilePic: { type: String, trim: true },
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: [
      {
        company: { type: String, required: true },
        role: { type: String, required: true },
        location: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        currentlyWorking: { type: Boolean, default: false },
        description: { type: String },
      },
    ],
    education: [
      {
        institution: { type: String, required: true },
        degree: { type: String, required: true },
        fieldOfStudy: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        currentlyStudying: { type: Boolean, default: false },
        grade: { type: String },
      },
    ],
    socialLinks: {
      linkedin: { type: String, trim: true },
      github: { type: String, trim: true },
      portfolio: { type: String, trim: true },
      twitter: { type: String, trim: true },
    },
    certifications: [
      {
        name: { type: String, required: true },
        issuer: { type: String, required: true },
        issueDate: { type: Date },
        expiryDate: { type: Date },
        credentialId: { type: String },
        url: { type: String },
      },
    ],
    languages: {
      type: [String],
      default: [],
    },
    profileCompletion: {
      type: Number,
      default: 0,
    },
    preferences: {
      jobTypes: { type: [String], default: [] },
      industries: { type: [String], default: [] },
      salaryExpectation: { type: String },
      locationPreference: { type: [String], default: [] },
    },
    visibility: {
      type: String,
      enum: ['public', 'anonymous', 'private'],
      default: 'public',
    },
    bookmarkedJobs: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

candidateProfileSchema.virtual('id').get(function () {
  return this._id;
});

candidateProfileSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const CandidateProfile = mongoose.model('CandidateProfile', candidateProfileSchema);
export default CandidateProfile;
