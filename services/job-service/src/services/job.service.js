import jobRepository from '../repositories/JobRepository.js';
import { errors } from '@hire1percent/shared';

export class JobService {
  async createJob(jobData, userContext) {
    if (!userContext || !userContext.userId) {
      throw new errors.AuthenticationError('Authentication required to create a job');
    }

    const payload = {
      ...jobData,
      recruiterId: userContext.userId,
      organizationId: userContext.organizationId || 'default-org',
      tenantId: userContext.tenantId || 'default-tenant',
      createdBy: userContext.userId,
      updatedBy: userContext.userId,
      status: 'draft',
    };

    return jobRepository.create(payload);
  }

  async getJobById(id, userContext) {
    const job = await jobRepository.findById(id);
    if (!job) {
      throw new errors.NotFoundError(`Job with ID ${id} not found`);
    }

    if (job.status !== 'published') {
      this.checkOwnership(job, userContext);
    }

    return job;
  }

  async updateJob(id, jobData, userContext) {
    const job = await this.getJobById(id, userContext);
    this.checkOwnership(job, userContext);

    const payload = {
      ...jobData,
      updatedBy: userContext.userId,
    };

    return jobRepository.update(id, payload);
  }

  async deleteJob(id, userContext) {
    const job = await this.getJobById(id, userContext);
    this.checkOwnership(job, userContext);

    await jobRepository.delete(id);
    return { success: true };
  }

  async publishJob(id, userContext) {
    const job = await this.getJobById(id, userContext);
    this.checkOwnership(job, userContext);

    if (job.status === 'published') {
      throw new errors.ConflictError('Job is already published');
    }
    if (job.status === 'archived') {
      throw new errors.ConflictError('Cannot publish an archived job');
    }

    return jobRepository.publish(id, userContext.userId);
  }

  async archiveJob(id, userContext) {
    const job = await this.getJobById(id, userContext);
    this.checkOwnership(job, userContext);

    if (job.status === 'archived') {
      throw new errors.ConflictError('Job is already archived');
    }

    return jobRepository.archive(id, userContext.userId);
  }

  async listJobs(filters = {}, userContext) {
    const queryFilters = { ...filters };
    
    if (!userContext || (userContext.role !== 'admin' && userContext.role !== 'super_admin')) {
      queryFilters.status = 'published';
      queryFilters.visibility = 'public';
    } else {
      if (userContext.organizationId) {
        queryFilters.organizationId = userContext.organizationId;
      }
    }

    return jobRepository.search(queryFilters);
  }

  checkOwnership(job, userContext) {
    if (!userContext || !userContext.userId) {
      throw new errors.AuthenticationError('Authentication context required');
    }

    const isAdmin = userContext.role === 'admin' || userContext.role === 'super_admin';
    const isOwner = job.recruiterId === userContext.userId;
    const isSameOrg = job.organizationId === userContext.organizationId;

    if (!isAdmin && !isOwner && !isSameOrg) {
      throw new errors.AuthorizationError('You do not have permission to access or modify this job.');
    }
  }
}

export const jobService = new JobService();
export default jobService;
