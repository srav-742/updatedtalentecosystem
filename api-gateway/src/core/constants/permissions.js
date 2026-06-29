/**
 * @fileoverview Permission Constants
 * @module core/constants/permissions
 *
 * Defines fine-grained permission strings used in route definitions
 * and policy evaluations. Each route in the registry maps to one or
 * more of these permission constants.
 */

/**
 * Permission constants.
 * Format: DOMAIN_ACTION (e.g., JOBS_READ, CANDIDATES_WRITE)
 *
 * @enum {string}
 */
const PERMISSIONS = Object.freeze({
  // ─── Auth ────────────────────────────────────────────
  AUTH_LOGIN: 'auth:login',
  AUTH_REGISTER: 'auth:register',
  AUTH_REFRESH: 'auth:refresh',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_VERIFY: 'auth:verify',

  // ─── Jobs ────────────────────────────────────────────
  JOBS_READ: 'jobs:read',
  JOBS_WRITE: 'jobs:write',
  JOBS_DELETE: 'jobs:delete',
  JOBS_MANAGE: 'jobs:manage',

  // ─── Candidates ──────────────────────────────────────
  CANDIDATES_READ: 'candidates:read',
  CANDIDATES_WRITE: 'candidates:write',
  CANDIDATES_DELETE: 'candidates:delete',
  CANDIDATES_MANAGE: 'candidates:manage',
  CANDIDATES_PROFILE: 'candidates:profile',

  // ─── Recruiters ──────────────────────────────────────
  RECRUITERS_READ: 'recruiters:read',
  RECRUITERS_WRITE: 'recruiters:write',
  RECRUITERS_DELETE: 'recruiters:delete',
  RECRUITERS_MANAGE: 'recruiters:manage',
  RECRUITERS_PROFILE: 'recruiters:profile',

  // ─── Admin ───────────────────────────────────────────
  ADMIN_READ: 'admin:read',
  ADMIN_WRITE: 'admin:write',
  ADMIN_DELETE: 'admin:delete',
  ADMIN_MANAGE: 'admin:manage',
  ADMIN_USERS: 'admin:users',
  ADMIN_ANALYTICS: 'admin:analytics',

  // ─── Assessments ─────────────────────────────────────
  ASSESSMENTS_READ: 'assessments:read',
  ASSESSMENTS_WRITE: 'assessments:write',
  ASSESSMENTS_DELETE: 'assessments:delete',
  ASSESSMENTS_SUBMIT: 'assessments:submit',
  ASSESSMENTS_EVALUATE: 'assessments:evaluate',

  // ─── Interviews ──────────────────────────────────────
  INTERVIEWS_READ: 'interviews:read',
  INTERVIEWS_WRITE: 'interviews:write',
  INTERVIEWS_DELETE: 'interviews:delete',
  INTERVIEWS_SCHEDULE: 'interviews:schedule',
  INTERVIEWS_MANAGE: 'interviews:manage',

  // ─── Resumes ─────────────────────────────────────────
  RESUMES_READ: 'resumes:read',
  RESUMES_WRITE: 'resumes:write',
  RESUMES_DELETE: 'resumes:delete',
  RESUMES_PARSE: 'resumes:parse',

  // ─── Notifications ───────────────────────────────────
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_WRITE: 'notifications:write',
  NOTIFICATIONS_DELETE: 'notifications:delete',
  NOTIFICATIONS_MANAGE: 'notifications:manage',
});

export default PERMISSIONS;
