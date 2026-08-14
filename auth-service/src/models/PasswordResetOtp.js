/**
 * @fileoverview Password Reset OTP Model Schema
 * @module models/PasswordResetOtp
 *
 * Defines the PasswordResetOtp collection for handling temporary OTP codes.
 */

import mongoose from 'mongoose';

const passwordResetOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true, // Hashed using bcrypt
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expiresAfterSeconds: 0 }, // Automatically expires the document
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const PasswordResetOtp = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);

export default PasswordResetOtp;
export { PasswordResetOtp };
