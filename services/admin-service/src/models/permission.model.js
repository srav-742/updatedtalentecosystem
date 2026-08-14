import mongoose from 'mongoose';

const PermissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.AdminPermission || mongoose.model('AdminPermission', PermissionSchema);
