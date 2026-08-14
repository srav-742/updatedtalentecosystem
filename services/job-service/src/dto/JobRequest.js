export class JobRequest {
  static fromRequest(body = {}) {
    return {
      title: body.title,
      description: body.description,
      employmentType: body.employmentType || 'full-time',
      experienceLevel: body.experienceLevel || 'mid',
      location: body.location,
      salary: body.salary || null,
      skills: Array.isArray(body.skills) ? body.skills : [],
      department: body.department || null,
      visibility: body.visibility || 'public',
    };
  }
}

export default JobRequest;
