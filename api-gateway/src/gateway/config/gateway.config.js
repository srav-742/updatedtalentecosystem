/**
 * @fileoverview Gateway Configuration
 * @module gateway/config/gateway.config
 *
 * Environment-profile-aware gateway configuration. Defines sensible
 * defaults per deployment profile (development, testing, staging, production).
 */

import environment from '../../core/config/environment.js';

/**
 * Profile-specific configuration overrides.
 * @type {Object<string, Object>}
 */
const profiles = {
  development: {
    enableDetailedErrors: true,
    enableRequestLogging: true,
    enableAuditLogging: true,
    enableMetrics: false,
    enableTracing: true,
    enableCircuitBreaker: false,
    proxyTimeout: 10000,
    gatewayTimeout: 60000,
    rateLimitMax: 1000,
    rateLimitWindowMs: 60000,
  },
  testing: {
    enableDetailedErrors: true,
    enableRequestLogging: false,
    enableAuditLogging: false,
    enableMetrics: false,
    enableTracing: false,
    enableCircuitBreaker: false,
    proxyTimeout: 5000,
    gatewayTimeout: 30000,
    rateLimitMax: 10000,
    rateLimitWindowMs: 60000,
  },
  staging: {
    enableDetailedErrors: false,
    enableRequestLogging: true,
    enableAuditLogging: true,
    enableMetrics: true,
    enableTracing: true,
    enableCircuitBreaker: true,
    proxyTimeout: 5000,
    gatewayTimeout: 30000,
    rateLimitMax: 200,
    rateLimitWindowMs: 60000,
  },
  production: {
    enableDetailedErrors: false,
    enableRequestLogging: true,
    enableAuditLogging: true,
    enableMetrics: true,
    enableTracing: true,
    enableCircuitBreaker: true,
    proxyTimeout: 5000,
    gatewayTimeout: 30000,
    rateLimitMax: 100,
    rateLimitWindowMs: 60000,
  },
};

/**
 * Resolved gateway configuration for the current environment.
 * Falls back to development profile for unknown environments.
 *
 * @type {Object}
 */
const gatewayConfig = Object.freeze({
  /** Current profile name */
  profile: environment.nodeEnv,

  /** Gateway version (from package.json or fallback) */
  version: '1.0.0',

  /** Gateway instance identifier */
  gatewayId: `gw-${environment.nodeEnv}-${process.pid}`,

  /** Merge environment overrides with profile defaults */
  ...profiles[environment.nodeEnv] || profiles.development,

  /** Override from environment variables if explicitly set */
  proxyTimeout: environment.timeouts.proxy,
  gatewayTimeout: environment.timeouts.gateway,
  rateLimitMax: environment.rateLimit.max,
  rateLimitWindowMs: environment.rateLimit.windowMs,
});

export default gatewayConfig;
