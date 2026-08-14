/**
 * @fileoverview Service Registry
 * @module core/config/serviceRegistry
 *
 * Centralized registry mapping logical service names to their resolved URLs.
 * Designed as an abstraction layer so the gateway can transition from
 * environment-variable-based URLs to Kubernetes DNS, Consul, AWS Cloud Map,
 * or any other service discovery mechanism without modifying consuming code.
 */

import environment from './environment.js';

/**
 * Service key constants used throughout the gateway.
 * Every proxy, client, and health check references services by these keys.
 *
 * @enum {string}
 */
export const ServiceKeys = Object.freeze({
  AUTH_SERVICE: 'AUTH_SERVICE',
  JOB_SERVICE: 'JOB_SERVICE',
  CANDIDATE_SERVICE: 'CANDIDATE_SERVICE',
  RECRUITER_SERVICE: 'RECRUITER_SERVICE',
  ADMIN_SERVICE: 'ADMIN_SERVICE',
  ASSESSMENT_SERVICE: 'ASSESSMENT_SERVICE',
  INTERVIEW_SERVICE: 'INTERVIEW_SERVICE',
  RESUME_SERVICE: 'RESUME_SERVICE',
  NOTIFICATION_SERVICE: 'NOTIFICATION_SERVICE',
  BACKEND: 'BACKEND',
});

/**
 * ServiceRegistry class.
 *
 * Wraps a Map of service keys to their target base URLs.
 * Consumers call `getUrl(serviceKey)` to resolve a service address.
 *
 * @example
 * import { serviceRegistry, ServiceKeys } from './serviceRegistry.js';
 * const authUrl = serviceRegistry.getUrl(ServiceKeys.AUTH_SERVICE);
 * // => 'http://localhost:5001'
 */
class ServiceRegistry {
  /**
   * Creates a new ServiceRegistry instance.
   * @param {Map<string, string>} registryMap - Initial service key to URL mappings.
   */
  constructor(registryMap) {
    /** @private */
    this._registry = new Map(registryMap);
  }

  /**
   * Resolves the base URL for a given service key.
   *
   * @param {string} serviceKey - One of the ServiceKeys enum values.
   * @returns {string} The base URL of the target service.
   * @throws {Error} If the service key is not registered.
   */
  getUrl(serviceKey) {
    const url = this._registry.get(serviceKey);
    if (!url) {
      throw new Error(
        `ServiceRegistry: No URL registered for service key "${serviceKey}". ` +
        'Check your environment variables or registry configuration.'
      );
    }
    return url;
  }

  /**
   * Resolves the target base URL for a given service key.
   * Service Discovery abstraction point.
   *
   * @param {string} serviceKey - One of the ServiceKeys enum values.
   * @returns {string} The resolved base URL.
   */
  resolve(serviceKey) {
    return this.getUrl(serviceKey);
  }

  /**
   * Checks whether a service key exists in the registry.
   *
   * @param {string} serviceKey - The service key to check.
   * @returns {boolean} True if the key is registered.
   */
  has(serviceKey) {
    return this._registry.has(serviceKey);
  }

  /**
   * Returns all registered service keys.
   *
   * @returns {string[]} Array of registered service keys.
   */
  getKeys() {
    return Array.from(this._registry.keys());
  }

  /**
   * Returns all registry entries as an array of [key, url] pairs.
   * Useful for health checks that need to iterate over every service.
   *
   * @returns {Array<[string, string]>} Array of [serviceKey, url] tuples.
   */
  getEntries() {
    return Array.from(this._registry.entries());
  }
}

/**
 * Pre-built registry instance populated from environment variables.
 * This is the default export consumed by the rest of the gateway.
 *
 * @type {ServiceRegistry}
 */
const serviceRegistry = new ServiceRegistry(
  new Map([
    [ServiceKeys.AUTH_SERVICE, environment.services.authService],
    [ServiceKeys.JOB_SERVICE, environment.services.jobService],
    [ServiceKeys.CANDIDATE_SERVICE, environment.services.candidateService],
    [ServiceKeys.RECRUITER_SERVICE, environment.services.recruiterService],
    [ServiceKeys.ADMIN_SERVICE, environment.services.adminService],
    [ServiceKeys.ASSESSMENT_SERVICE, environment.services.assessmentService],
    [ServiceKeys.INTERVIEW_SERVICE, environment.services.interviewService],
    [ServiceKeys.RESUME_SERVICE, environment.services.resumeService],
    [ServiceKeys.NOTIFICATION_SERVICE, environment.services.notificationService],
    [ServiceKeys.BACKEND, environment.services.backend],
  ])
);

export { serviceRegistry };
export default serviceRegistry;
