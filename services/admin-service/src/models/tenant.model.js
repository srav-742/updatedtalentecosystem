import mongoose from 'mongoose';

const AdminTenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    plan: { type: String, default: 'starter' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.AdminTenant || mongoose.model('AdminTenant', AdminTenantSchema);
