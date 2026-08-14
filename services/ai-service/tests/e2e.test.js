import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';

const request = async (baseUrl, path, body) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { res, body: await res.json() };
};

test('AI Service E2E exposes parsing, matching, recommendations, extraction, and analysis', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;

  try {
    const parsed = await request(baseUrl, '/api/v1/ai/parse-resume', {
      resumeText: 'Node React engineer with 5 years of MongoDB experience.',
    });
    assert.equal(parsed.res.status, 200);
    assert.equal(parsed.body.data.experience.years, 5);

    const score = await request(baseUrl, '/api/v1/ai/score-resume', {
      resumeText: 'Node React MongoDB',
      jobDescription: 'Node React',
    });
    assert.equal(score.body.data.verdict !== 'low_match', true);

    const semantic = await request(baseUrl, '/api/v1/ai/semantic-search', {
      query: 'node platform',
      documents: [
        { id: 'doc_1', title: 'Node platform engineer' },
        { id: 'doc_2', title: 'Finance manager' },
      ],
    });
    assert.equal(semantic.body.data[0].id, 'doc_1');

    const analysis = await request(baseUrl, '/api/v1/ai/interview-analysis', {
      transcript: 'I chose Kubernetes because the system needed resilient scaling.',
    });
    assert.equal(analysis.body.data.technicalSignals.includes('kubernetes'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
