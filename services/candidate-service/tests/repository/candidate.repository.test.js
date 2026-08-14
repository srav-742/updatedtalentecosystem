import test from 'node:test';
import assert from 'node:assert';
import { CandidateRepository } from '../../src/repositories/CandidateRepository.js';
import CandidateProfile from '../../src/models/candidateProfile.model.js';

test('CandidateRepository: findByUserId calls Mongoose findOne', async (t) => {
  let queryOptions = null;
  t.mock.method(CandidateProfile, 'findOne', async (query) => {
    queryOptions = query;
    return { userId: query.userId, basics: { name: 'Mock Profile' } };
  });

  const repo = new CandidateRepository();
  const res = await repo.findByUserId('user_abc');

  assert.strictEqual(queryOptions.userId, 'user_abc');
  assert.strictEqual(res.basics.name, 'Mock Profile');
});

test('CandidateRepository: searchProfiles builds correct query filters', async (t) => {
  let builtQuery = null;
  t.mock.method(CandidateProfile, 'find', async (query) => {
    builtQuery = query;
    return [{ basics: { name: 'Cand A' } }];
  });

  const repo = new CandidateRepository();

  // Search by skills and location
  await repo.searchProfiles({ skills: ['React', 'Node'], location: 'Austin' });

  assert.deepStrictEqual(builtQuery.skills, { $in: ['React', 'Node'] });
  assert.deepStrictEqual(builtQuery['basics.location'], { $regex: 'Austin', $options: 'i' });
  assert.deepStrictEqual(builtQuery.visibility, { $ne: 'private' }); // Default filter for non-admins

  // Search by text query
  await repo.searchProfiles({ q: 'Antigravity', visibility: 'public' });
  assert.strictEqual(builtQuery.visibility, 'public');
  assert.deepStrictEqual(builtQuery.$or, [
    { 'basics.name': { $regex: 'Antigravity', $options: 'i' } },
    { 'basics.bio': { $regex: 'Antigravity', $options: 'i' } },
    { skills: { $regex: 'Antigravity', $options: 'i' } },
  ]);
});
