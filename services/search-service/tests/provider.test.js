import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { MockSearchProvider } from '../src/providers/MockSearchProvider.js';

test('MockSearchProvider indexes, filters, sorts, facets, and autocompletes', async () => {
  const provider = new MockSearchProvider();
  await provider.index('jobs', {
    id: 'job_1',
    title: 'Senior Backend Engineer',
    body: 'Node.js microservices',
    location: 'Remote',
    facets: { department: 'Engineering', level: 'Senior' },
    metadata: { salary: 200 },
  });
  await provider.index('jobs', {
    id: 'job_2',
    title: 'Frontend Engineer',
    body: 'React platform',
    location: 'Bengaluru',
    facets: { department: 'Engineering', level: 'Mid' },
    metadata: { salary: 100 },
  });

  const result = await provider.search({
    q: 'engineer',
    type: 'jobs',
    filters: { department: 'Engineering' },
    sortBy: 'salary',
    sortOrder: 'asc',
    facets: ['level'],
  });

  assert.equal(result.meta.total, 2);
  assert.equal(result.data[0].sourceId, 'job_2');
  assert.equal(result.meta.facets.level.Senior, 1);

  const suggestions = await provider.autocomplete({ q: 'Sen', type: 'jobs' });
  assert.deepEqual(suggestions, ['Senior Backend Engineer']);
});
