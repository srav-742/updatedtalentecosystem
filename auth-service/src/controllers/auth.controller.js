/**
 * @fileoverview Authentication & Authorization Controller
 * @module controllers/auth.controller
 */

import UserRepository from '../repositories/UserRepository.js';
import RefreshTokenRepository from '../repositories/RefreshTokenRepository.js';
import passwordService from '../security/password.service.js';
import SessionService from '../security/session.service.js';
import resourceAccessChecker from '../authorization/resourceAccessChecker.js';
import roleEngine from '../authorization/roleEngine.js';
import ApiError from '../errors/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import STATUS_CODES from '../constants/statusCodes.js';
import MESSAGES from '../constants/messages.js';
import ERROR_CODES from '../constants/errors.js';

/**
 * Handles user login/authentication.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await UserRepository.findByEmailWithPermissions(email);
    if (!user) {
      throw ApiError.invalidCredentials();
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account is deactivated.', ERROR_CODES.AUTH_001);
    }

    const isMatch = await passwordService.comparePassword(password, user.password);
    if (!isMatch) {
      throw ApiError.invalidCredentials();
    }

    const clientMetadata = {
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };

    const sessionResult = await SessionService.createSession(user._id, clientMetadata);
    
    // Normalize role (seeker -> candidate)
    const normalizedRole = roleEngine.normalizeRole(user.role);

    // Profile properties mapping
    const firstName = user.name ? user.name.split(' ')[0] : '';
    const lastName = user.name && user.name.split(' ').length > 1 ? user.name.split(' ').slice(1).join(' ') : '';

    sendSuccess(res, {
      status: STATUS_CODES.OK,
      message: MESSAGES.AUTH_LOGIN_SUCCESS,
      data: {
        accessToken: sessionResult.accessToken,
        refreshToken: sessionResult.refreshToken,
        expiresIn: sessionResult.expiresIn,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: normalizedRole,
          permissions: user.roleRef?.permissions?.map((p) => p.name) || [],
          isActive: user.isActive,
          profile: {
            firstName,
            lastName,
          },
          tokenVersion: user.tokenVersion || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles token verification check.
 */
export const verify = async (req, res, next) => {
  try {
    const { token } = req.body;

    const verifyResult = await SessionService.verifySession(token);
    if (!verifyResult || !verifyResult.success || !verifyResult.user) {
      throw ApiError.tokenInvalid(verifyResult.error || MESSAGES.AUTH_TOKEN_INVALID);
    }

    const user = verifyResult.user;
    const session = verifyResult.session;

    // Normalize user role and populate profile details
    const normalizedRole = roleEngine.normalizeRole(user.role);

    // Resolve the user from database to get correct name/profile details
    const fullUser = await UserRepository.findById(user.id);
    const firstName = fullUser?.name ? fullUser.name.split(' ')[0] : '';
    const lastName = fullUser?.name && fullUser.name.split(' ').length > 1 ? fullUser.name.split(' ').slice(1).join(' ') : '';

    const normalizedUser = {
      id: user.id,
      email: user.email,
      role: normalizedRole,
      permissions: user.permissions || [],
      isActive: fullUser ? fullUser.isActive : true,
      profile: {
        firstName,
        lastName,
      },
      tokenVersion: fullUser?.tokenVersion || 1,
    };

    const sessionMetadata = {
      sessionId: session.id,
      expiresAt: session.expiresAt,
      tokenVersion: fullUser?.tokenVersion || 1,
      createdAt: fullUser?.createdAt || new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };

    // To satisfy both API Gateway auth.middleware (needs root level fields)
    // and OpenAPI specification (needs fields nested inside "data"), return both!
    res.status(STATUS_CODES.OK).json({
      success: true,
      user: normalizedUser,
      session: sessionMetadata,
      data: {
        user: normalizedUser,
        session: sessionMetadata,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles Token Rotation (RTR).
 */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const clientMetadata = {
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };

    const refreshResult = await SessionService.refreshSession(refreshToken, clientMetadata);
    const user = refreshResult.user;

    // Normalize user role and profile details
    const normalizedRole = roleEngine.normalizeRole(user.role);

    // Resolve the user from database to get correct name/profile details
    const fullUser = await UserRepository.findById(user.id);
    const firstName = fullUser?.name ? fullUser.name.split(' ')[0] : '';
    const lastName = fullUser?.name && fullUser.name.split(' ').length > 1 ? fullUser.name.split(' ').slice(1).join(' ') : '';

    const normalizedUser = {
      id: user.id,
      email: user.email,
      role: normalizedRole,
      permissions: user.permissions || [],
      isActive: fullUser ? fullUser.isActive : true,
      profile: {
        firstName,
        lastName,
      },
      tokenVersion: fullUser?.tokenVersion || 1,
    };

    sendSuccess(res, {
      status: STATUS_CODES.OK,
      message: MESSAGES.SUCCESS,
      data: {
        accessToken: refreshResult.accessToken,
        refreshToken: refreshResult.refreshToken,
        expiresIn: refreshResult.expiresIn,
        user: normalizedUser,
      },
    });
  } catch (error) {
    // Map refresh token evaluation failures to 401 Unauthorized
    next(ApiError.unauthorized(error.message, ERROR_CODES.AUTH_003));
  }
};

/**
 * Handles user logout and token revocation.
 */
export const logout = async (req, res, next) => {
  try {
    // 1. Try to extract and revoke session token
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-h1p-session']) {
      try {
        const sessionHeader = JSON.parse(req.headers['x-h1p-session']);
        token = sessionHeader.token;
      } catch {
        // Ignore JSON parsing errors
      }
    } else if (req.body.token) {
      token = req.body.token;
    }

    if (token) {
      await SessionService.revokeSession(token);
    }

    // 2. Try to revoke refresh token if provided in body
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshTokenRepository.revoke(refreshToken);
    }

    res.status(STATUS_CODES.OK).json({
      success: true,
      message: MESSAGES.AUTH_LOGOUT_SUCCESS,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Evaluates fine-grained authorization policies.
 */
export const resourceAccessCheck = async (req, res, next) => {
  try {
    const { userId, role, permissions, resource, action } = req.body;

    const result = await resourceAccessChecker.checkAccess({
      userId,
      role,
      permissions,
      resource,
      action,
    });

    res.status(STATUS_CODES.OK).json({
      success: true,
      data: {
        allowed: result.allowed,
        reason: result.reason || (result.allowed ? 'Access allowed.' : 'Access denied.'),
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  login,
  verify,
  refresh,
  logout,
  resourceAccessCheck,
};
