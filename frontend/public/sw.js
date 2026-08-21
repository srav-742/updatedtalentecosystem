/**
 * Service Worker — Static Asset Cache
 * 
 * Caches JS chunks, CSS, fonts, and images so repeat visits load instantly.
 * Uses a Cache-First strategy for hashed assets (immutable) and
 * Network-First for HTML/API calls (always fresh).
 * 
 * Installed via a single <script> tag in index.html.
 */

const CACHE_NAME = 'hire1percent-v1';

// Assets to pre-cache on install (critical path)
const PRECACHE_ASSETS = [
  '/',
  '/logo.png',
  '/pace.min.js',
  '/pace-theme-default.min.css',
];

// Install: pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial failure (non-critical):', err);
      });
    })
  );
  // Activate immediately — don't wait for old SW to die
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// Fetch: route requests through the appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls, WebSocket, and external origins
  if (
    url.pathname.startsWith('/api') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Strategy 1: Cache-First for hashed assets (JS chunks, CSS, fonts, images)
  // These have content hashes in filenames, so they're immutable
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|jpeg|webp|svg|ico)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strategy 2: Network-First for HTML (always get fresh version)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default: Network-First for everything else
  event.respondWith(networkFirst(request));
});

/**
 * Cache-First: Return cached version if available, otherwise fetch and cache.
 * Best for static assets with content hashes.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline fallback — return whatever we have
    return cached || new Response('Offline', { status: 503 });
  }
}

/**
 * Network-First: Try network, fall back to cache.
 * Best for HTML pages that should always be fresh.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
