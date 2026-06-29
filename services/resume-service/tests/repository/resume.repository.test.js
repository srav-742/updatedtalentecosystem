import test from 'node:test';
import assert from 'node:assert';
import { ResumeRepository } from '../../src/repositories/ResumeRepository.js';
import Resume from '../../src/models/resume.model.js';

test('ResumeRepository: findByCandidateId calls Mongoose findOne', async (t) => {
  let queryOptions = null;
  t.mock.method(Resume, 'findOne', async (query) => {
    queryOptions = query;
    return { id: 'res_111', candidateId: query.candidateId, status: 'active' };
  });

  const repo = new ResumeRepository();
  const res = await repo.findByCandidateId('cand_123');

  assert.strictEqual(queryOptions.candidateId, 'cand_123');
  assert.strictEqual(res.id, 'res_111');
});

test('ResumeRepository: updateCurrentVersion calls Mongoose findByIdAndUpdate', async (t) => {
  let targetId = null;
  let updateBody = null;
  
  t.mock.method(Resume, 'findByIdAndUpdate', async (id, update, options) => {
    targetId = id;
    updateBody = update;
    return { id, currentVersionId: update.$set.currentVersionId };
  });

  const repo = new ResumeRepository();
  const res = await repo.updateCurrentVersion('res_111', 'ver_222');

  assert.strictEqual(targetId, 'res_111');
  assert.strictEqual(updateBody.$set.currentVersionId, 'ver_222');
  assert.strictEqual(res.currentVersionId, 'ver_222');
});
