/**
 * Route Prefetcher — Preloads lazy-loaded route chunks when links enter the viewport.
 * 
 * How it works:
 * 1. Observes all internal <a> links using IntersectionObserver
 * 2. When a link scrolls into view, it schedules a prefetch using requestIdleCallback
 * 3. The prefetch triggers the dynamic import() for that route's chunk
 * 4. When the user actually clicks the link, the chunk is already in the browser cache
 * 
 * This is additive — it doesn't modify App.jsx or any existing routing code.
 * Import this file once in main.jsx to activate.
 */

// Map of route paths to their dynamic import functions
// These match the lazy() imports in App.jsx
const ROUTE_IMPORT_MAP = {
  '/': () => import('../pages/AssessmentsHome'),
  '/service': () => import('../pages/LandingPage'),
  '/about': () => import('../pages/AboutPage'),
  '/pricing': () => import('../pages/PricingPage'),
  '/signup': () => import('../pages/SignupPage'),
  '/login': () => import('../pages/LoginPage'),
  '/blog': () => import('../pages/blog/BlogLandingPage'),
  '/contact': () => import('../pages/Contact'),
  '/privacy': () => import('../pages/PrivacyPolicy'),
  '/terms': () => import('../pages/Terms'),
  '/candidate': () => import('../pages/seeker/SeekerDashboard'),
  '/candidate/jobs': () => import('../pages/seeker/BrowseJobs'),
  '/candidate/profile': () => import('../pages/seeker/SeekerProfile'),
  '/candidate/applications': () => import('../pages/seeker/MyApplications'),
  '/candidate/mock-interview': () => import('../pages/seeker/ApplicationFlow/AgentInterview'),
  '/candidate/community': () => import('../pages/seeker/EliteCommunity'),
  '/recruiter': () => import('../pages/recruiter/RecruiterDashboard'),
  '/recruiter/my-jobs': () => import('../pages/recruiter/MyJobs'),
  '/recruiter/applicants': () => import('../pages/recruiter/Applicants'),
  '/recruiter/post-job': () => import('../pages/recruiter/PostJob'),
  '/recruiter/ai-search': () => import('../pages/recruiter/TalentSearch'),
  '/recruiter/onboarding-kit': () => import('../pages/recruiter/OnboardingKit'),
  '/recruiter/performance': () => import('../pages/recruiter/PerformanceDashboard'),
};

// Track which routes have already been prefetched
const prefetchedRoutes = new Set();

// Polyfill requestIdleCallback for Safari
const scheduleIdle =
  typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback
    : (cb) => setTimeout(cb, 1);

/**
 * Prefetch a route's chunk if it hasn't been loaded yet.
 */
function prefetchRoute(pathname) {
  // Normalize: strip trailing slash, match base path
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/$/, '');

  if (prefetchedRoutes.has(normalized)) return;

  const importFn = ROUTE_IMPORT_MAP[normalized];
  if (importFn) {
    prefetchedRoutes.add(normalized);
    scheduleIdle(() => {
      importFn().catch(() => {
        // Silently ignore prefetch failures — the real navigation will retry
        prefetchedRoutes.delete(normalized);
      });
    });
  }
}

/**
 * Initialize the route prefetcher.
 * Call this once after the app has mounted (e.g., in main.jsx).
 */
export function initRoutePrefetcher() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return; // SSR or unsupported browser — skip
  }

  // Delay initialization to avoid competing with initial page load
  const startDelay = setTimeout(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const link = entry.target;
            const href = link.getAttribute('href');
            if (href && href.startsWith('/')) {
              prefetchRoute(href);
            }
            observer.unobserve(link); // Only prefetch once per link
          }
        }
      },
      {
        rootMargin: '200px', // Start prefetching when link is 200px from viewport
        threshold: 0,
      }
    );

    // Observe all internal links
    function observeLinks() {
      const links = document.querySelectorAll('a[href^="/"]');
      links.forEach((link) => {
        const href = link.getAttribute('href');
        if (href && !prefetchedRoutes.has(href.replace(/\/$/, '') || '/')) {
          observer.observe(link);
        }
      });
    }

    // Initial observation
    observeLinks();

    // Re-observe on route changes (MutationObserver watches for DOM changes)
    const mutationObserver = new MutationObserver(() => {
      scheduleIdle(observeLinks);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup on page unload
    window.addEventListener('unload', () => {
      observer.disconnect();
      mutationObserver.disconnect();
    });
  }, 100); // Start prefetch after 100ms

  return () => clearTimeout(startDelay);
}
