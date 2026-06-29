/**
 * @fileoverview Recruiter Policy
 * @module gateway/policies/RecruiterPolicy
 *
 * Enforces role-based access for recruiter-specific endpoints.
 * Ensures only users with the recruiter (or higher) role can access
 * recruiter-gated functionality.
 */

import ROLES, { hasMinimumRole } from '../../core/constants/roles.js';
import MESSAGES from '../../core/constants/messages.js';

/**
 * Recruiter Policy.
 * Requires minimum recruiter role for write operations.
 */
const RecruiterPolicy = {
  name: 'RecruiterPolicy',

  /**
   * Evaluates the recruiter policy.
   *
   * @param {Object} context - Request context.
   * @param {Object} context.user - Authenticated user.
   * @param {string} context.method - HTTP method.
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async evaluate(context) {
    const { user, method } = context;

    // Read operations (GET) are allowed for all authenticated users
    if (method === 'GET') {
      return { allowed: true };
    }

    // Write operations require at least recruiter role
    if (!hasMinimumRole(user.role, ROLES.RECRUITER)) {
      return {
        allowed: false,
        reason: MESSAGES.ROLE_VIOLATION,
      };
    }

    return { allowed: true };
  },
};

export default RecruiterPolicy;
