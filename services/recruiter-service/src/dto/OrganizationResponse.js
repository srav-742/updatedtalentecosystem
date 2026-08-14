export class OrganizationResponse {
  static fromEntity(entity, branding = null) {
    if (!entity) return null;

    const data = typeof entity.toJSON === 'function' ? entity.toJSON() : entity;
    const brandData = branding && typeof branding.toJSON === 'function' ? branding.toJSON() : branding;

    const response = {
      id: data.id || data._id,
      name: data.name,
      code: data.code || '',
      description: data.description || '',
      ownerId: data.ownerId,
      billingEmail: data.billingEmail || '',
      isActive: !!data.isActive,
      createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : null,
      updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
    };

    if (brandData) {
      response.branding = {
        primaryColor: brandData.primaryColor || '#0070f3',
        secondaryColor: brandData.secondaryColor || '#000000',
        logoUrl: brandData.logoUrl || '',
        bannerUrl: brandData.bannerUrl || '',
        customDomain: brandData.customDomain || '',
        socialLinks: {
          linkedin: brandData.socialLinks?.linkedin || '',
          twitter: brandData.socialLinks?.twitter || '',
          website: brandData.socialLinks?.website || '',
        },
      };
    }

    return response;
  }
}

export default OrganizationResponse;
