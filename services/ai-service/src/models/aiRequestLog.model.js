import mongoose from 'mongoose';

const AiRequestLogSchema = new mongoose.Schema(
  {
    operation: { type: String, required: true, index: true },
    provider: { type: String, required: true, index: true },
    status: { type: String, enum: ['succeeded', 'failed'], default: 'succeeded' },
    latencyMs: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.AiRequestLog || mongoose.model('AiRequestLog', AiRequestLogSchema);
