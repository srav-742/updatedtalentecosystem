import mongoose from 'mongoose';

const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, required: true },
    role: { type: String, required: true, index: true },
    tenantId: { type: String, default: null, index: true },
    organizationId: { type: String, default: null, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);
