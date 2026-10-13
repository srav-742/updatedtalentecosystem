/**
 * Google Analytics 4 (GA4) Utility for Hire1Percent
 * 
 * Provides resilient, privacy-safe tracking helpers for Single-Page Application (SPA) routing,
 * Google Consent Mode v2 updates, and custom business milestone events.
 * 
 * Guarantees:
 * - Safe execution when ad-blockers block gtag.js (fails silently without throwing)
 * - Automatic PII sanitization (strips emails, passwords, auth tokens, candidate resumes)
 * - Single source of truth for Measurement ID
 */

export const GA_MEASUREMENT_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GA_MEASUREMENT_ID) || 'G-GHYJZVBMB4';

// Prevent duplicate page_view events fired within rapid microtasks
let lastTrackedPath = '';
let lastTrackedTime = 0;

/**
 * Sanitizes URLs to ensure no sensitive tokens or PII are dispatched to GA4.
 */
function sanitizePath(path) {
  if (!path) return '/';
  try {
    const url = new URL(path, 'https://www.hire1percent.com');
    const sensitiveParams = ['token', 'accessToken', 'refreshToken', 'code', 'oobCode', 'apiKey', 'password', 'email'];
    sensitiveParams.forEach(param => {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, '[REDACTED]');
      }
    });
    return url.pathname + (url.search ? url.search : '');
  } catch {
    return path.split('?')[0];
  }
}

/**
 * Sanitizes event parameters to strictly forbid any PII or sensitive payload keys.
 */
function sanitizeParams(params = {}) {
  const safe = {};
  const forbiddenKeys = ['email', 'password', 'token', 'accessToken', 'refreshToken', 'resume', 'answers', 'transcript', 'ssn', 'phone'];

  for (const [key, value] of Object.entries(params)) {
    if (forbiddenKeys.some(forbidden => key.toLowerCase().includes(forbidden))) {
      continue; // Skip sensitive keys entirely
    }
    // Only pass primitives (strings, numbers, booleans)
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Checks if current environment is localhost or development
 */
function isDevEnvironment() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
}

/**
 * Dispatches a virtual page_view event to GA4
 * @param {string} path - URL path (e.g. /pricing, /about)
 * @param {string} title - Document title
 */
export function trackPageView(path, title) {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const cleanPath = sanitizePath(path || window.location.pathname);
  const cleanTitle = title || document.title || 'Hire1Percent';

  // Debounce duplicate hits to identical path within 250ms
  if (cleanPath === lastTrackedPath && (now - lastTrackedTime) < 250) {
    return;
  }
  lastTrackedPath = cleanPath;
  lastTrackedTime = now;

  if (typeof window.gtag === 'function') {
    try {
      const isDev = isDevEnvironment();
      window.gtag('event', 'page_view', {
        page_path: cleanPath,
        page_title: cleanTitle,
        page_location: window.location.origin + cleanPath,
        send_to: GA_MEASUREMENT_ID,
        ...(isDev ? { debug_mode: true } : {})
      });
    } catch {
      // Non-fatal analytics catch
    }
  }
}

/**
 * Dispatches a custom event to GA4
 * @param {string} eventName - GA4 event name (e.g. 'sign_up', 'login', 'job_apply_start')
 * @param {Object} params - Custom parameters (automatically sanitized)
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || !eventName) return;

  if (typeof window.gtag === 'function') {
    try {
      const safeParams = sanitizeParams(params);
      const isDev = isDevEnvironment();
      window.gtag('event', eventName, {
        ...safeParams,
        send_to: GA_MEASUREMENT_ID,
        ...(isDev ? { debug_mode: true } : {})
      });
    } catch {
      // Non-fatal analytics catch
    }
  }
}

/**
 * Updates Google Consent Mode v2 status
 * Strictly separates analytics consent from advertising consent.
 * @param {boolean} isGranted - True if user accepted analytics cookies
 */
export function updateConsent(isGranted) {
  if (typeof window === 'undefined') return;

  const analyticsStatus = isGranted ? 'granted' : 'denied';

  if (typeof window.gtag === 'function') {
    try {
      window.gtag('consent', 'update', {
        analytics_storage: analyticsStatus,
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    } catch {
      // Non-fatal consent catch
    }
  }
}
