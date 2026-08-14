/**
 * @fileoverview Audit Log Model Schema
 * @module models/AuditLog
 *
 * Defines the AuditLog collection to log critical security-sensitive operations
 * for compliance and forensics.
 */

import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      required: true,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false, // Audit logs are write-once records
    },
  }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
export { AuditLog };
