/**
 * Route Prefetching Utility
 * 
 * Pre-downloads lazy-loaded page chunks during browser idle time so that
 * navigation between pages is instant (no loading spinner).
 * 
 * HOW IT WORKS:
 * 1. When a layout (RecruiterLayout or SeekerLayout) mounts, it calls
 *    the corresponding prefetch function.
 * 2. Each import() call is wrapped in requestIdleCallback so it only
 *    runs when the browser's main thread is free.
 * 3. Once a chunk is downloaded, it stays in the browser's module cache
 *    and React.lazy() resolves instantly on navigation.
 * 
 * This is a production-only optimization — in dev mode, Vite serves
 * modules on-demand so prefetching has no effect.
 */

// Safely schedule work during idle periods; falls back to setTimeout
const idle = (fn) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(fn);
    } else {
        setTimeout(fn, 200);
    }
};

// Track what's already been prefetched to avoid duplicate downloads
const prefetched = new Set();

const prefetch = (importFn, name) => {
    if (prefetched.has(name)) return;
    prefetched.add(name);
    idle(() => {
        importFn().catch(() => {
            // Silently ignore prefetch failures — the real import will retry
            prefetched.delete(name);
        });
    });
};

/**
 * Prefetch all Recruiter pages — call once when RecruiterLayout mounts
 */
export const prefetchRecruiterRoutes = () => {
    prefetch(() => import('../pages/recruiter/RecruiterDashboard'), 'RecruiterDashboard');
    prefetch(() => import('../pages/recruiter/PostJob'), 'PostJob');
    prefetch(() => import('../pages/recruiter/MyJobs'), 'MyJobs');
    prefetch(() => import('../pages/recruiter/Applicants'), 'Applicants');
    prefetch(() => import('../pages/recruiter/RecruiterProfile'), 'RecruiterProfile');
    prefetch(() => import('../pages/recruiter/PerformanceDashboard'), 'PerformanceDashboard');
    prefetch(() => import('../pages/recruiter/OnboardingKit'), 'OnboardingKit');
    prefetch(() => import('../pages/recruiter/TalentSearch'), 'TalentSearch');
};

/**
 * Prefetch all Seeker pages — call once when SeekerLayout mounts
 */
export const prefetchSeekerRoutes = () => {
    prefetch(() => import('../pages/seeker/SeekerDashboard'), 'SeekerDashboard');
    prefetch(() => import('../pages/seeker/BrowseJobs'), 'BrowseJobs');
    prefetch(() => import('../pages/seeker/JobDetails'), 'JobDetails');
    prefetch(() => import('../pages/seeker/MyApplications'), 'MyApplications');
    prefetch(() => import('../pages/seeker/SeekerProfile'), 'SeekerProfile');
    prefetch(() => import('../pages/seeker/EliteCommunity'), 'EliteCommunity');
};

/**
 * Prefetch common public pages — call on LandingPage mount
 */
export const prefetchPublicRoutes = () => {
    prefetch(() => import('../pages/LoginPage'), 'LoginPage');
    prefetch(() => import('../pages/SignupPage'), 'SignupPage');
    prefetch(() => import('../pages/PricingPage'), 'PricingPage');
    prefetch(() => import('../pages/AboutPage'), 'AboutPage');
};
