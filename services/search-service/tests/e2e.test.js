import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';

const request = async (baseUrl, path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return { res, body: await res.json() };
};

test('Search Service E2E routes index, search, autocomplete, and delete documents', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;

  try {
    const indexed = await request(baseUrl, '/api/v1/index/jobs', {
      method: 'POST',
      body: JSON.stringify({
        id: 'job_e2e_1',
        title: 'Platform Search Engineer',
        body: 'OpenSearch Node service',
        facets: { location: 'Remote' },
      }),
    });
    assert.equal(indexed.res.status, 201);

    const searched = await request(baseUrl, '/api/v1/search/jobs?q=platform&facets=location');
    assert.equal(searched.res.status, 200);
    assert.equal(searched.body.data[0].sourceId, 'job_e2e_1');
    assert.equal(searched.body.meta.facets.location.Remote, 1);

    const autocomplete = await request(baseUrl, '/api/v1/search/autocomplete?q=Plat&type=jobs');
    assert.deepEqual(autocomplete.body.data, ['Platform Search Engineer']);

    const deleted = await request(baseUrl, '/api/v1/index/jobs/job_e2e_1', { method: 'DELETE' });
    assert.equal(deleted.body.data.removed, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
