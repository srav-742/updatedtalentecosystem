/**
 * @fileoverview Declarative Route Registry
 * @module gateway/routes/routeRegistry
 *
 * The single source of truth for all gateway routes.
 * Each entry defines the path, method, target service, auth requirements,
 * permissions, policies, timeout values, and body parse limits.
 */

import { ServiceKeys } from '../../core/config/serviceRegistry.js';
import { createRouteDefinition } from '../types/RouteDefinition.js';

/**
 * Route registry list.
 * Matched from top to bottom. Specific patterns must be placed above wildcards.
 */
const registryRaw = [
  // ─── Auth Service Endpoints ───────────────────────────
  {
    version: 'v1',
    method: 'POST',
    path: '/api/v1/auth/login',
    serviceKey: ServiceKeys.AUTH_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'strict',
    bodyLimit: '2MB',
    tags: ['Auth', 'Login']
  },
  {
    version: 'v1',
    method: 'POST',
    path: '/api/gateway/token',
    serviceKey: ServiceKeys.AUTH_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'strict',
    bodyLimit: '2MB',
    tags: ['Auth', 'TokenExchange']
  },
  {
    version: 'v1',
    method: 'POST',
    path: '/api/gateway/refresh',
    serviceKey: ServiceKeys.AUTH_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'strict',
    bodyLimit: '2MB',
    tags: ['Auth', 'TokenRefresh']
  },
  {
    version: 'v1',
    method: 'POST',
    path: '/api/v1/auth/verify',
    serviceKey: ServiceKeys.AUTH_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'strict',
    bodyLimit: '2MB',
    tags: ['Auth', 'Verify']
  },
  {
    version: 'v1',
    method: 'POST',
    path: '/api/v1/auth/refresh',
    serviceKey: ServiceKeys.AUTH_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'strict',
    bodyLimit: '2MB',
    tags: ['Auth', 'Refresh']
  },
  {
    version: 'v1',
    method: 'POST',
    path: '/api/v1/auth/logout',
    serviceKey: ServiceKeys.AUTH_SERVICE,
    authRequired: true,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    bodyLimit: '2MB',
    tags: ['Auth', 'Logout']
  },
  {
    version: 'v1',
    method: 'POST',
    path: '/api/v1/auth/resource-access-check',
    serviceKey: ServiceKeys.AUTH_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'strict',
    bodyLimit: '2MB',
    tags: ['Auth', 'Authorization']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/auth/health',
    serviceKey: ServiceKeys.AUTH_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Auth', 'Health']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/auth/*',
    serviceKey: ServiceKeys.AUTH_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Auth', 'Wildcard']
  },

  // ─── Job Service Endpoints ────────────────────────────
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/jobs/health',
    serviceKey: ServiceKeys.JOB_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Jobs', 'Health']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/jobs/live',
    serviceKey: ServiceKeys.JOB_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Jobs', 'Live']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/jobs/ready',
    serviceKey: ServiceKeys.JOB_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Jobs', 'Ready']
  },
  {
    version: 'v1',
    method: 'POST',
    path: '/api/v1/jobs/create',
    serviceKey: ServiceKeys.JOB_SERVICE,
    authRequired: true,
    permissions: ['JOB_CREATE'],
    policies: ['RecruiterPolicy'],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'strict',
    bodyLimit: '2MB',
    tags: ['Jobs', 'Create']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/jobs',
    serviceKey: ServiceKeys.JOB_SERVICE,
    authRequired: true,
    permissions: ['JOBS_READ'],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Jobs', 'List']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/jobs/:id',
    serviceKey: ServiceKeys.JOB_SERVICE,
    authRequired: true,
    permissions: ['JOBS_READ'],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Jobs', 'Detail']
  },
  {
    version: 'v1',
    method: 'PUT',
    path: '/api/v1/jobs/:id',
    serviceKey: ServiceKeys.JOB_SERVICE,
    authRequired: true,
    permissions: ['JOB_UPDATE'],
    policies: ['RecruiterPolicy'],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    bodyLimit: '2MB',
    tags: ['Jobs', 'Update']
  },
  {
    version: 'v1',
    method: 'DELETE',
    path: '/api/v1/jobs/:id',
    serviceKey: ServiceKeys.JOB_SERVICE,
    authRequired: true,
    permissions: ['JOB_DELETE'],
    policies: ['RecruiterPolicy'],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Jobs', 'Delete']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/jobs/*',
    serviceKey: ServiceKeys.JOB_SERVICE,
    authRequired: true,
    permissions: ['JOBS_READ'],
    policies: [],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Jobs', 'Wildcard']
  },

  // ─── Resume Service Endpoints ─────────────────────────
  {
    version: 'v1',
    method: 'POST',
    path: '/api/v1/resumes/upload',
    serviceKey: ServiceKeys.RESUME_SERVICE,
    authRequired: true,
    permissions: ['RESUMES_WRITE'],
    policies: ['OwnershipPolicy'],
    timeout: { gateway: 60000, downstream: 59000 },
    rateLimit: 'strict',
    bodyLimit: '20MB',
    tags: ['Resume', 'Upload']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/resumes',
    serviceKey: ServiceKeys.RESUME_SERVICE,
    authRequired: true,
    permissions: ['RESUMES_READ'],
    policies: ['OwnershipPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Resume', 'Base']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/resumes/health',
    serviceKey: ServiceKeys.RESUME_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Resume', 'Health']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/resumes/live',
    serviceKey: ServiceKeys.RESUME_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Resume', 'Live']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/resumes/ready',
    serviceKey: ServiceKeys.RESUME_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Resume', 'Ready']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/resumes/*',
    serviceKey: ServiceKeys.RESUME_SERVICE,
    authRequired: true,
    permissions: ['RESUMES_READ'],
    policies: ['OwnershipPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Resume', 'Wildcard']
  },

  // ─── Candidate Service ────────────────────────────────
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/candidates/health',
    serviceKey: ServiceKeys.CANDIDATE_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Candidates', 'Health']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/candidates/live',
    serviceKey: ServiceKeys.CANDIDATE_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Candidates', 'Live']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/candidates/ready',
    serviceKey: ServiceKeys.CANDIDATE_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Candidates', 'Ready']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/candidates/*',
    serviceKey: ServiceKeys.CANDIDATE_SERVICE,
    authRequired: true,
    permissions: [],
    policies: ['CandidatePolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Candidates']
  },

  // ─── Recruiter Service ────────────────────────────────
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/recruiters/health',
    serviceKey: ServiceKeys.RECRUITER_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Recruiters', 'Health']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/recruiters/live',
    serviceKey: ServiceKeys.RECRUITER_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Recruiters', 'Live']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/recruiters/ready',
    serviceKey: ServiceKeys.RECRUITER_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Recruiters', 'Ready']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/recruiters/*',
    serviceKey: ServiceKeys.RECRUITER_SERVICE,
    authRequired: true,
    permissions: [],
    policies: ['RecruiterPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Recruiters']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/organizations/*',
    serviceKey: ServiceKeys.RECRUITER_SERVICE,
    authRequired: true,
    permissions: [],
    policies: ['RecruiterPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Organizations']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/organizations',
    serviceKey: ServiceKeys.RECRUITER_SERVICE,
    authRequired: true,
    permissions: [],
    policies: ['RecruiterPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Organizations']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/subscription',
    serviceKey: ServiceKeys.RECRUITER_SERVICE,
    authRequired: true,
    permissions: [],
    policies: ['RecruiterPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Subscription']
  },

  // ─── Admin Service ────────────────────────────────────
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/admin/health',
    serviceKey: ServiceKeys.ADMIN_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Admin', 'Health']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/admin/live',
    serviceKey: ServiceKeys.ADMIN_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Admin', 'Live']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/admin/ready',
    serviceKey: ServiceKeys.ADMIN_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Admin', 'Ready']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/admin/*',
    serviceKey: ServiceKeys.ADMIN_SERVICE,
    authRequired: true,
    permissions: ['ADMIN_READ'],
    policies: ['AdminPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Admin']
  },

  // ─── Assessment Service ───────────────────────────────
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/assessments/health',
    serviceKey: ServiceKeys.ASSESSMENT_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Assessments', 'Health']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/assessments/live',
    serviceKey: ServiceKeys.ASSESSMENT_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Assessments', 'Live']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/assessments/ready',
    serviceKey: ServiceKeys.ASSESSMENT_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Assessments', 'Ready']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/assessments/*',
    serviceKey: ServiceKeys.ASSESSMENT_SERVICE,
    authRequired: true,
    permissions: [],
    policies: ['OwnershipPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Assessments']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/attempts/*',
    serviceKey: ServiceKeys.ASSESSMENT_SERVICE,
    authRequired: true,
    permissions: [],
    policies: ['OwnershipPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Attempts']
  },

  // ─── Interview Service ────────────────────────────────
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/interviews/health',
    serviceKey: ServiceKeys.INTERVIEW_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Interviews', 'Health']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/interviews/live',
    serviceKey: ServiceKeys.INTERVIEW_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Interviews', 'Live']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/interviews/ready',
    serviceKey: ServiceKeys.INTERVIEW_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Interviews', 'Ready']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/interviews/*',
    serviceKey: ServiceKeys.INTERVIEW_SERVICE,
    authRequired: true,
    permissions: [],
    policies: ['OwnershipPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Interviews']
  },

  // ─── Notification Service ─────────────────────────────
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/notifications/health',
    serviceKey: ServiceKeys.NOTIFICATION_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Notifications', 'Health']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/notifications/live',
    serviceKey: ServiceKeys.NOTIFICATION_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Notifications', 'Live']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/notifications/ready',
    serviceKey: ServiceKeys.NOTIFICATION_SERVICE,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 5000, downstream: 4000 },
    rateLimit: 'default',
    tags: ['Notifications', 'Ready']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/v1/notifications/*',
    serviceKey: ServiceKeys.NOTIFICATION_SERVICE,
    authRequired: true,
    permissions: [],
    policies: ['OwnershipPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Notifications']
  },
  // ─── Blog Service Public Endpoints ────────────────────
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/blogs',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Blog', 'Public']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/blogs/featured',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Blog', 'Public', 'Featured']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/blogs/categories',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Blog', 'Public', 'Categories']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/blogs/related/:id',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Blog', 'Public', 'Related']
  },
  {
    version: 'v1',
    method: 'POST',
    path: '/api/v1/blogs/subscribe',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'strict',
    tags: ['Blog', 'Public', 'Subscribe']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/blogs/:slug',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Blog', 'Public', 'Detail']
  },

  // ─── Blog Service Admin Protected Endpoints ───────────
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/admin/blogs',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: true,
    permissions: ['ADMIN_READ'],
    policies: ['AdminPolicy'],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Blog', 'Admin', 'List']
  },
  {
    version: 'v1',
    method: 'GET',
    path: '/api/v1/admin/blogs/:id',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: true,
    permissions: ['ADMIN_READ'],
    policies: ['AdminPolicy'],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Blog', 'Admin', 'Detail']
  },
  {
    version: 'v1',
    method: 'POST',
    path: '/api/v1/admin/blogs',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: true,
    permissions: ['ADMIN_WRITE'],
    policies: ['AdminPolicy'],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'strict',
    bodyLimit: '2MB',
    tags: ['Blog', 'Admin', 'Create']
  },
  {
    version: 'v1',
    method: 'PUT',
    path: '/api/v1/admin/blogs/:id',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: true,
    permissions: ['ADMIN_WRITE'],
    policies: ['AdminPolicy'],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    bodyLimit: '2MB',
    tags: ['Blog', 'Admin', 'Update']
  },
  {
    version: 'v1',
    method: 'DELETE',
    path: '/api/v1/admin/blogs/:id',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: true,
    permissions: ['ADMIN_WRITE'],
    policies: ['AdminPolicy'],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Blog', 'Admin', 'Delete']
  },
  {
    version: 'v1',
    method: 'POST',
    path: '/api/v1/admin/blogs/upload-cover',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: true,
    permissions: ['ADMIN_WRITE'],
    policies: ['AdminPolicy'],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'strict',
    bodyLimit: '10MB',
    tags: ['Blog', 'Admin', 'Upload']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/proctoring/*',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Proctoring']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/proctoring-enhanced/*',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 10000, downstream: 9000 },
    rateLimit: 'default',
    tags: ['Proctoring', 'Enhanced']
  },
  {
    version: 'v1',
    method: '*',
    path: '/api/*',
    serviceKey: ServiceKeys.BACKEND,
    authRequired: false,
    permissions: [],
    policies: [],
    timeout: { gateway: 30000, downstream: 29000 },
    rateLimit: 'default',
    tags: ['Fallback']
  }
];

/**
 * Validated Route Registry definitions list.
 * @type {Object[]}
 */
export const routeRegistry = Object.freeze(registryRaw.map(createRouteDefinition));

/**
 * Matches a route path pattern (supporting :params and wildcards *) against a request path.
 *
 * @param {string} routePath - The registry path pattern.
 * @param {string} requestPath - The incoming HTTP request path.
 * @returns {boolean} True if matched.
 */
export const matchPath = (routePath, requestPath) => {
  // Convert standard express parameter patterns like :id and wildcards * to RegExp
  const pattern = routePath
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except * and :
    .replace(/:[a-zA-Z0-9_]+/g, '([^/]+)') // Match route parameters
    .replace(/\*/g, '(.*)'); // Match wildcards
  
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(requestPath);
};

/**
 * Resolves a route definition by path and HTTP method.
 *
 * @param {string} path - The request path.
 * @param {string} method - The request HTTP method.
 * @returns {Object|null} The matching RouteDefinition or null.
 */
export const findRoute = (path, method) => {
  const methodUpper = method ? method.toUpperCase() : 'GET';

  // 1. Try to find precise match (path match and exact method)
  const preciseMatch = routeRegistry.find(
    (route) =>
      matchPath(route.path, path) &&
      route.method !== '*' &&
      route.method === methodUpper
  );
  if (preciseMatch) return preciseMatch;

  // 2. Try path match with wildcard method
  const wildcardMethodMatch = routeRegistry.find(
    (route) =>
      matchPath(route.path, path) &&
      route.method === '*'
  );
  if (wildcardMethodMatch) return wildcardMethodMatch;

  // 3. Fallback to startsWith prefix matching
  return routeRegistry.find((route) => {
    const cleanPath = route.path.replace(/\/\*$/, '');
    return path.startsWith(cleanPath);
  }) || null;
};

/**
 * Returns all registered route definitions.
 * @returns {Object[]}
 */
export const getAllRoutes = () => routeRegistry;

export { registryRaw };
export default routeRegistry;
