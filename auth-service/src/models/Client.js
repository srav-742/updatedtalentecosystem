/**
 * @fileoverview Client Model Schema
 * @module models/Client
 *
 * Defines the Client collection for recruiter API credentials.
 */

import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientSecret: {
      type: String,
      required: true, // Hashed using bcrypt
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Client = mongoose.model('Client', clientSchema);

export default Client;
export { Client };
