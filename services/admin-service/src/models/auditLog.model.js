import mongoose from 'mongoose';

const AdminAuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: String, default: 'system', index: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, default: null },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.AdminAuditLog || mongoose.model('AdminAuditLog', AdminAuditLogSchema);
