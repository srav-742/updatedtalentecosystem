import mongoose from 'mongoose';

const AnalyticsEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    subjectId: { type: String, default: null, index: true },
    tenantId: { type: String, default: null, index: true },
    organizationId: { type: String, default: null, index: true },
    value: { type: Number, default: 1 },
    dimensions: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', AnalyticsEventSchema);
