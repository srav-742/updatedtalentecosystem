/**
 * Hire1Percent — Safe External URL Formatting Utilities
 * 
 * Guarantees that candidate profile URLs (GitHub, LinkedIn, personal portfolios)
 * always have a valid protocol (https://) and do not trigger relative SPA 404 navigation
 * when candidates enter URLs without 'https://'.
 */

/**
 * Safely format and normalize external profile URLs.
 * Returns null if the URL is empty, invalid, or dangerous.
 * 
 * @param {string|null|undefined} url 
 * @returns {string|null}
 */
export function formatExternalUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed === '/' || trimmed.toLowerCase().startsWith('javascript:')) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Extracts a clean display handle or username from a profile URL.
 * 
 * @param {string|null|undefined} url 
 * @param {string} fallback
 * @returns {string}
 */
export function getUrlDisplayLabel(url, fallback = 'Profile') {
  if (!url || typeof url !== 'string') return fallback;
  const clean = url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const segments = clean.split('/');
  const last = segments[segments.length - 1];
  return last || fallback;
}
