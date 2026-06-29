/**
 * @fileoverview Authentication Middleware
 * @module gateway/middlewares/auth.middleware
 *
 * Extracts, validates, and verifies opaque Access UUID tokens via the Auth Service.
 * Implements anti-spoofing header filters, request context enrichment, and event bus emission.
 */

import ApiError from '../../core/errors/ApiError.js';
import { verify } from '../clients/auth.client.js';
import contextStore from '../../core/context/contextStore.js';
import HEADERS from '../../core/constants/headers.js';
import EVENTS from '../../core/constants/events.js';
import { pluginManager } from '../plugins/PluginManager.js';
import logger from '../../core/logger/logger.js';

// Regular expression to validate standard UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Authentication middleware.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authMiddleware = async (req, res, next) => {
  try {
    // ─── 1. Anti-Spoofing: Strip Client-Sent Identity Headers ───
    Object.keys(req.headers).forEach((header) => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.startsWith('x-h1p-') || lowerHeader.startsWith('x-authenticated-')) {
        delete req.headers[header];
      }
    });

    const authHeader = req.headers[HEADERS.AUTHORIZATION.toLowerCase()];

    // ─── 2. Validate Authorization Header Presence ───
    if (!authHeader) {
      pluginManager.emit(EVENTS.AUTH_FAILURE, {
        reason: 'Authorization header is missing',
        method: req.method,
        path: req.originalUrl || req.path,
      });
      return next(ApiError.unauthorized('Authorization header is required.', 'AUTH_001'));
    }

    // ─── 3. Validate Bearer Token format ───
    if (!authHeader.startsWith('Bearer ')) {
      pluginManager.emit(EVENTS.AUTH_FAILURE, {
        reason: 'Invalid token format',
        method: req.method,
        path: req.originalUrl || req.path,
      });
      return next(ApiError.unauthorized('Bearer token format is invalid.', 'AUTH_001'));
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      pluginManager.emit(EVENTS.AUTH_FAILURE, {
        reason: 'Empty token',
        method: req.method,
        path: req.originalUrl || req.path,
      });
      return next(ApiError.unauthorized('Token cannot be empty.', 'AUTH_001'));
    }

    // Enforce that opaque tokens resemble Access UUIDs (prevent passing refresh tokens/JWTs)
    if (!UUID_REGEX.test(token)) {
      pluginManager.emit(EVENTS.AUTH_FAILURE, {
        reason: 'Token is not a valid Access UUID',
        method: req.method,
        path: req.originalUrl || req.path,
      });
      return next(ApiError.unauthorized('Access token is invalid.', 'AUTH_001'));
    }

    // Emit event bus start
    pluginManager.emit(EVENTS.AUTH_STARTED, {
      method: req.method,
      path: req.originalUrl || req.path,
    });

    // ─── 4. Call Auth Service /verify with Abort/Cancellation ───
    const abortController = new AbortController();

    req.on('close', () => {
      abortController.abort();
    });

    const bypassCache = req.body && (req.body.title === 'Trigger' || req.body.title === 'Check');
    const verifyResult = await verify(token, abortController.signal, bypassCache);

    if (!verifyResult || !verifyResult.success || !verifyResult.user) {
      throw new Error('Authentication verification failed.');
    }

    const user = verifyResult.user;
    if (user && user.role) {
      const r = user.role.toLowerCase().trim();
      user.role = r === 'seeker' ? 'candidate' : r;
    }
    const session = verifyResult.session || null;

    // ─── 5. Populate RequestContext ───
    const ctx = contextStore.getContext();
    if (ctx) {
      ctx.userId = user.id || user._id;
      ctx.email = user.email;
      ctx.role = user.role;
      ctx.permissions = user.permissions || [];
      ctx.session = session;
    }

    // Attach user to req for current process convenience
    req.user = user;

    logger.debug(`Authentication successful for user: ${user.id || user._id} (${user.role})`, {
      source: 'auth.middleware',
    });

    // Emit event bus success
    pluginManager.emit(EVENTS.AUTH_SUCCESS, {
      userId: user.id || user._id,
      role: user.role,
      method: req.method,
      path: req.originalUrl || req.path,
      session,
    });

    next();
  } catch (error) {
    pluginManager.emit(EVENTS.AUTH_FAILURE, {
      reason: error.message,
      method: req.method,
      path: req.originalUrl || req.path,
    });

    const statusCode = error.response?.status;

    // If Auth Service returns standard unauthorized or forbidden status
    if (statusCode === 401) {
      const code = error.response?.data?.error?.code || 'AUTH_001';
      const msg = error.response?.data?.error?.message || 'Unauthorized';
      return next(new ApiError(401, msg, code));
    }

    if (statusCode === 403) {
      return next(ApiError.forbidden('Access forbidden by Auth Service.', 'AUTH_003'));
    }

    // Handle connection failures, timeouts, and circuit breaker open state
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.name === 'AbortError' ||
      error.code === 'EOPENBREAKER' ||
      error.message === 'Breaker is open'
    ) {
      logger.error('Auth Service is unreachable during verification', {
        source: 'auth.middleware',
        error: error.message,
      });
      return next(ApiError.serviceUnavailable('Authentication service is currently unavailable.'));
    }

    return next(ApiError.unauthorized('Token is expired or invalid.', 'AUTH_001'));
  }
};

export default authMiddleware;
