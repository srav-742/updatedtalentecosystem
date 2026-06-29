import jobService from '../services/job.service.js';
import JobRequest from '../dto/JobRequest.js';
import JobResponse from '../dto/JobResponse.js';
import { response } from '@hire1percent/shared';

export class JobController {
  async create(req, res, next) {
    try {
      const jobData = JobRequest.fromRequest(req.body);
      const job = await jobService.createJob(jobData, req.user);
      response.sendCreated(res, JobResponse.fromEntity(job), 'Job created successfully');
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const job = await jobService.getJobById(id, req.user);
      response.sendSuccess(res, { data: JobResponse.fromEntity(job) });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const jobData = JobRequest.fromRequest(req.body);
      const updated = await jobService.updateJob(id, jobData, req.user);
      response.sendSuccess(res, { data: JobResponse.fromEntity(updated), message: 'Job updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await jobService.deleteJob(id, req.user);
      response.sendSuccess(res, { message: 'Job deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async publish(req, res, next) {
    try {
      const { id } = req.params;
      const published = await jobService.publishJob(id, req.user);
      response.sendSuccess(res, { data: JobResponse.fromEntity(published), message: 'Job published successfully' });
    } catch (err) {
      next(err);
    }
  }

  async archive(req, res, next) {
    try {
      const { id } = req.params;
      const archived = await jobService.archiveJob(id, req.user);
      response.sendSuccess(res, { data: JobResponse.fromEntity(archived), message: 'Job archived successfully' });
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        visibility: req.query.visibility,
        q: req.query.q,
      };
      const jobs = await jobService.listJobs(filters, req.user);
      response.sendSuccess(res, { data: JobResponse.fromEntities(jobs) });
    } catch (err) {
      next(err);
    }
  }
}

export const jobController = new JobController();
export default jobController;
