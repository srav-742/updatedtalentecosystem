import test from 'node:test';
import assert from 'node:assert';
import { jobController } from '../../src/controllers/job.controller.js';
import jobService from '../../src/services/job.service.js';

test('JobController: create maps request and calls service', async (t) => {
  let createdPayload = null;
  let userCtx = null;
  
  t.mock.method(jobService, 'createJob', async (data, user) => {
    createdPayload = data;
    userCtx = user;
    return {
      id: 'job_1',
      title: data.title,
      description: data.description,
      recruiterId: 'rec_1',
      organizationId: 'org_1',
      tenantId: 'tenant_1',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const req = {
    body: { title: 'Developer', description: 'Code', extraField: 'unsupported' },
    user: { userId: 'rec_1', role: 'recruiter', organizationId: 'org_1', tenantId: 'tenant_1' },
  };

  const mockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  await jobController.create(req, mockRes, (err) => {
    assert.fail('Next should not be called: ' + err.message);
  });

  assert.strictEqual(mockRes.statusCode, 201);
  assert.strictEqual(mockRes.body.success, true);
  assert.strictEqual(mockRes.body.data.title, 'Developer');
  assert.strictEqual(mockRes.body.data.description, 'Code');
  assert.strictEqual(mockRes.body.data.extraField, undefined);
  assert.strictEqual(createdPayload.extraField, undefined);
  assert.strictEqual(userCtx.userId, 'rec_1');
});
