import CompanyBranding from '../models/companyBranding.model.js';

export class CompanyBrandingRepository {
  async findByOrganizationId(organizationId) {
    return CompanyBranding.findOne({ organizationId });
  }

  async create(data) {
    const branding = new CompanyBranding(data);
    return branding.save();
  }

  async update(organizationId, data) {
    return CompanyBranding.findOneAndUpdate(
      { organizationId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }
}

export const companyBrandingRepository = new CompanyBrandingRepository();
export default companyBrandingRepository;
