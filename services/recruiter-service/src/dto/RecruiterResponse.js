export class RecruiterResponse {
  static fromEntity(entity) {
    if (!entity) return null;

    const data = typeof entity.toJSON === 'function' ? entity.toJSON() : entity;

    return {
      id: data.id || data.userId || data._id,
      userId: data.userId,
      basics: {
        name: data.basics?.name || '',
        email: data.basics?.email || '',
        phone: data.basics?.phone || '',
        designation: data.basics?.designation || '',
        profilePic: data.basics?.profilePic || '',
      },
      company: {
        name: data.company?.name || '',
        website: data.company?.website || '',
        logo: data.company?.logo || '',
        description: data.company?.description || '',
      },
      organizationId: data.organizationId || null,
      role: data.role || 'member',
      isActive: !!data.isActive,
      profileCompletion: data.profileCompletion || 0,
      settings: {
        emailNotifications: data.settings?.emailNotifications !== false,
        theme: data.settings?.theme || 'light',
      },
      createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : null,
      updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
    };
  }

  static fromEntities(entities = []) {
    return entities.map((e) => RecruiterResponse.fromEntity(e));
  }
}

export default RecruiterResponse;
