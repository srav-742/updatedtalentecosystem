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
import { generateRandomToken, hashString } from './crypto.service.js';
import jwtService from './jwt.service.js';
import environment from '../config/environment.js';
import logger from '../logger/logger.js';
import roleEngine from '../authorization/roleEngine.js';
import { parseUserAgent } from '../utils/userAgent.js';

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
  async _cacheSession(sessionId, sessionData) {
    if (redisClient.isReady) {
      try {
        const key = `${REDIS_SESSION_PREFIX}${sessionId}`;
        await redisClient.setEx(key, REFRESH_TOKEN_TTL_SEC, JSON.stringify(sessionData));
        logger.debug(`Session cached in Redis: ${sessionId}`);
      } catch (err) {
        logger.error('Failed to cache session in Redis:', { error: err.message });
      }
    }
  }

  /**
   * Helper to remove session data from Redis.
   */
  async _uncacheSession(sessionId) {
    if (redisClient.isReady) {
      try {
        const key = `${REDIS_SESSION_PREFIX}${sessionId}`;
        await redisClient.del(key);
        logger.debug(`Session removed from Redis cache: ${sessionId}`);
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
    const refreshTokenString = generateRefreshToken(); // UUID v4
    const refreshTokenHash = hashString(refreshTokenString, 'sha256');

    const now = Date.now();
    const accessExpiresAt = new Date(now + ACCESS_TOKEN_TTL_SEC * 1000);
    const refreshExpiresAt = new Date(now + REFRESH_TOKEN_TTL_SEC * 1000);

    const user = await UserRepository.findById(userId);
    const normalizedRole = roleEngine.normalizeRole(user.role);
    const permissions = user.roleRef?.permissions?.map((p) => p.name) || [];

    const { device, browser } = parseUserAgent(clientMetadata.userAgent || '');
    const ip = clientMetadata.ipAddress || '';

    // 1. Create session in DB
    const session = await SessionRepository.create({
      userId,
      token: generateRandomToken(16), // keep token unique for backwards compatibility
      refreshTokenHash,
      device,
      browser,
      ip,
      ipAddress: ip,
      expiresAt: refreshExpiresAt,
      tokenVersion: user.tokenVersion || 1,
      revoked: false,
      isActive: true,
      lastActivity: new Date(),
    });

    // 2. Create refresh token in DB (stored hashed)
    await RefreshTokenRepository.create({
      userId,
      token: refreshTokenHash,
      expiresAt: refreshExpiresAt,
      isRevoked: false,
    });

    const jwtPayload = {
      UserId: user._id.toString(),
      userId: user._id.toString(),
      Role: normalizedRole,
      role: normalizedRole,
      Permissions: permissions,
      permissions,
      TokenVersion: user.tokenVersion || 1,
      tokenVersion: user.tokenVersion || 1,
      SessionId: session._id.toString(),
      sessionId: session._id.toString(),
    };

    // Generate cryptographically signed JWT (Lifetime 15 minutes)
    const jwtToken = jwtService.signToken(jwtPayload, { expiresIn: ACCESS_TOKEN_TTL_SEC });

    // 4. Cache Session state in Redis
    const sessionData = {
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion || 1,
      revoked: false,
    };
    await this._cacheSession(session._id.toString(), sessionData);

    // 5. Write audit log
    await AuditRepository.create({
      userId,
      action: 'LOGIN',
      resource: 'Session',
      ipAddress: ip,
      userAgent: clientMetadata.userAgent,
      status: 'SUCCESS',
    });

    return {
      accessToken: jwtToken,
      refreshToken: refreshTokenString,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: normalizedRole,
        permissions,
        tokenVersion: user.tokenVersion || 1,
      },
    };
  }

  /**
   * Verifies an active session token (either legacy UUID or modern JWT).
   *
   * @param {string} token - The access token string (UUID or JWT).
   * @returns {Promise<Object>} Object with success, user, and session.
   */
  async verifySession(token) {
    let decodedPayload = null;
    let isJwt = token.split('.').length === 3;

    if (isJwt) {
      try {
        decodedPayload = jwtService.verifyToken(token);
      } catch (err) {
        logger.warn('JWT verification failed:', { error: err.message });
        return { success: false, error: 'Session token has expired or is invalid.' };
      }
    } else {
      // Legacy UUID flow
      const session = await SessionRepository.findByToken(token);
      if (!session || session.revoked || !session.isActive || session.expiresAt <= new Date()) {
        return { success: false, error: 'Session is invalid, revoked, or expired.' };
      }

      const permissions = session.userId.roleRef?.permissions?.map((p) => p.name) || [];
      const user = session.userId;
      const normalizedRole = roleEngine.normalizeRole(user.role);

      decodedPayload = {
        UserId: user._id.toString(),
        userId: user._id.toString(),
        Role: normalizedRole,
        role: normalizedRole,
        Permissions: permissions,
        permissions,
        TokenVersion: user.tokenVersion || 1,
        tokenVersion: user.tokenVersion || 1,
        SessionId: session._id.toString(),
        sessionId: session._id.toString(),
        exp: Math.floor(session.expiresAt.getTime() / 1000),
      };
    }

    const sessionId = decodedPayload.SessionId || decodedPayload.sessionId;
    const userId = decodedPayload.UserId || decodedPayload.userId;
    const tokenVersion = decodedPayload.TokenVersion || decodedPayload.tokenVersion;

    let sessionData = null;

    // Check Redis cache using sessionId
    if (redisClient.isReady) {
      try {
        const key = `${REDIS_SESSION_PREFIX}${sessionId}`;
        const cached = await redisClient.get(key);
        if (cached) {
          sessionData = JSON.parse(cached);
        }
      } catch (err) {
        logger.error('Redis lookup error during verification:', { error: err.message });
      }
    }

    if (!sessionData) {
      // Fallback to DB
      const session = await SessionRepository.findById(sessionId);
      if (!session || session.revoked || !session.isActive || session.expiresAt <= new Date()) {
        return { success: false, error: 'Session is invalid, revoked, or expired.' };
      }

      sessionData = {
        userId: session.userId._id.toString(),
        tokenVersion: session.tokenVersion,
        revoked: session.revoked,
      };

      // Populate Redis
      if (redisClient.isReady) {
        try {
          const key = `${REDIS_SESSION_PREFIX}${sessionId}`;
          const timeLeftSec = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
          if (timeLeftSec > 0) {
            await redisClient.setEx(key, timeLeftSec, JSON.stringify(sessionData));
          }
        } catch (err) {
          logger.error('Failed to populate Redis cache:', { error: err.message });
        }
      }
    }

    // Verify revoked flag
    if (sessionData.revoked) {
      return { success: false, error: 'Session is revoked.' };
    }

    // Verify user status and token version
    const user = await UserRepository.findById(userId);
    if (!user || !user.isActive) {
      return { success: false, error: 'User account is deactivated or not found.' };
    }

    if (user.tokenVersion !== tokenVersion) {
      // Security mismatch — revoke the specific session
      await this.revokeSessionById(sessionId);
      return { success: false, error: 'Token version mismatch. Please log in again.' };
    }

    // Update last activity
    SessionRepository.updateLastActivity(sessionId).catch(() => {});

    const permissions = user.roleRef?.permissions?.map((p) => p.name) || [];
    const normalizedRole = roleEngine.normalizeRole(user.role);

    const sessionPayload = {
      user: {
        id: user._id.toString(),
        email: user.email,
        role: normalizedRole,
        permissions,
        tokenVersion: user.tokenVersion || 1,
      },
      session: {
        id: sessionId,
        token: token,
        expiresAt: new Date((decodedPayload.exp || (Date.now() / 1000 + ACCESS_TOKEN_TTL_SEC)) * 1000).toISOString(),
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
    const refreshTokenHash = hashString(refreshTokenString, 'sha256');
    const tokenRecord = await RefreshTokenRepository.findByToken(refreshTokenHash);

    if (!tokenRecord) {
      throw new Error('Refresh token is invalid or does not exist.');
    }

    const userId = tokenRecord.userId._id || tokenRecord.userId;

    // ─── Token Reuse Detection ───
    if (tokenRecord.isRevoked) {
      logger.warn(`Potential Refresh Token Reuse Detected! Revoking all sessions for user: ${userId}`);

      // Revoke all tokens/sessions for this user
      await this.revokeAllUserSessions(userId);

      // Audit warning
      await AuditRepository.create({
        userId,
        action: 'TOKEN_REUSE_VIOLATION',
        resource: 'RefreshToken',
        ipAddress: clientMetadata.ipAddress || '',
        userAgent: clientMetadata.userAgent || '',
        status: 'FAILURE',
        details: { attemptedTokenHash: refreshTokenHash },
      });

      throw new Error('Security violation: Refresh token has already been used.');
    }

    // Check expiration
    if (tokenRecord.expiresAt <= new Date()) {
      throw new Error('Refresh token has expired.');
    }

    // Generate rotated tokens
    const nextRefreshTokenString = generateRefreshToken();
    const nextRefreshTokenHash = hashString(nextRefreshTokenString, 'sha256');

    const now = Date.now();
    const accessExpiresAt = new Date(now + ACCESS_TOKEN_TTL_SEC * 1000);
    const refreshExpiresAt = new Date(now + REFRESH_TOKEN_TTL_SEC * 1000);

    const user = await UserRepository.findById(userId);
    const normalizedRole = roleEngine.normalizeRole(user.role);
    const permissions = user.roleRef?.permissions?.map((p) => p.name) || [];

    const { device, browser } = parseUserAgent(clientMetadata.userAgent || '');
    const ip = clientMetadata.ipAddress || '';

    // 1. Create next Session in DB
    const nextSession = await SessionRepository.create({
      userId,
      token: generateRandomToken(16),
      refreshTokenHash: nextRefreshTokenHash,
      device,
      browser,
      ip,
      ipAddress: ip,
      expiresAt: refreshExpiresAt,
      tokenVersion: user.tokenVersion || 1,
      revoked: false,
      isActive: true,
      lastActivity: new Date(),
    });

    // 2. Create next Refresh Token in DB
    await RefreshTokenRepository.create({
      userId,
      token: nextRefreshTokenHash,
      expiresAt: refreshExpiresAt,
      isRevoked: false,
    });

    // 3. Rotate old refresh token
    tokenRecord.isRevoked = true;
    tokenRecord.replacedByToken = nextRefreshTokenHash;
    await tokenRecord.save();

    // 4. Revoke old session associated with the rotated token
    const oldSession = await SessionRepository.findOne({ refreshTokenHash });
    if (oldSession) {
      oldSession.revoked = true;
      oldSession.isActive = false;
      await oldSession.save();
      await this._uncacheSession(oldSession._id.toString());
    }

    // 5. Cache new session details
    const sessionData = {
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion || 1,
      revoked: false,
    };
    await this._cacheSession(nextSession._id.toString(), sessionData);

    const nextJwtPayload = {
      UserId: user._id.toString(),
      userId: user._id.toString(),
      Role: normalizedRole,
      role: normalizedRole,
      Permissions: permissions,
      permissions,
      TokenVersion: user.tokenVersion || 1,
      tokenVersion: user.tokenVersion || 1,
      SessionId: nextSession._id.toString(),
      sessionId: nextSession._id.toString(),
    };

    const nextJwtToken = jwtService.signToken(nextJwtPayload, { expiresIn: ACCESS_TOKEN_TTL_SEC });

    // 6. Audit log
    await AuditRepository.create({
      userId,
      action: 'TOKEN_REFRESH',
      resource: 'Session',
      ipAddress: ip,
      userAgent: clientMetadata.userAgent,
      status: 'SUCCESS',
    });

    return {
      accessToken: nextJwtToken,
      refreshToken: nextRefreshTokenString,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: normalizedRole,
        permissions,
        tokenVersion: user.tokenVersion || 1,
      },
    };
  }

  /**
   * Revokes a session using its access token (JWT or UUID).
   *
   * @param {string} token - Access token.
   * @returns {Promise<void>}
   */
  async revokeSession(token) {
    let sessionId = null;
    let decoded = null;

    if (token.split('.').length === 3) {
      try {
        decoded = jwtService.verifyToken(token, { ignoreExpiration: true });
        sessionId = decoded.SessionId || decoded.sessionId;
      } catch (err) {
        // Ignore token verify error
      }
    }

    let session = null;
    if (sessionId) {
      session = await SessionRepository.findById(sessionId);
    } else {
      session = await SessionRepository.findByToken(token);
    }

    if (session) {
      session.revoked = true;
      session.isActive = false;
      await session.save();

      if (session.refreshTokenHash) {
        await RefreshTokenRepository.revokeByHash(session.refreshTokenHash);
      }

      await this._uncacheSession(session._id.toString());

      await AuditRepository.create({
        userId: session.userId._id || session.userId,
        action: 'LOGOUT',
        resource: 'Session',
        status: 'SUCCESS',
      });
    }
  }

  /**
   * Revokes a session directly by ID.
   *
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async revokeSessionById(sessionId) {
    const session = await SessionRepository.findById(sessionId);
    if (session) {
      session.revoked = true;
      session.isActive = false;
      await session.save();

      if (session.refreshTokenHash) {
        await RefreshTokenRepository.revokeByHash(session.refreshTokenHash);
      }

      await this._uncacheSession(sessionId);
    }
  }

  /**
   * Revokes all active sessions and refresh tokens for a user, clearing Redis cache.
   *
   * @param {string} userId - User ObjectId.
   * @returns {Promise<void>}
   */
  async revokeAllUserSessions(userId) {
    try {
      // Invalidate existing JWTs by incrementing token version on the User
      const user = await UserRepository.findById(userId);
      if (user) {
        const nextVersion = (user.tokenVersion || 1) + 1;
        await UserRepository.update(userId, { tokenVersion: nextVersion });
      }

      const activeSessions = await SessionRepository.findByUserId(userId);
      for (const session of activeSessions) {
        session.revoked = true;
        session.isActive = false;
        await session.save();

        await this._uncacheSession(session._id.toString());
      }

      await RefreshTokenRepository.revokeAllByUserId(userId);
      logger.info(`All sessions and refresh tokens revoked for user: ${userId}`);
    } catch (err) {
      logger.error('Failed to revoke all user sessions:', { error: err.message });
      throw err;
    }
  }
}

export default new SessionService();
export { SessionService };
