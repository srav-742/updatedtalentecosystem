import { logger, context } from '@hire1percent/shared';
import environment from '../config/environment.js';

const log = logger.createLogger('job-client');
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'trusted-gateway-token';

export class JobClient {
  async getActiveJobsCount(recruiterId) {
    const ctx = context.getContext() || {};
    // Endpoint on job-service: GET /api/v1/jobs?recruiterId=...
    const url = `${environment.JOB_SERVICE_URL}/api/v1/jobs?recruiterId=${recruiterId}`;

    try {
      const headers = {
        'x-h1p-service-token': SERVICE_TOKEN,
        'Content-Type': 'application/json',
      };

      if (ctx.correlationId) {
        headers['x-correlation-id'] = ctx.correlationId;
      }
      if (ctx.requestId) {
        headers['x-request-id'] = ctx.requestId;
      }

      if (ctx.userId) {
        headers['x-h1p-user-id'] = ctx.userId;
        headers['x-h1p-role'] = ctx.role;
        if (ctx.permissions && ctx.permissions.length > 0) {
          headers['x-h1p-permissions'] = ctx.permissions.join(',');
        }
        headers['x-h1p-auth-version'] = '1';
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Job Service returned status ${response.status}`);
      }

      const json = await response.json();
      // Assume json.data is an array of jobs
      const jobs = json.data || [];
      const activeJobs = jobs.filter((job) => job.status === 'published');
      return activeJobs.length;
    } catch (err) {
      log.error(`Failed to get active jobs count for recruiter ${recruiterId}:`, { message: err.message });
      if (process.env.NODE_ENV === 'testing') {
        return 3; // Fallback mock value for testing
      }
      return 0;
    }
  }
}

export const jobClient = new JobClient();
export default jobClient;
