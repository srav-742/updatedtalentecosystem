export class RecruiterRequest {
  static fromRequest(body = {}) {
    return {
      basics: {
        name: body.basics?.name || undefined,
        email: body.basics?.email || undefined,
        phone: body.basics?.phone || null,
        designation: body.basics?.designation || null,
        profilePic: body.basics?.profilePic || null,
      },
      company: {
        name: body.company?.name || null,
        website: body.company?.website || null,
        logo: body.company?.logo || null,
        description: body.company?.description || null,
      },
      settings: {
        emailNotifications: body.settings?.emailNotifications !== false,
        theme: body.settings?.theme || 'light',
      },
    };
  }
}

export default RecruiterRequest;
