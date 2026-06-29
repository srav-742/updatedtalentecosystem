import mongoose from 'mongoose';

const AdminRoleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    permissions: [{ type: String }],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.AdminRole || mongoose.model('AdminRole', AdminRoleSchema);
