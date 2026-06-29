import mongoose from 'mongoose';

const EmbeddingSchema = new mongoose.Schema(
  {
    sourceType: { type: String, required: true, index: true },
    sourceId: { type: String, required: true, index: true },
    model: { type: String, required: true },
    vector: [{ type: Number }],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

EmbeddingSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });

export default mongoose.models.AiEmbedding || mongoose.model('AiEmbedding', EmbeddingSchema);
