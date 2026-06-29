import mongoose from 'mongoose';

const AdminSubscriptionSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    plan: { type: String, required: true },
    seats: { type: Number, default: 1 },
    status: { type: String, enum: ['trialing', 'active', 'past_due', 'cancelled'], default: 'trialing' },
    renewsAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.AdminSubscription || mongoose.model('AdminSubscription', AdminSubscriptionSchema);
