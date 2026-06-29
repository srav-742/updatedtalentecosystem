import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { SearchService } from '../src/services/search.service.js';
import { MockSearchProvider } from '../src/providers/MockSearchProvider.js';

test('SearchService records analytics and validates index types', async () => {
  const service = new SearchService(new MockSearchProvider());
  await service.index('candidates', {
    id: 'cand_1',
    title: 'Asha Candidate',
    skills: ['node', 'search'],
    facets: { status: 'active' },
  });

  const result = await service.search({
    q: 'asha',
    type: 'candidates',
    filters: { status: 'active' },
    facets: ['status'],
  });

  assert.equal(result.meta.total, 1);
  assert.equal(service.getAnalytics().length, 1);
  await assert.rejects(() => service.index('unknown', { id: 'x' }), /Unsupported search type/);
});
