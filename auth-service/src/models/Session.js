/**
 * @fileoverview Session Model Schema
 * @module models/Session
 *
 * Defines the Session collection mapping a User to their active opaque login tokens.
 */

import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      default: '',
      index: true,
    },
    device: {
      type: String,
      default: '',
    },
    browser: {
      type: String,
      default: '',
    },
    ip: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    tokenVersion: {
      type: Number,
      default: 1,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Session = mongoose.model('Session', sessionSchema);

export default Session;
export { Session };
