/**
 * @fileoverview Policy Engine Initializer
 * @module gateway/bootstrap/policyInit
 *
 * Validates that all policies referenced in the Route Registry are
 * registered in the PolicyManager. Logs warnings for any missing
 * policies and reports the final registration state.
 *
 * Called during the deterministic boot sequence before routes are mounted.
 */

import { PolicyManager } from '../policies/PolicyManager.js';
import { routeRegistry } from '../routes/routeRegistry.js';
import logger from '../../core/logger/logger.js';

/**
 * Initializes and validates the policy engine.
 * Ensures every policy referenced in the route registry is actually registered.
 *
 * @returns {void}
 */
export const initializePolicies = () => {
  logger.info('Initializing policy engine...');

  // Collect all unique policy names referenced across all routes
  const referencedPolicies = new Set();
  routeRegistry.forEach((route) => {
    if (route.policies && route.policies.length > 0) {
      route.policies.forEach((policy) => referencedPolicies.add(policy));
    }
  });

  // Get registered policies from the PolicyManager
  const registeredPolicies = PolicyManager.getRegisteredPolicies();
  const registeredSet = new Set(registeredPolicies);

  // Check for missing policies
  const missingPolicies = [];
  for (const policyName of referencedPolicies) {
    if (!registeredSet.has(policyName)) {
      missingPolicies.push(policyName);
    }
  }

  if (missingPolicies.length > 0) {
    logger.warn(
      `Policy engine: ${missingPolicies.length} referenced policy(ies) are NOT registered: ` +
      `[${missingPolicies.join(', ')}]. These will be skipped during evaluation.`,
      { source: 'policyInit' }
    );
  }

  logger.info(
    `Policy engine ready — Registered: [${registeredPolicies.join(', ')}], ` +
    `Referenced by routes: [${[...referencedPolicies].join(', ')}]`
  );
};

export default initializePolicies;
