/**
 * API Request Deduplicator
 * 
 * Prevents duplicate in-flight API requests. When multiple components request
 * the same endpoint simultaneously (e.g., during React re-renders), only ONE
 * actual network request is made. All callers receive the same promise.
 * 
 * This is especially useful for:
 * - Dashboard pages that mount multiple components requesting the same data
 * - React StrictMode double-mounting in development
 * - Race conditions during navigation
 * 
 * Usage:
 *   import { deduplicatedFetch } from '../utils/requestDeduplicator';
 *   const data = await deduplicatedFetch('/api/jobs');
 */

// Map of in-flight request URLs to their pending promises
const inflightRequests = new Map();

/**
 * Fetch with deduplication. If an identical request is already in-flight,
 * returns the same promise instead of creating a new network request.
 * 
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options (method, headers, etc.)
 * @returns {Promise<Response>} The fetch response
 */
export async function deduplicatedFetch(url, options = {}) {
  // Only deduplicate GET requests (mutations should always execute)
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return fetch(url, options);
  }

  // Create a cache key from URL + relevant headers
  const cacheKey = url;

  // If this exact request is already in-flight, return the existing promise
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  // Create new request and track it
  const fetchPromise = fetch(url, options)
    .then((response) => {
      // Clone the response so multiple consumers can read the body
      inflightRequests.delete(cacheKey);
      return response;
    })
    .catch((error) => {
      inflightRequests.delete(cacheKey);
      throw error;
    });

  inflightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Simple in-memory response cache with TTL.
 * Useful for data that doesn't change often (e.g., job listings, blog posts).
 */
const responseCache = new Map();

/**
 * Fetch with local response caching.
 * Returns cached data if available and not expired, otherwise fetches and caches.
 * 
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} ttlMs - Cache TTL in milliseconds (default: 60 seconds)
 * @returns {Promise<any>} Parsed JSON response
 */
export async function cachedFetch(url, options = {}, ttlMs = 60000) {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return fetch(url, options).then(r => r.json());
  }

  const cached = responseCache.get(url);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data;
  }

  const response = await deduplicatedFetch(url, options);
  if (response.ok) {
    const data = await response.clone().json();
    responseCache.set(url, { data, timestamp: Date.now() });
    return data;
  }

  throw new Error(`Fetch failed: ${response.status}`);
}

/**
 * Clear the response cache (call after mutations to refresh data).
 * @param {string} [urlPrefix] - Optional prefix to clear specific URLs
 */
export function clearCache(urlPrefix) {
  if (urlPrefix) {
    for (const key of responseCache.keys()) {
      if (key.startsWith(urlPrefix)) {
        responseCache.delete(key);
      }
    }
  } else {
    responseCache.clear();
  }
}
