/**
 * @fileoverview Event Name Constants
 * @module core/constants/events
 *
 * Centralized event name registry used by the plugin system, audit logger,
 * and metrics collector. Every event emitted or listened to in the gateway
 * should be referenced from this module.
 */

/**
 * Gateway lifecycle and operational event names.
 * @enum {string}
 */
const EVENTS = Object.freeze({
  // ─── Request Lifecycle ───────────────────────────────
  REQUEST_RECEIVED: 'gateway:request:received',
  REQUEST_VALIDATED: 'gateway:request:validated',
  AUTH_STARTED: 'gateway:auth:started',
  AUTH_SUCCESS: 'gateway:auth:success',
  AUTH_FAILED: 'gateway:auth:failure',
  POLICY_STARTED: 'gateway:policy:started',
  POLICY_PASSED: 'gateway:policy:pass',
  POLICY_DENIED: 'gateway:policy:deny',
  PROXY_STARTED: 'gateway:proxy:start',
  PROXY_COMPLETED: 'gateway:proxy:end',
  PROXY_FAILED: 'gateway:proxy:error',
  REQUEST_COMPLETED: 'gateway:request:completed',

  // ─── Proxy Events ───────────────────────────────────
  PROXY_REQUEST_START: 'gateway:proxy:start',
  PROXY_REQUEST_END: 'gateway:proxy:end',
  PROXY_REQUEST_ERROR: 'gateway:proxy:error',
  PROXY_TIMEOUT: 'gateway:proxy:timeout',

  // ─── Circuit Breaker Events ─────────────────────────
  CIRCUIT_OPEN: 'gateway:circuit:open',
  CIRCUIT_HALF_OPEN: 'gateway:circuit:halfOpen',
  CIRCUIT_CLOSE: 'gateway:circuit:close',
  CIRCUIT_FALLBACK: 'gateway:circuit:fallback',

  // ─── Rate Limiting Events ───────────────────────────
  RATE_LIMIT_HIT: 'gateway:rateLimit:hit',
  RATE_LIMIT_EXCEEDED: 'gateway:rateLimit:exceeded',

  // ─── Server Lifecycle ───────────────────────────────
  SERVER_STARTING: 'gateway:server:starting',
  SERVER_READY: 'gateway:server:ready',
  SERVER_SHUTTING_DOWN: 'gateway:server:shuttingDown',
  SERVER_SHUTDOWN_COMPLETE: 'gateway:server:shutdownComplete',

  // ─── Health Events ──────────────────────────────────
  HEALTH_CHECK_START: 'gateway:health:start',
  HEALTH_CHECK_COMPLETE: 'gateway:health:complete',
  SERVICE_HEALTHY: 'gateway:service:healthy',
  SERVICE_UNHEALTHY: 'gateway:service:unhealthy',
});

export default EVENTS;
