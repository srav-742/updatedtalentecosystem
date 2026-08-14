/**
 * @fileoverview Tenant Model Schema
 * @module models/Tenant
 *
 * Defines the Tenant collection for multi-tenancy.
 */

import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    domain: {
      type: String,
      trim: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Tenant = mongoose.model('Tenant', tenantSchema);

export default Tenant;
export { Tenant };
