export class CandidateRequest {
  static fromRequest(body = {}) {
    return {
      basics: {
        name: body.basics?.name || undefined,
        email: body.basics?.email || undefined,
        phone: body.basics?.phone || null,
        location: body.basics?.location || null,
        bio: body.basics?.bio || null,
        profilePic: body.basics?.profilePic || null,
      },
      skills: Array.isArray(body.skills) ? body.skills : [],
      experience: Array.isArray(body.experience)
        ? body.experience.map((exp) => ({
            company: exp.company,
            role: exp.role,
            location: exp.location || null,
            startDate: exp.startDate ? new Date(exp.startDate) : null,
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            currentlyWorking: !!exp.currentlyWorking,
            description: exp.description || null,
          }))
        : [],
      education: Array.isArray(body.education)
        ? body.education.map((edu) => ({
            institution: edu.institution,
            degree: edu.degree,
            fieldOfStudy: edu.fieldOfStudy || null,
            startDate: edu.startDate ? new Date(edu.startDate) : null,
            endDate: edu.endDate ? new Date(edu.endDate) : null,
            currentlyStudying: !!edu.currentlyStudying,
            grade: edu.grade || null,
          }))
        : [],
      socialLinks: {
        linkedin: body.socialLinks?.linkedin || null,
        github: body.socialLinks?.github || null,
        portfolio: body.socialLinks?.portfolio || null,
        twitter: body.socialLinks?.twitter || null,
      },
      certifications: Array.isArray(body.certifications)
        ? body.certifications.map((cert) => ({
            name: cert.name,
            issuer: cert.issuer,
            issueDate: cert.issueDate ? new Date(cert.issueDate) : null,
            expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
            credentialId: cert.credentialId || null,
            url: cert.url || null,
          }))
        : [],
      languages: Array.isArray(body.languages) ? body.languages : [],
      preferences: {
        jobTypes: Array.isArray(body.preferences?.jobTypes) ? body.preferences.jobTypes : [],
        industries: Array.isArray(body.preferences?.industries) ? body.preferences.industries : [],
        salaryExpectation: body.preferences?.salaryExpectation || null,
        locationPreference: Array.isArray(body.preferences?.locationPreference)
          ? body.preferences.locationPreference
          : [],
      },
      visibility: body.visibility || 'public',
    };
  }
}

export default CandidateRequest;
