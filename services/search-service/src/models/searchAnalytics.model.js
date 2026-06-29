import mongoose from 'mongoose';

const SearchAnalyticsSchema = new mongoose.Schema(
  {
    query: { type: String, default: '' },
    type: { type: String, default: 'global', index: true },
    filters: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    resultCount: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    userId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.SearchAnalytics || mongoose.model('SearchAnalytics', SearchAnalyticsSchema);
