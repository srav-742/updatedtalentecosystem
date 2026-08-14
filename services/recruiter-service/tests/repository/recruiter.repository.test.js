import test from 'node:test';
import assert from 'node:assert';
import { RecruiterRepository } from '../../src/repositories/RecruiterRepository.js';
import RecruiterProfile from '../../src/models/recruiterProfile.model.js';

test('RecruiterRepository: findByUserId calls Mongoose findOne', async (t) => {
  let queryOptions = null;
  t.mock.method(RecruiterProfile, 'findOne', async (query) => {
    queryOptions = query;
    return { userId: query.userId, basics: { name: 'Mock Recruiter' } };
  });

  const repo = new RecruiterRepository();
  const res = await repo.findByUserId('rec_abc');

  assert.strictEqual(queryOptions.userId, 'rec_abc');
  assert.strictEqual(res.basics.name, 'Mock Recruiter');
});

test('RecruiterRepository: findByOrganizationId calls Mongoose find', async (t) => {
  let queryOptions = null;
  t.mock.method(RecruiterProfile, 'find', async (query) => {
    queryOptions = query;
    return [{ userId: 'rec_1', organizationId: query.organizationId }];
  });

  const repo = new RecruiterRepository();
  const res = await repo.findByOrganizationId('org_123');

  assert.strictEqual(queryOptions.organizationId, 'org_123');
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].userId, 'rec_1');
});
