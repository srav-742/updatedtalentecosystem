import '../setup.js';
import test from 'node:test';
import assert from 'node:assert';
import { RecruiterController } from '../../src/controllers/recruiter.controller.js';
import recruiterService from '../../src/services/recruiter.service.js';

test('RecruiterController: getOwnProfile returns formatted profile response', async (t) => {
  t.mock.method(recruiterService, 'getProfile', async (userId, userContext) => {
    return {
      userId,
      basics: { name: 'Bob', email: 'bob@example.com' },
      company: { name: 'Bob HR Inc' },
      profileCompletion: 30,
    };
  });

  const req = {
    user: { userId: 'bob_123', role: 'recruiter', email: 'bob@example.com' },
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
    },
  };

  const controller = new RecruiterController();
  await controller.getOwnProfile(req, mockRes, (err) => {
    assert.fail('Next called: ' + err.message);
  });

  assert.strictEqual(mockRes.statusCode, 200);
  assert.strictEqual(mockRes.body.success, true);
  assert.strictEqual(mockRes.body.data.id, 'bob_123');
  assert.strictEqual(mockRes.body.data.basics.name, 'Bob');
  assert.strictEqual(mockRes.body.data.company.name, 'Bob HR Inc');
  assert.strictEqual(mockRes.body.data.profileCompletion, 30);
});

test('RecruiterController: updateOwnProfile maps request and updates', async (t) => {
  let updatePayload = null;

  t.mock.method(recruiterService, 'updateProfile', async (userId, data, userContext) => {
    updatePayload = data;
    return {
      userId,
      ...data,
      profileCompletion: 60,
    };
  });

  const req = {
    user: { userId: 'bob_123', role: 'recruiter' },
    body: {
      basics: { name: 'Bob Smith', email: 'bob@example.com' },
      company: { name: 'Acme LLC' },
      extraKey: 'should_strip',
    },
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
    },
  };

  const controller = new RecruiterController();
  await controller.updateOwnProfile(req, mockRes, (err) => {
    assert.fail('Next called: ' + err.message);
  });

  assert.strictEqual(mockRes.statusCode, 200);
  assert.strictEqual(mockRes.body.success, true);
  assert.strictEqual(mockRes.body.data.basics.name, 'Bob Smith');
  assert.strictEqual(updatePayload.extraKey, undefined); // Stripped by DTO
  assert.strictEqual(mockRes.body.data.profileCompletion, 60);
});
