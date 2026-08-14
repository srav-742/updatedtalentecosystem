import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import AggregationLayer from '../src/aggregation/aggregationLayer.js';

test('AggregationLayer buckets metrics by period and builds hiring funnel', () => {
  const layer = new AggregationLayer();
  const events = [
    { type: 'job_created', value: 1, occurredAt: '2026-01-01T00:00:00Z' },
    { type: 'job_created', value: 2, occurredAt: '2026-01-02T00:00:00Z' },
    { type: 'application_submitted', value: 1, occurredAt: '2026-01-02T00:00:00Z' },
  ];

  const monthly = layer.aggregate(events, { metric: 'job_created', period: 'monthly' });
  assert.deepEqual(monthly, [{ key: '2026-01', count: 2, value: 3 }]);

  const funnel = layer.funnel(events);
  assert.equal(funnel[0].count, 2);
  assert.equal(funnel[1].count, 1);
});
