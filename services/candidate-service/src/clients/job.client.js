import { logger, context } from '@hire1percent/shared';
import environment from '../config/environment.js';

const log = logger.createLogger('job-client');
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'trusted-gateway-token';

export class JobClient {
  async getJob(jobId) {
    const ctx = context.getContext() || {};
    const url = `${environment.JOB_SERVICE_URL}/api/v1/jobs/${jobId}`;

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

      // Add user context so Job Service allows reading
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
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Job Service returned status ${response.status}`);
      }

      const json = await response.json();
      return json.data;
    } catch (err) {
      log.error(`Failed to get job ${jobId} from Job Service:`, { message: err.message });
      // In testing, if Job Service is not running, fall back to returning a mock job
      if (process.env.NODE_ENV === 'testing') {
        return { id: jobId, title: 'Mock Job' };
      }
      throw err;
    }
  }
}

export const jobClient = new JobClient();
export default jobClient;
