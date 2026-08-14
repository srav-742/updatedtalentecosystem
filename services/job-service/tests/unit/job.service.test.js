import test from 'node:test';
import assert from 'node:assert';
import { JobService } from '../../src/services/job.service.js';
import jobRepository from '../../src/repositories/JobRepository.js';

test('JobService: createJob adds default values and creates job', async (t) => {
  let savedData = null;
  
  t.mock.method(jobRepository, 'create', async (data) => {
    savedData = data;
    return { id: 'job_123', ...data };
  });

  const service = new JobService();
  const userContext = { userId: 'recruiter_abc', organizationId: 'org_xyz', tenantId: 'tenant_1' };
  const input = { title: 'Engineer', description: 'Write code', location: 'Remote' };
  
  const res = await service.createJob(input, userContext);

  assert.strictEqual(res.id, 'job_123');
  assert.strictEqual(savedData.recruiterId, 'recruiter_abc');
  assert.strictEqual(savedData.status, 'draft');
});

test('JobService: checkOwnership permits admin, owner, and same org member, and rejects strangers', (t) => {
  const service = new JobService();
  const job = { recruiterId: 'user_1', organizationId: 'org_1' };

  // Owner succeeds
  assert.doesNotThrow(() => {
    service.checkOwnership(job, { userId: 'user_1', role: 'recruiter', organizationId: 'org_1' });
  });

  // Admin succeeds
  assert.doesNotThrow(() => {
    service.checkOwnership(job, { userId: 'admin_1', role: 'admin', organizationId: 'org_other' });
  });

  // Same org member succeeds
  assert.doesNotThrow(() => {
    service.checkOwnership(job, { userId: 'user_other', role: 'recruiter', organizationId: 'org_1' });
  });

  // Stranger fails
  assert.throws(() => {
    service.checkOwnership(job, { userId: 'stranger_1', role: 'candidate', organizationId: 'org_other' });
  }, /You do not have permission/);
});
