/**
 * @fileoverview Session & Token Lifecycle Orchestrator Service
 * @module security/session.service
 */

import SessionRepository from '../repositories/SessionRepository.js';
import RefreshTokenRepository from '../repositories/RefreshTokenRepository.js';
import UserRepository from '../repositories/UserRepository.js';
import AuditRepository from '../repositories/AuditRepository.js';
import { redisClient } from '../config/redis.js';
import { generateAccessToken, generateRefreshToken } from './uuid.service.js';
import jwtService from './jwt.service.js';
import environment from '../config/environment.js';
import logger from '../logger/logger.js';

// Parse TTL strings to seconds (e.g. '15m' -> 900, '7d' -> 604800)
const parseTtlToSeconds = (ttlString) => {
  const num = parseInt(ttlString, 10);
  const unit = ttlString.slice(-1);
  switch (unit) {
    case 's': return num;
    case 'm': return num * 60;
    case 'h': return num * 3600;
    case 'd': return num * 86400;
    default: return num || 900;
  }
};

const ACCESS_TOKEN_TTL_SEC = parseTtlToSeconds(environment.security.jwtAccessExpiresIn);
const REFRESH_TOKEN_TTL_SEC = parseTtlToSeconds(environment.security.jwtRefreshExpiresIn);

/**
 * Cache key prefix for Redis session storage.
 */
const REDIS_SESSION_PREFIX = 'session:';

class SessionService {
  /**
   * Helper to write session data to Redis if connection is ready.
   */
  async _cacheSession(token, jwtToken) {
    if (redisClient.isReady) {
      try {
        const key = `${REDIS_SESSION_PREFIX}${token}`;
        await redisClient.setEx(key, ACCESS_TOKEN_TTL_SEC, jwtToken);
        logger.debug(`Session cached in Redis: ${token}`);
      } catch (err) {
        logger.error('Failed to cache session in Redis:', { error: err.message });
      }
    }
  }

  /**
   * Helper to remove session data from Redis.
   */
  async _uncacheSession(token) {
    if (redisClient.isReady) {
      try {
        const key = `${REDIS_SESSION_PREFIX}${token}`;
        await redisClient.del(key);
        logger.debug(`Session removed from Redis cache: ${token}`);
      } catch (err) {
        logger.error('Failed to remove session from Redis cache:', { error: err.message });
      }
    }
  }

  /**
   * Creates a new session and refresh token set for a user.
   *
   * @param {string} userId - User ObjectId.
   * @param {Object} [clientMetadata={}] - User agent, IP address.
   * @returns {Promise<Object>} Object containing access/refresh tokens and user details.
   */
  async createSession(userId, clientMetadata = {}) {
    const accessToken = generateAccessToken();
    const refreshToken = generateRefreshToken();

    const now = Date.now();
    const accessExpiresAt = new Date(now + ACCESS_TOKEN_TTL_SEC * 1000);
    const refreshExpiresAt = new Date(now + REFRESH_TOKEN_TTL_SEC * 1000);

    // 1. Create session in DB (using opaque UUID)
    const session = await SessionRepository.create({
      userId,
      token: accessToken,
      userAgent: clientMetadata.userAgent || '',
      ipAddress: clientMetadata.ipAddress || '',
      expiresAt: accessExpiresAt,
    });

    // 2. Create refresh token in DB
    await RefreshTokenRepository.create({
      userId,
      token: refreshToken,
      expiresAt: refreshExpiresAt,
    });

    // 3. Populate user info for signing the JWT
    const user = await UserRepository.findById(userId);
    const permissions = user.roleRef?.permissions?.map((p) => p.name) || [];

    const jwtPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions,
      sessionId: session._id.toString(),
    };

    // Generate cryptographically signed JWT
    const jwtToken = jwtService.signToken(jwtPayload, { expiresIn: ACCESS_TOKEN_TTL_SEC });

    // 4. Cache signed JWT in Redis mapping: UUID -> JWT
    await this._cacheSession(accessToken, jwtToken);

    // 5. Write audit log
    await AuditRepository.create({
      userId,
      action: 'LOGIN',
      resource: 'Session',
      ipAddress: clientMetadata.ipAddress,
      userAgent: clientMetadata.userAgent,
      status: 'SUCCESS',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        permissions,
      },
    };
  }

  /**
   * Verifies an active session token.
   *
   * @param {string} token - The opaque access UUID token.
   * @returns {Promise<Object>} Object with success, user, and session.
   */
  async verifySession(token) {
    let jwtToken = null;

    // 1. Try Redis cache lookup for the signed JWT
    if (redisClient.isReady) {
      try {
        const key = `${REDIS_SESSION_PREFIX}${token}`;
        const cachedJwt = await redisClient.get(key);
        if (cachedJwt) {
          logger.debug(`Session cache hit: ${token}`);
          jwtToken = cachedJwt;
        }
      } catch (err) {
        logger.error('Redis lookup error during verification:', { error: err.message });
      }
    }

    let decodedPayload = null;

    if (jwtToken) {
      try {
        // Decode and verify the cryptographically signed JWT using RSA public key
        decodedPayload = jwtService.verifyToken(jwtToken);
      } catch (err) {
        logger.warn('JWT verification failed for cached token:', { error: err.message });
        return { success: false, error: 'Session token has expired or is invalid.' };
      }
    } else {
      // 2. Fallback to Database lookup
      const session = await SessionRepository.findByToken(token);
      if (!session) {
        return { success: false, error: 'Session is invalid, revoked, or expired.' };
      }

      // Re-sign/re-create the JWT since we have database user and permissions details
      const permissions = session.userId.roleRef?.permissions?.map((p) => p.name) || [];
      const jwtPayload = {
        id: session.userId._id.toString(),
        email: session.userId.email,
        role: session.userId.role,
        permissions,
        sessionId: session._id.toString(),
      };

      try {
        // Compute expiration time left in seconds
        const timeLeftSec = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
        if (timeLeftSec === 0) {
          return { success: false, error: 'Session has expired.' };
        }

        jwtToken = jwtService.signToken(jwtPayload, { expiresIn: timeLeftSec });
        decodedPayload = jwtPayload;

        // 3. Repopulate cache
        await this._cacheSession(token, jwtToken);
      } catch (err) {
        logger.error('Error during database fallback JWT signing:', { error: err.message });
        return { success: false, error: 'Failed to verify session.' };
      }
    }

    // Build the verify result payload matching verifySuccessResponse
    const expiresAtIso = decodedPayload.exp 
      ? new Date(decodedPayload.exp * 1000).toISOString()
      : new Date(Date.now() + ACCESS_TOKEN_TTL_SEC * 1000).toISOString();

    const sessionPayload = {
      user: {
        id: decodedPayload.id || decodedPayload.userId,
        email: decodedPayload.email,
        role: decodedPayload.role,
        permissions: decodedPayload.permissions || [],
      },
      session: {
        id: decodedPayload.sessionId,
        token: token,
        expiresAt: expiresAtIso,
      },
    };

    return { success: true, ...sessionPayload };
  }

  /**
   * Refreshes a session using Refresh Token Rotation (RTR).
   * Implements reuse detection to protect against token theft.
   *
   * @param {string} refreshTokenString - Opaque refresh UUID token.
   * @param {Object} [clientMetadata={}] - Browser agent, IP address.
   * @returns {Promise<Object>} New token set.
   * @throws {Error} If token is invalid or reuse is detected.
   */
  async refreshSession(refreshTokenString, clientMetadata = {}) {
    const tokenRecord = await RefreshTokenRepository.findByToken(refreshTokenString);

    if (!tokenRecord) {
      throw new Error('Refresh token is invalid or does not exist.');
    }

    // ─── Token Reuse Detection ───
    if (tokenRecord.isRevoked) {
      const userId = tokenRecord.userId._id;
      logger.warn(`Potential Refresh Token Reuse Detected! Revoking all sessions for user: ${userId}`);

      // Revoke all tokens/sessions for this user
      await SessionRepository.revokeAllByUserId(userId);
      await RefreshTokenRepository.revokeAllByUserId(userId);

      // Audit warning
      await AuditRepository.create({
        userId,
        action: 'TOKEN_REUSE_VIOLATION',
        resource: 'RefreshToken',
        ipAddress: clientMetadata.ipAddress,
        userAgent: clientMetadata.userAgent,
        status: 'FAILURE',
        details: { attemptedToken: refreshTokenString },
      });

      throw new Error('Security violation: Refresh token has already been used.');
    }

    // Check expiration
    if (tokenRecord.expiresAt <= new Date()) {
      throw new Error('Refresh token has expired.');
    }

    const userId = tokenRecord.userId._id;

    // Generate new tokens
    const nextAccessToken = generateAccessToken();
    const nextRefreshToken = generateRefreshToken();

    const now = Date.now();
    const accessExpiresAt = new Date(now + ACCESS_TOKEN_TTL_SEC * 1000);
    const refreshExpiresAt = new Date(now + REFRESH_TOKEN_TTL_SEC * 1000);

    // 1. Create new Session in DB
    const session = await SessionRepository.create({
      userId,
      token: nextAccessToken,
      userAgent: clientMetadata.userAgent || '',
      ipAddress: clientMetadata.ipAddress || '',
      expiresAt: accessExpiresAt,
    });

    // 2. Create new Refresh Token in DB
    await RefreshTokenRepository.create({
      userId,
      token: nextRefreshToken,
      expiresAt: refreshExpiresAt,
    });

    // 3. Rotate old refresh token (mark as revoked and link to new one)
    await RefreshTokenRepository.revoke(refreshTokenString, nextRefreshToken);

    // 4. Cache new session details
    const user = await UserRepository.findById(userId);
    const permissions = user.roleRef?.permissions?.map((p) => p.name) || [];

    const jwtPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions,
      sessionId: session._id.toString(),
    };

    const nextJwtToken = jwtService.signToken(jwtPayload, { expiresIn: ACCESS_TOKEN_TTL_SEC });
    await this._cacheSession(nextAccessToken, nextJwtToken);

    // 5. Audit log
    await AuditRepository.create({
      userId,
      action: 'TOKEN_REFRESH',
      resource: 'Session',
      ipAddress: clientMetadata.ipAddress,
      userAgent: clientMetadata.userAgent,
      status: 'SUCCESS',
    });

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        permissions,
      },
    };
  }

  /**
   * Revokes a session using its access token.
   *
   * @param {string} token - Opaque access UUID token.
   * @returns {Promise<void>}
   */
  async revokeSession(token) {
    const session = await SessionRepository.findByToken(token);
    if (session) {
      await SessionRepository.revokeByToken(token);
      await this._uncacheSession(token);

      await AuditRepository.create({
        userId: session.userId._id,
        action: 'LOGOUT',
        resource: 'Session',
        status: 'SUCCESS',
      });
    }
  }
}

export default new SessionService();
export { SessionService };
