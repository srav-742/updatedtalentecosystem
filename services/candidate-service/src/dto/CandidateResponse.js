export class CandidateResponse {
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
        location: data.basics?.location || '',
        bio: data.basics?.bio || '',
        profilePic: data.basics?.profilePic || '',
      },
      skills: data.skills || [],
      experience: (data.experience || []).map((exp) => ({
        id: exp._id || exp.id,
        company: exp.company,
        role: exp.role,
        location: exp.location || '',
        startDate: exp.startDate ? new Date(exp.startDate).toISOString() : null,
        endDate: exp.endDate ? new Date(exp.endDate).toISOString() : null,
        currentlyWorking: !!exp.currentlyWorking,
        description: exp.description || '',
      })),
      education: (data.education || []).map((edu) => ({
        id: edu._id || edu.id,
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.fieldOfStudy || '',
        startDate: edu.startDate ? new Date(edu.startDate).toISOString() : null,
        endDate: edu.endDate ? new Date(edu.endDate).toISOString() : null,
        currentlyStudying: !!edu.currentlyStudying,
        grade: edu.grade || '',
      })),
      socialLinks: {
        linkedin: data.socialLinks?.linkedin || '',
        github: data.socialLinks?.github || '',
        portfolio: data.socialLinks?.portfolio || '',
        twitter: data.socialLinks?.twitter || '',
      },
      certifications: (data.certifications || []).map((cert) => ({
        id: cert._id || cert.id,
        name: cert.name,
        issuer: cert.issuer,
        issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString() : null,
        expiryDate: cert.expiryDate ? new Date(cert.expiryDate).toISOString() : null,
        credentialId: cert.credentialId || '',
        url: cert.url || '',
      })),
      languages: data.languages || [],
      profileCompletion: data.profileCompletion || 0,
      preferences: {
        jobTypes: data.preferences?.jobTypes || [],
        industries: data.preferences?.industries || [],
        salaryExpectation: data.preferences?.salaryExpectation || '',
        locationPreference: data.preferences?.locationPreference || [],
      },
      visibility: data.visibility || 'public',
      bookmarkedJobs: data.bookmarkedJobs || [],
      createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : null,
      updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
    };
  }

  static fromEntities(entities = []) {
    return entities.map((e) => CandidateResponse.fromEntity(e));
  }
}

export default CandidateResponse;
