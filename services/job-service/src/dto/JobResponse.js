export class JobResponse {
  static fromEntity(job) {
    if (!job) return null;
    return {
      id: job.id || job._id,
      title: job.title,
      description: job.description,
      employmentType: job.employmentType,
      experienceLevel: job.experienceLevel,
      location: job.location,
      salary: job.salary,
      skills: job.skills,
      department: job.department,
      status: job.status,
      visibility: job.visibility,
      organizationId: job.organizationId,
      tenantId: job.tenantId,
      recruiterId: job.recruiterId,
      createdBy: job.createdBy,
      updatedBy: job.updatedBy,
      publishedAt: job.publishedAt,
      archivedAt: job.archivedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  static fromEntities(jobs) {
    if (!Array.isArray(jobs)) return [];
    return jobs.map(JobResponse.fromEntity);
  }
}

export default JobResponse;
