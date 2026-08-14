/**
 * @fileoverview Candidate Policy
 * @module gateway/policies/CandidatePolicy
 *
 * Enforces role-based access for candidate-specific endpoints.
 * Candidates can read and manage their own profiles; recruiters and
 * admins have broader access.
 */

import ROLES, { hasMinimumRole } from '../../core/constants/roles.js';
import MESSAGES from '../../core/constants/messages.js';

/**
 * Candidate Policy.
 * Allows candidates to manage their own data, recruiters to read.
 */
const CandidatePolicy = {
  name: 'CandidatePolicy',

  /**
   * Evaluates the candidate policy.
   *
   * @param {Object} context - Request context.
   * @param {Object} context.user - Authenticated user.
   * @param {string} context.method - HTTP method.
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async evaluate(context) {
    const { user, method } = context;

    // Admins and super_admins can do anything
    if (hasMinimumRole(user.role, ROLES.ADMIN)) {
      return { allowed: true };
    }

    // Recruiters can read candidate data
    if (user.role === ROLES.RECRUITER && method === 'GET') {
      return { allowed: true };
    }

    // Candidates can manage their own data (all methods)
    if (user.role === ROLES.CANDIDATE) {
      return { allowed: true };
    }

    // Guests cannot access candidate endpoints
    if (user.role === ROLES.GUEST) {
      return {
        allowed: false,
        reason: MESSAGES.ROLE_VIOLATION,
      };
    }

    return { allowed: true };
  },
};

export default CandidatePolicy;
