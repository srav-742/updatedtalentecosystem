import SearchProvider from './SearchProvider.js';

const searchableText = (doc) => [
  doc.title,
  doc.body,
  doc.description,
  doc.name,
  doc.email,
  ...(Array.isArray(doc.skills) ? doc.skills : []),
  ...Object.values(doc.facets || {}),
  ...Object.values(doc.metadata || {}),
].filter(Boolean).join(' ').toLowerCase();

const normalizeDoc = (type, document) => ({
  ...document,
  id: document.id || document.sourceId || document._id,
  sourceId: document.sourceId || document.id || document._id,
  type,
  title: document.title || document.name || document.email || 'Untitled',
  body: document.body || document.description || document.summary || '',
  facets: document.facets || {},
  metadata: document.metadata || {},
  indexedAt: document.indexedAt || new Date().toISOString(),
});

export class MockSearchProvider extends SearchProvider {
  constructor(seed = {}) {
    super();
    this.indices = new Map();
    Object.entries(seed).forEach(([type, docs]) => {
      docs.forEach((doc) => this.index(type, doc));
    });
  }

  async index(type, document) {
    const normalized = normalizeDoc(type, document);
    if (!this.indices.has(type)) {
      this.indices.set(type, new Map());
    }
    this.indices.get(type).set(normalized.sourceId, normalized);
    return normalized;
  }

  async remove(type, id) {
    const removed = this.indices.get(type)?.delete(id) || false;
    return { type, id, removed };
  }

  async search(options = {}) {
    const started = Date.now();
    const {
      q = '',
      type = 'global',
      page = 1,
      limit = 20,
      sortBy = 'indexedAt',
      sortOrder = 'desc',
      filters = {},
      facets = [],
    } = options;

    const targetTypes = type === 'global' ? [...this.indices.keys()] : [type];
    let hits = targetTypes.flatMap((targetType) => [...(this.indices.get(targetType)?.values() || [])]);
    const query = q.toLowerCase().trim();

    if (query) {
      hits = hits.filter((doc) => searchableText(doc).includes(query));
    }

    hits = hits.filter((doc) => Object.entries(filters).every(([key, expected]) => {
      const actual = doc[key] ?? doc.facets?.[key] ?? doc.metadata?.[key];
      if (Array.isArray(expected)) return expected.includes(actual);
      if (Array.isArray(actual)) return actual.includes(expected);
      return String(actual) === String(expected);
    }));

    hits.sort((a, b) => {
      const left = a[sortBy] ?? a.metadata?.[sortBy] ?? '';
      const right = b[sortBy] ?? b.metadata?.[sortBy] ?? '';
      const result = String(left).localeCompare(String(right), undefined, { numeric: true });
      return sortOrder === 'asc' ? result : -result;
    });

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Math.min(Number(limit) || 20, 100), 1);
    const start = (safePage - 1) * safeLimit;
    const data = hits.slice(start, start + safeLimit);

    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total: hits.length,
        pages: Math.ceil(hits.length / safeLimit),
        latencyMs: Date.now() - started,
        facets: this.buildFacets(hits, facets),
      },
    };
  }

  async autocomplete({ q = '', type = 'global', limit = 10 } = {}) {
    const query = q.toLowerCase().trim();
    const targetTypes = type === 'global' ? [...this.indices.keys()] : [type];
    const suggestions = new Set();

    targetTypes.forEach((targetType) => {
      [...(this.indices.get(targetType)?.values() || [])].forEach((doc) => {
        [doc.title, doc.name, ...(Array.isArray(doc.skills) ? doc.skills : [])]
          .filter(Boolean)
          .filter((value) => value.toLowerCase().startsWith(query))
          .forEach((value) => suggestions.add(value));
      });
    });

    return [...suggestions].slice(0, Number(limit) || 10);
  }

  buildFacets(hits, requestedFacets) {
    return requestedFacets.reduce((acc, facet) => {
      acc[facet] = hits.reduce((counts, doc) => {
        const value = doc[facet] ?? doc.facets?.[facet] ?? doc.metadata?.[facet];
        if (value === undefined || value === null) return counts;
        const values = Array.isArray(value) ? value : [value];
        values.forEach((item) => {
          counts[item] = (counts[item] || 0) + 1;
        });
        return counts;
      }, {});
      return acc;
    }, {});
  }
}

export default MockSearchProvider;
