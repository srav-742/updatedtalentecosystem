import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import analyticsService from '../src/services/analytics.service.js';

const jsonRequest = async (baseUrl, path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return { res, body: await res.json() };
};

test('Analytics Service E2E exposes dashboard, metrics, charts, and export', async () => {
  analyticsService.reset();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;

  try {
    const event = await jsonRequest(baseUrl, '/api/v1/analytics/events', {
      method: 'POST',
      body: JSON.stringify({
        type: 'application_submitted',
        occurredAt: '2026-06-10T00:00:00.000Z',
        dimensions: { candidateId: 'cand_e2e_1', jobId: 'job_e2e_1' },
      }),
    });
    assert.equal(event.res.status, 201);

    const dashboard = await jsonRequest(baseUrl, '/api/v1/analytics/dashboard?period=monthly');
    assert.equal(dashboard.body.data.hiringFunnel.length, 5);

    const metrics = await jsonRequest(baseUrl, '/api/v1/analytics/metrics?metric=application_submitted&period=monthly');
    assert.equal(metrics.body.data[0].key, '2026-06');

    const charts = await jsonRequest(baseUrl, '/api/v1/analytics/charts?type=hiring_funnel');
    assert.equal(charts.body.data.labels.includes('application_submitted'), true);

    const exported = await fetch(`${baseUrl}/api/v1/analytics/export?format=csv&type=hiring_funnel`);
    assert.equal(exported.status, 200);
    assert.match(await exported.text(), /application_submitted/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
