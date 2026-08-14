/**
 * MockSearchProvider - a minimal stub that mimics a search provider.
 * It implements a `search` method accepting a type, query string, and
 * pagination/sorting/options. Returns a predictable placeholder response
 * suitable for unit tests and early integration.
 */

class MockSearchProvider {
  /**
   * Perform a mock search.
   * @param {string} type - The entity type (e.g., 'job', 'candidate').
   * @param {string} query - Search term(s).
   * @param {object} options - Pagination, sorting, facets, filters, etc.
   * @returns {Promise<object>} Mock result with hits, total, and facets.
   */
  async search(type, query, options) {
    // In a real implementation this would query Elasticsearch/OpenSearch.
    // Here we return a deterministic structure for testing.
    const { page = 1, size = 10 } = options;
    const start = (page - 1) * size;
    const hits = [];
    for (let i = 0; i < size; i++) {
      hits.push({
        id: `mock-${type}-${start + i + 1}`,
        type,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} ${start + i + 1}`,
        snippet: `Mock result for "${query}"`,
        // Include the options so callers can verify they were passed through.
        _options: options,
      });
    }
    return {
      hits,
      total: 1000, // arbitrary large total for pagination demo
      page,
      size,
      facets: {},
    };
  }
}

module.exports = { MockSearchProvider };
