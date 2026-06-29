import '../setup.js';
import test from 'node:test';
import assert from 'node:assert';
import { CandidateController } from '../../src/controllers/candidate.controller.js';
import candidateService from '../../src/services/candidate.service.js';

test('CandidateController: getOwnProfile returns formatted profile response', async (t) => {
  t.mock.method(candidateService, 'getProfile', async (userId, userContext) => {
    return {
      userId,
      basics: { name: 'Alice', email: 'alice@example.com' },
      skills: ['JS'],
      profileCompletion: 20,
    };
  });

  const req = {
    user: { userId: 'alice_123', role: 'candidate', email: 'alice@example.com' },
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

  const controller = new CandidateController();
  await controller.getOwnProfile(req, mockRes, (err) => {
    assert.fail('Next called: ' + err.message);
  });

  assert.strictEqual(mockRes.statusCode, 200);
  assert.strictEqual(mockRes.body.success, true);
  assert.strictEqual(mockRes.body.data.id, 'alice_123');
  assert.strictEqual(mockRes.body.data.basics.name, 'Alice');
  assert.deepStrictEqual(mockRes.body.data.skills, ['JS']);
});

test('CandidateController: updateOwnProfile maps request and updates', async (t) => {
  let updatePayload = null;

  t.mock.method(candidateService, 'updateProfile', async (userId, data, userContext) => {
    updatePayload = data;
    return {
      userId,
      ...data,
      profileCompletion: 60,
    };
  });

  const req = {
    user: { userId: 'alice_123', role: 'candidate' },
    body: {
      basics: { name: 'Alice Smith', email: 'alice@example.com' },
      skills: ['JS', 'TS'],
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

  const controller = new CandidateController();
  await controller.updateOwnProfile(req, mockRes, (err) => {
    assert.fail('Next called: ' + err.message);
  });

  assert.strictEqual(mockRes.statusCode, 200);
  assert.strictEqual(mockRes.body.success, true);
  assert.strictEqual(mockRes.body.data.basics.name, 'Alice Smith');
  assert.strictEqual(updatePayload.extraKey, undefined); // Stripped by DTO
  assert.strictEqual(mockRes.body.data.profileCompletion, 60);
});
