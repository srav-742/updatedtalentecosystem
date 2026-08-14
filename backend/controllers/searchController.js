/**
 * Search Controller - handles various search endpoints.
 * Supports global, job, candidate, recruiter, organization, and resume searches.
 *
 * The implementation is intentionally minimal: it validates query parameters,
 * selects a provider (defaulting to MockSearchProvider), invokes the appropriate
 * method, and returns JSON results.
 *
 * Pagination params: `page` (1‑based) and `size` (default 10).
 * Sorting: `sort` (field) and `order` (`asc`|`desc`).
 * Facets & filters are passed through as raw query strings and left to the
 * provider implementation.
 */

const { MockSearchProvider } = require('../services/search-service/providers/MockSearchProvider');
// Future providers could be imported conditionally, e.g. OpenSearchProvider

// Simple factory – in real code this could read env config to choose provider
function getProvider() {
  // For now always return mock provider – it satisfies the interface.
  return new MockSearchProvider();
}

/** Utility to parse pagination and sorting from request query */
function parseOptions(req) {
  const page = parseInt(req.query.page, 10) || 1;
  const size = parseInt(req.query.size, 10) || 10;
  const sort = req.query.sort || null;
  const order = req.query.order === 'desc' ? 'desc' : 'asc';
  const facets = req.query.facets ? req.query.facets.split(',') : [];
  const filters = req.query.filters ? JSON.parse(req.query.filters) : {};
  return { page, size, sort, order, facets, filters };
}

// Generic handler used by each specific route
async function handleSearch(req, res, type) {
  try {
    const options = parseOptions(req);
    const provider = getProvider();
    // Provider methods are async and return an object { hits, total, facets }
    const result = await provider.search(type, req.query.q || '', options);
    res.json(result);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message || 'Search failed' });
  }
}

// Indexing handler (placeholder)
async function handleIndex(req, res, type) {
  try {
    // In a real implementation, we'd forward payload to the provider
    // Here we just echo back the received payload for testing purposes
    const payload = req.body;
    res.json({ message: `${type} indexed successfully`, payload });
  } catch (err) {
    console.error('Index error:', err);
    res.status(500).json({ error: err.message || 'Indexing failed' });
  }
}

// Delete index handler (placeholder)
async function handleDelete(req, res, type) {
  try {
    const { id } = req.params;
    // Real deletion would call provider.delete(type, id)
    res.json({ message: `${type} with id ${id} deleted (mock)` });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message || 'Delete failed' });
  }
}

// Exported route handlers for search
exports.globalSearch = (req, res) => handleSearch(req, res, 'global');
exports.jobSearch = (req, res) => handleSearch(req, res, 'job');
exports.candidateSearch = (req, res) => handleSearch(req, res, 'candidate');
exports.recruiterSearch = (req, res) => handleSearch(req, res, 'recruiter');
exports.organizationSearch = (req, res) => handleSearch(req, res, 'organization');
exports.resumeSearch = (req, res) => handleSearch(req, res, 'resume');

// Exported route handlers for indexing
exports.indexJobs = (req, res) => handleIndex(req, res, 'job');
exports.indexCandidates = (req, res) => handleIndex(req, res, 'candidate');
exports.deleteIndex = (req, res) => handleDelete(req, res, req.params.type);
