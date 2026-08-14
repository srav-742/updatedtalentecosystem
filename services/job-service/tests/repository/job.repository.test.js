import test from 'node:test';
import assert from 'node:assert';
import { JobRepository } from '../../src/repositories/JobRepository.js';
import Job from '../../src/models/job.model.js';

test('JobRepository: findById calls Mongoose findById', async (t) => {
  let queriedId = null;
  t.mock.method(Job, 'findById', async (id) => {
    queriedId = id;
    return { _id: id, title: 'Mock Job' };
  });

  const repo = new JobRepository();
  const res = await repo.findById('job_abc');
  assert.strictEqual(queriedId, 'job_abc');
  assert.strictEqual(res.title, 'Mock Job');
});

test('JobRepository: search builds correct filters', async (t) => {
  let builtQuery = null;
  t.mock.method(Job, 'find', async (query) => {
    builtQuery = query;
    return [{ title: 'Mock Job' }];
  });

  const repo = new JobRepository();
  await repo.search({ status: 'published', q: 'Node' });

  assert.strictEqual(builtQuery.status, 'published');
  assert.deepStrictEqual(builtQuery.$or, [
    { title: { $regex: 'Node', $options: 'i' } },
    { description: { $regex: 'Node', $options: 'i' } },
    { department: { $regex: 'Node', $options: 'i' } },
  ]);
});
