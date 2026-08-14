import mongoose from 'mongoose';

const FeatureFlagSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    rules: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.FeatureFlag || mongoose.model('FeatureFlag', FeatureFlagSchema);
