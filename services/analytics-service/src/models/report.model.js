import mongoose from 'mongoose';

const AnalyticsReportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true, index: true },
    period: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], default: 'monthly' },
    filters: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    generatedBy: { type: String, default: 'system' },
  },
  { timestamps: true }
);

export default mongoose.models.AnalyticsReport || mongoose.model('AnalyticsReport', AnalyticsReportSchema);
