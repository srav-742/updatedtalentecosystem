import mongoose from 'mongoose';
import { utils } from '@hire1percent/shared';

const companyBrandingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: utils.generateUuid,
    },
    organizationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    primaryColor: {
      type: String,
      default: '#0070f3',
      trim: true,
    },
    secondaryColor: {
      type: String,
      default: '#000000',
      trim: true,
    },
    logoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    bannerUrl: {
      type: String,
      default: '',
      trim: true,
    },
    customDomain: {
      type: String,
      trim: true,
      lowercase: true,
    },
    socialLinks: {
      linkedin: { type: String, trim: true },
      twitter: { type: String, trim: true },
      website: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

companyBrandingSchema.virtual('id').get(function () {
  return this._id;
});

companyBrandingSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const CompanyBranding = mongoose.model('CompanyBranding', companyBrandingSchema);
export default CompanyBranding;
