import { errors } from '@hire1percent/shared';
import createSearchProvider from '../providers/searchProvider.factory.js';

const allowedTypes = new Set(['jobs', 'candidates', 'recruiters', 'organizations', 'resumes', 'global']);

export class SearchService {
  constructor(provider = createSearchProvider()) {
    this.provider = provider;
    this.analytics = [];
  }

  async globalSearch(query) {
    return this.search({ ...query, type: 'global' });
  }

  async search(query = {}) {
    const type = query.type || 'global';
    this.assertType(type);
    const filters = typeof query.filters === 'string' ? JSON.parse(query.filters || '{}') : (query.filters || {});
    const facets = typeof query.facets === 'string' ? query.facets.split(',').filter(Boolean) : (query.facets || []);
    const result = await this.provider.search({
      q: query.q || query.query || '',
      type,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters,
      facets,
    });
    this.analytics.push({
      query: query.q || query.query || '',
      type,
      filters,
      resultCount: result.meta.total,
      latencyMs: result.meta.latencyMs,
      createdAt: new Date().toISOString(),
    });
    return result;
  }

  async autocomplete(query = {}) {
    const type = query.type || 'global';
    this.assertType(type);
    return this.provider.autocomplete({ q: query.q || '', type, limit: query.limit });
  }

  async index(type, document) {
    this.assertType(type);
    if (type === 'global') {
      throw errors.ApiError.badRequest('Global is not an indexable type.');
    }
    if (!document || !(document.id || document.sourceId || document._id)) {
      throw errors.ApiError.badRequest('Indexed document requires id, sourceId, or _id.');
    }
    return this.provider.index(type, document);
  }

  async remove(type, id) {
    this.assertType(type);
    return this.provider.remove(type, id);
  }

  getAnalytics() {
    return this.analytics;
  }

  assertType(type) {
    if (!allowedTypes.has(type)) {
      throw errors.ApiError.badRequest(`Unsupported search type: ${type}`);
    }
  }
}

export const searchService = new SearchService();
export default searchService;
