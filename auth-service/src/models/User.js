/**
 * @fileoverview User Model Schema
 * @module models/User
 *
 * Defines the User collection, combining security-focused fields (hashing, roles, sessions)
 * with legacy profile fields for full backwards-compatibility.
 */

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // ─── Authentication Fields ──────────────────────────────────────
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: false, // Optional for OAuth / federated users if applicable
    },
    uid: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['seeker', 'recruiter', 'admin'],
      default: 'seeker',
      index: true,
    },
    
    // ─── Multi-Tenancy & Authorization References ───────────────────
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    roleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
    },

    // ─── Legacy Profile Fields ──────────────────────────────────────
    name: {
      type: String,
      trim: true,
    },
    profilePic: {
      type: String,
      default: '',
    },
    designation: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    company: {
      name: { type: String, default: '' },
      website: { type: String, default: '' },
      industry: { type: String, default: '' },
      size: { type: String, default: '' },
      description: { type: String, default: '' },
    },
    skills: {
      type: [String],
      default: [],
    },
    education: [
      {
        institution: { type: String, default: '' },
        degree: { type: String, default: '' },
        year: { type: String, default: '' },
      },
    ],
    experience: [
      {
        company: { type: String, default: '' },
        role: { type: String, default: '' },
        duration: { type: String, default: '' },
        description: { type: String, default: '' },
      },
    ],
    languages: {
      type: [String],
      default: [],
    },
    projects: [
      {
        name: { type: String, default: '' },
        tech: { type: [String], default: [] },
        role: { type: String, default: '' },
        description: { type: String, default: '' },
      },
    ],
    professionalProfiles: [
      {
        platform: { type: String, default: '' },
        url: { type: String, default: '' },
      },
    ],
    bio: {
      type: String,
      default: '',
    },
    resumeUrl: {
      type: String,
      default: '',
    },
    githubUrl: {
      type: String,
      default: '',
    },
    linkedinUrl: {
      type: String,
      default: '',
    },
    hiringPattern: {
      type: String,
      default: '',
    },
    isPro: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
export { User };
