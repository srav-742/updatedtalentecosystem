/**
 * @fileoverview Auth Service Client
 * @module gateway/clients/auth.client
 *
 * Communicates with the Auth Service to verify tokens, check resource access,
 * manage sessions, and run pings. Uses a dedicated circuit breaker, retry configuration,
 * and short-lived caching.
 */

import CircuitBreaker from 'opossum';
import { createClient } from './base.client.js';
import { serviceRegistry, ServiceKeys } from '../../core/config/serviceRegistry.js';
import environment from '../../core/config/environment.js';
import logger from '../../core/logger/logger.js';
import { circuitBreakerConfig } from '../config/proxy.config.js';
import { pluginManager } from '../plugins/PluginManager.js';
import EVENTS from '../../core/constants/events.js';

/**
 * Auth service Axios client instance.
 * Inherits request/response interceptors, retries, and correlation header injection.
 * @type {import('axios').AxiosInstance}
 */
const authClient = createClient(serviceRegistry.getUrl(ServiceKeys.AUTH_SERVICE));

// ─── Dedicated Opossum Circuit Breaker for Auth Service Client ───
const authBreaker = new CircuitBreaker(
  async (action) => action(),
  {
    ...circuitBreakerConfig,
    name: 'cb-auth-client',
  }
);

authBreaker.on('open', () => {
  logger.warn('Auth Service Circuit Breaker OPEN', {
    source: 'auth.client',
  });
  pluginManager.emit(EVENTS.CIRCUIT_OPEN, { serviceKey: ServiceKeys.AUTH_SERVICE });
});

authBreaker.on('close', () => {
  logger.info('Auth Service Circuit Breaker CLOSED', {
    source: 'auth.client',
  });
  pluginManager.emit(EVENTS.CIRCUIT_CLOSE, { serviceKey: ServiceKeys.AUTH_SERVICE });
});

// ─── In-Memory Verification Cache ───
const verifyCache = new Map();

// Periodic cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of verifyCache.entries()) {
    if (value.expiresAt <= now) {
      verifyCache.delete(key);
    }
  }
}, 30000).unref();

/**
 * Verifies a JWT/access token with the Auth Service.
 * Supports caching and client disconnect cancellation.
 *
 * @param {string} token - The opaque Access UUID.
 * @param {AbortSignal} [abortSignal] - Abort controller signal.
 * @returns {Promise<Object>} Verification response containing user and session.
 */
export const verify = async (token, abortSignal, bypassCache = false) => {
  const cacheEnabled = environment.authCache.enabled && !bypassCache;
  const cacheTtl = environment.authCache.ttlMs;

  if (cacheEnabled) {
    const cached = verifyCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      logger.debug('Verify token cache hit', { source: 'auth.client' });
      return cached.data;
    }
  }

  const result = await authBreaker.fire(async () => {
    const response = await authClient.post(
      '/api/v1/auth/verify',
      { token },
      { signal: abortSignal }
    );
    return response.data;
  });

  // Normalise role to lowercase (e.g. 'RECRUITER' -> 'recruiter', 'seeker' -> 'candidate')
  if (result && result.user && result.user.role) {
    const r = result.user.role.toLowerCase().trim();
    result.user.role = r === 'seeker' ? 'candidate' : r;
  }
  if (result && result.data && result.data.user && result.data.user.role) {
    const r = result.data.user.role.toLowerCase().trim();
    result.data.user.role = r === 'seeker' ? 'candidate' : r;
  }

  if (cacheEnabled && result && result.success) {
    verifyCache.set(token, {
      data: result,
      expiresAt: Date.now() + cacheTtl,
    });
  }

  return result;
};

/**
 * Backwards compatible alias for verify.
 */
export const verifyToken = async (token) => {
  const res = await verify(token);
  // Return the user part as older middleware expected
  return res.user || res.data || res;
};

/**
 * Checks resource access for a user.
 */
export const checkResourceAccess = async (userId, role, permissions, resource, action, abortSignal) => {
  return authBreaker.fire(async () => {
    const response = await authClient.post(
      '/api/v1/auth/resource-access-check',
      { userId, role, permissions, resource, action },
      { signal: abortSignal }
    );
    return response.data;
  });
};

/**
 * Refreshes an access token using a refresh token.
 */
export const refresh = async (refreshToken, abortSignal) => {
  return authBreaker.fire(async () => {
    const response = await authClient.post(
      '/api/v1/auth/refresh',
      { refreshToken },
      { signal: abortSignal }
    );
    return response.data;
  });
};

/**
 * Logs out a session using the token.
 */
export const logout = async (token, abortSignal) => {
  return authBreaker.fire(async () => {
    const response = await authClient.post(
      '/api/v1/auth/logout',
      { token },
      { signal: abortSignal }
    );
    return response.data;
  });
};

/**
 * Pings the Auth Service health check.
 */
export const health = async (abortSignal) => {
  return authBreaker.fire(async () => {
    const response = await authClient.get(
      '/api/v1/auth/health',
      { signal: abortSignal }
    );
    return response.data;
  });
};

/**
 * Fallback backward compatible user profile fetch.
 */
export const getUserProfile = async (userId) => {
  return authBreaker.fire(async () => {
    const response = await authClient.get(`/api/v1/auth/users/${userId}`);
    return response.data?.data || response.data;
  });
};

export default {
  verify,
  verifyToken,
  checkResourceAccess,
  refresh,
  logout,
  health,
  getUserProfile,
};
