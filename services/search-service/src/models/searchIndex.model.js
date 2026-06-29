import mongoose from 'mongoose';

const SearchIndexSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['jobs', 'candidates', 'recruiters', 'organizations', 'resumes'],
      required: true,
      index: true,
    },
    sourceId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    facets: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    indexedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SearchIndexSchema.index({ type: 1, sourceId: 1 }, { unique: true });

export default mongoose.models.SearchIndex || mongoose.model('SearchIndex', SearchIndexSchema);
