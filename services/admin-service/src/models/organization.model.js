import mongoose from 'mongoose';

const AdminOrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.AdminOrganization || mongoose.model('AdminOrganization', AdminOrganizationSchema);
