import mongoose from 'mongoose';

const PlatformSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    secure: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.PlatformSetting || mongoose.model('PlatformSetting', PlatformSettingSchema);
