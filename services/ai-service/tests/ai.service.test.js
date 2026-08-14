import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { AiService } from '../src/services/ai.service.js';
import LocalLLMProvider from '../src/providers/LocalLLMProvider.js';

test('AiService parses, scores, matches, recommends, and analyzes interviews', async () => {
  const service = new AiService(new LocalLLMProvider());
  const resumeText = 'Senior Node React engineer with 8 years of Kubernetes and AWS experience.';
  const jobDescription = 'Need Node React Kubernetes engineer.';

  const parsed = await service.parseResume({ resumeText });
  assert.equal(parsed.experience.years, 8);
  assert.equal(parsed.skills.includes('kubernetes'), true);

  const scored = await service.scoreResume({ resumeText, jobDescription });
  assert.equal(scored.score > 40, true);

  const matched = await service.matchJob({
    candidate: { id: 'cand_1', skills: ['node', 'react', 'aws'] },
    job: { id: 'job_1', skills: ['node', 'react'] },
  });
  assert.equal(matched.candidateId, 'cand_1');

  const recs = await service.recommendations({
    candidate: { id: 'cand_1', skills: ['node', 'react'] },
    jobs: [
      { id: 'job_low', skills: ['sales'] },
      { id: 'job_high', skills: ['node', 'react'] },
    ],
  });
  assert.equal(recs[0].jobId, 'job_high');

  const analysis = await service.interviewAnalysis({ transcript: 'I used Node because it scales well.' });
  assert.equal(analysis.communicationScore, 82);
});
