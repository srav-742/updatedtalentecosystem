/**
 * @fileoverview Policy Evaluation Engine
 * @module authorization/policyEngine
 */

import { checkPermission } from './permissionEngine.js';

/**
 * Maps resource types and actions to fine-grained permission strings.
 */
export const resourcePermissionMap = {
  job: {
    read: 'jobs:read',
    write: 'jobs:write',
    delete: 'jobs:delete',
    admin: 'jobs:manage'
  },
  jobs: {
    read: 'jobs:read',
    write: 'jobs:write',
    delete: 'jobs:delete',
    admin: 'jobs:manage'
  },
  candidate: {
    read: 'candidates:read',
    write: 'candidates:write',
    delete: 'candidates:delete',
    admin: 'candidates:manage'
  },
  candidates: {
    read: 'candidates:read',
    write: 'candidates:write',
    delete: 'candidates:delete',
    admin: 'candidates:manage'
  },
  recruiter: {
    read: 'recruiters:read',
    write: 'recruiters:write',
    delete: 'recruiters:delete',
    admin: 'recruiters:manage'
  },
  recruiters: {
    read: 'recruiters:read',
    write: 'recruiters:write',
    delete: 'recruiters:delete',
    admin: 'recruiters:manage'
  },
  assessment: {
    read: 'assessments:read',
    write: 'assessments:write',
    delete: 'assessments:delete',
    admin: 'assessments:evaluate'
  },
  assessments: {
    read: 'assessments:read',
    write: 'assessments:write',
    delete: 'assessments:delete',
    admin: 'assessments:evaluate'
  },
  interview: {
    read: 'interviews:read',
    write: 'interviews:write',
    delete: 'interviews:delete',
    admin: 'interviews:manage'
  },
  interviews: {
    read: 'interviews:read',
    write: 'interviews:write',
    delete: 'interviews:delete',
    admin: 'interviews:manage'
  },
  resume: {
    read: 'resumes:read',
    write: 'resumes:write',
    delete: 'resumes:delete',
    admin: 'resumes:parse'
  },
  resumes: {
    read: 'resumes:read',
    write: 'resumes:write',
    delete: 'resumes:delete',
    admin: 'resumes:parse'
  },
  notification: {
    read: 'notifications:read',
    write: 'notifications:write',
    delete: 'notifications:delete',
    admin: 'notifications:manage'
  },
  notifications: {
    read: 'notifications:read',
    write: 'notifications:write',
    delete: 'notifications:delete',
    admin: 'notifications:manage'
  },
  admin: {
    read: 'admin:read',
    write: 'admin:write',
    delete: 'admin:delete',
    admin: 'admin:manage'
  }
};

/**
 * Evaluates whether a user's context (role, permissions) allows access to a resource/action.
 *
 * @param {Object} context
 * @param {string} context.role - Normalized user role.
 * @param {string[]} context.permissions - List of permission strings.
 * @param {string} context.resource - The resource requested (e.g. 'job:12345' or 'jobs').
 * @param {string} context.action - The action to perform (e.g. 'read', 'write', 'delete', 'admin').
 * @returns {Object} Evaluation result containing `allowed` boolean and `reason` string.
 */
export const evaluate = ({ role, permissions, resource, action }) => {
  // 1. Super Admin bypasses all checks
  if (role === 'super_admin') {
    return { allowed: true };
  }

  // Extract base resource type (e.g., 'job' from 'job:12345')
  const resourceType = resource.split(':')[0].toLowerCase().trim();

  // 2. Admin role bypass for non-admin domain resources
  if (role === 'admin' && resourceType !== 'admin') {
    return { allowed: true };
  }

  // 3. Resolve required permission for action
  const expectedPermission = resourcePermissionMap[resourceType]?.[action] || `${resourceType}:${action}`;
  const managePermission = resourcePermissionMap[resourceType]?.admin || `${resourceType}:manage`;

  // Check direct action permission
  if (checkPermission(permissions, expectedPermission)) {
    return { allowed: true };
  }

  // Check administration/management permission
  if (checkPermission(permissions, managePermission)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Insufficient permissions. User lacks required permissions: '${expectedPermission}' or '${managePermission}' for resource type '${resourceType}'.`
  };
};

export default {
  resourcePermissionMap,
  evaluate,
};
