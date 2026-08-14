/**
 * @fileoverview Authentication & Authorization Controller
 * @module controllers/auth.controller
 */

import UserRepository from '../repositories/UserRepository.js';
import RefreshTokenRepository from '../repositories/RefreshTokenRepository.js';
import ClientRepository from '../repositories/ClientRepository.js';
import PasswordResetOtpRepository from '../repositories/PasswordResetOtpRepository.js';
import RoleRepository from '../repositories/RoleRepository.js';
import PermissionRepository from '../repositories/PermissionRepository.js';
import AuditRepository from '../repositories/AuditRepository.js';
import passwordService from '../security/password.service.js';
import SessionService from '../security/session.service.js';
import { generateRandomToken } from '../security/crypto.service.js';
import resourceAccessChecker from '../authorization/resourceAccessChecker.js';
import roleEngine from '../authorization/roleEngine.js';
import ApiError from '../errors/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import STATUS_CODES from '../constants/statusCodes.js';
import logger from '../logger/logger.js';
import MESSAGES from '../constants/messages.js';
import ERROR_CODES from '../constants/errors.js';

// Mongoose Models and Redis Client for Diagnostics
import User from '../models/User.js';
import Client from '../models/Client.js';
import Session from '../models/Session.js';
import RefreshToken from '../models/RefreshToken.js';
import AuditLog from '../models/AuditLog.js';
import { redisClient } from '../config/redis.js';

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
      await SessionService.revokeRefreshToken(refreshToken);
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

/**
 * Helper to retrieve or create default roles and permissions in the database.
 */
const getOrCreateRoleAndPermissions = async (roleName, permissionNames) => {
  const permissionIds = [];
  for (const permName of permissionNames) {
    let perm = await PermissionRepository.findByName(permName);
    if (!perm) {
      perm = await PermissionRepository.create({
        name: permName,
        description: `Default permission ${permName}`,
        module: permName.split(':')[0] || 'general',
      });
    }
    permissionIds.push(perm._id);
  }

  let role = await RoleRepository.findByName(roleName);
  if (!role) {
    role = await RoleRepository.create({
      name: roleName,
      description: `${roleName} Role`,
      permissions: permissionIds,
    });
  } else {
    for (const pId of permissionIds) {
      if (!role.permissions.some((p) => p._id.toString() === pId.toString())) {
        role = await RoleRepository.addPermission(role._id, pId);
      }
    }
  }
  return role;
};

/**
 * Handles recruiter registration.
 */
export const signupRecruiter = async (req, res, next) => {
  try {
    const { email, password, name, company, designation, phone, location } = req.body;

    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw ApiError.badRequest('This email is already registered.', ERROR_CODES.AUTH_006);
    }

    const recruiterRole = await getOrCreateRoleAndPermissions('recruiter', ['POST_JOB']);

    const hashedPassword = await passwordService.hashPassword(password);

    const user = await UserRepository.create({
      email,
      password: hashedPassword,
      name,
      role: 'recruiter',
      roleRef: recruiterRole._id,
      isActive: true,
      designation: designation || '',
      phone: phone || '',
      location: location || '',
      company: typeof company === 'string' ? { name: company } : company,
      isEmailVerified: false,
    });

    const clientId = `client_${user._id}`;
    const plaintextSecret = `h1p_sec_${generateRandomToken(16)}`;
    const hashedSecret = await passwordService.hashPassword(plaintextSecret);

    const client = await ClientRepository.create({
      clientId,
      clientSecret: hashedSecret,
      userId: user._id,
      name: `Client for Recruiter ${user.name || user.email}`,
      description: `API Client for recruiter: ${user.email}`,
      status: 'active',
    });

    await AuditRepository.create({
      userId: user._id,
      action: 'SIGNUP_RECRUITER',
      resource: 'User',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      status: 'SUCCESS',
      details: { clientId },
    });

    sendSuccess(res, {
      status: STATUS_CODES.CREATED,
      message: 'Recruiter registration successful.',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          role: 'recruiter',
          isActive: user.isActive,
        },
        client: {
          clientId: client.clientId,
          clientSecret: plaintextSecret,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles candidate registration.
 */
export const signupCandidate = async (req, res, next) => {
  try {
    const { email, password, name, profilePic, phone, location } = req.body;

    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw ApiError.badRequest('This email is already registered.', ERROR_CODES.AUTH_006);
    }

    const candidateRole = await getOrCreateRoleAndPermissions('candidate', []);

    const hashedPassword = await passwordService.hashPassword(password);

    const user = await UserRepository.create({
      email,
      password: hashedPassword,
      name,
      role: 'candidate',
      roleRef: candidateRole._id,
      isActive: true,
      profilePic: profilePic || '',
      phone: phone || '',
      location: location || '',
      isEmailVerified: false,
    });

    await AuditRepository.create({
      userId: user._id,
      action: 'SIGNUP_CANDIDATE',
      resource: 'User',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      status: 'SUCCESS',
    });

    sendSuccess(res, {
      status: STATUS_CODES.CREATED,
      message: 'Candidate registration successful.',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          role: 'candidate',
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles password reset initiation.
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const dbRole = role;

    const user = await UserRepository.findByEmail(normalizedEmail);
    if (!user || user.role !== dbRole) {
      throw ApiError.notFound('No account found with this email and role.', ERROR_CODES.AUTH_004);
    }

    if (!user.password) {
      throw ApiError.badRequest('This account uses Google Sign-In. Please continue with Google to access your account.', ERROR_CODES.VALIDATION_001);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await passwordService.hashPassword(otp);

    const expiryMinutes = 10;
    const expiresAt = new Date(Date.now() + (expiryMinutes * 60 * 1000));

    await PasswordResetOtpRepository.deleteManyByEmail(normalizedEmail);
    await PasswordResetOtpRepository.create({
      email: normalizedEmail,
      otp: hashedOtp,
      expiresAt,
      verified: false,
    });

    logger.info(`\n==============================================`);
    logger.info(`[AUTH-FORGOT] Generated OTP for ${normalizedEmail}: ${otp}`);
    logger.info(`==============================================\n`);

    await AuditRepository.create({
      userId: user._id,
      action: 'FORGOT_PASSWORD_REQUEST',
      resource: 'PasswordResetOtp',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      status: 'SUCCESS',
    });

    let emailSent = false;
    try {
      const nodemailer = await import('nodemailer').catch(() => null);
      if (nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        await transporter.sendMail({
          from: `"Talent Ecosystem Support" <${process.env.SMTP_USER}>`,
          to: normalizedEmail,
          subject: 'Password Reset Verification Code',
          text: `Your Hire1Percent verification code is: ${otp}. Expires in ${expiryMinutes} minutes.`,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; margin: auto; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff;">
              <h2 style="color: #0f172a; margin-bottom: 8px;">Password Reset Request</h2>
              <p style="color: #64748b; font-size: 14px;">Your Hire1Percent verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; background: #f1f5f9; padding: 16px; text-align: center; border-radius: 8px; margin: 24px 0; color: #3b82f6; letter-spacing: 6px;">
                  ${otp}
              </div>
              <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Expires in ${expiryMinutes} minutes. If you did not request this, you can safely ignore this email.</p>
          </div>`,
        });
        emailSent = true;
      }
    } catch (mailErr) {
      logger.warn('[AUTH-FORGOT] SMTP mailing skipped:', { error: mailErr.message });
    }

    const responseData = {
      message: emailSent
        ? 'A verification code has been sent to your email.'
        : 'Reset code generated successfully.',
    };

    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      responseData.devOtp = otp;
    }

    sendSuccess(res, {
      status: STATUS_CODES.OK,
      message: responseData.message,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles OTP verification.
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecords = await PasswordResetOtpRepository.findActiveUnverified(normalizedEmail);
    if (otpRecords.length === 0) {
      throw ApiError.badRequest('Invalid or expired verification code.', ERROR_CODES.VALIDATION_001);
    }

    let matchedRecord = null;
    for (const record of otpRecords) {
      const isMatch = await passwordService.comparePassword(otp, record.otp);
      if (isMatch) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) {
      throw ApiError.badRequest('Invalid or expired verification code.', ERROR_CODES.VALIDATION_001);
    }

    matchedRecord.verified = true;
    await matchedRecord.save();

    sendSuccess(res, {
      status: STATUS_CODES.OK,
      message: 'Verification code verified successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles password resetting.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, role, otp, newPassword } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const dbRole = role;

    let verifiedOtp = null;
    if (otp) {
      const otpRecords = await PasswordResetOtpRepository.findActiveUnverified(normalizedEmail);
      let matchedRecord = null;
      for (const record of otpRecords) {
        const isMatch = await passwordService.comparePassword(otp, record.otp);
        if (isMatch) {
          matchedRecord = record;
          break;
        }
      }
      if (matchedRecord) {
        matchedRecord.verified = true;
        await matchedRecord.save();
        verifiedOtp = matchedRecord;
      }
    }

    if (!verifiedOtp) {
      verifiedOtp = await PasswordResetOtpRepository.findRecentlyVerified(normalizedEmail);
    }

    if (!verifiedOtp) {
      throw ApiError.badRequest('Verification code not verified or session expired. Please verify again.', ERROR_CODES.VALIDATION_001);
    }

    const user = await UserRepository.findByEmail(normalizedEmail);
    if (!user || user.role !== dbRole) {
      throw ApiError.notFound('No account found with this email and role.', ERROR_CODES.AUTH_004);
    }

    const hashedPassword = await passwordService.hashPassword(newPassword);
    const tokenVersion = (user.tokenVersion || 1) + 1;
    await UserRepository.update(user._id, { password: hashedPassword, tokenVersion });

    await SessionService.revokeAllUserSessions(user._id);
    await PasswordResetOtpRepository.deleteManyByEmail(normalizedEmail);

    await AuditRepository.create({
      userId: user._id,
      action: 'RESET_PASSWORD',
      resource: 'User',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      status: 'SUCCESS',
    });

    sendSuccess(res, {
      status: STATUS_CODES.OK,
      message: 'Password reset successful! Please log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles password changes for logged-in users.
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      throw ApiError.unauthorized('Authentication token is required.', ERROR_CODES.AUTH_001);
    }

    const verifyResult = await SessionService.verifySession(token);
    if (!verifyResult || !verifyResult.success || !verifyResult.user) {
      throw ApiError.unauthorized('Invalid or expired authentication token.', ERROR_CODES.AUTH_003);
    }

    const userId = verifyResult.user.id;
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found.', ERROR_CODES.AUTH_004);
    }

    const isMatch = await passwordService.comparePassword(currentPassword, user.password);
    if (!isMatch) {
      throw ApiError.badRequest('Invalid current password.', ERROR_CODES.AUTH_004);
    }

    const hashedPassword = await passwordService.hashPassword(newPassword);
    const tokenVersion = (user.tokenVersion || 1) + 1;
    await UserRepository.update(user._id, { password: hashedPassword, tokenVersion });

    await SessionService.revokeAllUserSessions(user._id);

    await AuditRepository.create({
      userId: user._id,
      action: 'CHANGE_PASSWORD',
      resource: 'User',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      status: 'SUCCESS',
    });

    sendSuccess(res, {
      status: STATUS_CODES.OK,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Initiates/resends email verification.
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await UserRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw ApiError.notFound('User not found.', ERROR_CODES.AUTH_004);
    }

    const token = generateRandomToken(32);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await UserRepository.update(user._id, {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    });

    logger.info(`\n==============================================`);
    logger.info(`[EMAIL-VERIFY] Verification token for ${normalizedEmail}: ${token}`);
    logger.info(`==============================================\n`);

    await AuditRepository.create({
      userId: user._id,
      action: 'EMAIL_VERIFICATION_REQUEST',
      resource: 'User',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      status: 'SUCCESS',
    });

    const responseData = {
      message: 'Verification link/token generated successfully.',
    };

    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      responseData.devToken = token;
    }

    sendSuccess(res, {
      status: STATUS_CODES.OK,
      message: responseData.message,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirms email verification token.
 */
export const confirmEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    const user = await UserRepository.findByVerificationToken(token);
    if (!user) {
      throw ApiError.badRequest('Invalid or expired verification token.', ERROR_CODES.VALIDATION_001);
    }

    await UserRepository.update(user._id, {
      isEmailVerified: true,
      isActive: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    });

    await AuditRepository.create({
      userId: user._id,
      action: 'EMAIL_VERIFIED',
      resource: 'User',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      status: 'SUCCESS',
    });

    sendSuccess(res, {
      status: STATUS_CODES.OK,
      message: 'Email verified and account activated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles Google OAuth login & signup.
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { email, name, profilePic, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    let user = await UserRepository.findByEmailWithPermissions(normalizedEmail);
    let isNewUser = false;

    if (!user) {
      if (!role) {
        throw ApiError.badRequest('Role is required for first-time Google signup.', ERROR_CODES.VALIDATION_001);
      }

      const dbRoleName = role;
      const defaultPerms = dbRoleName === 'recruiter' ? ['POST_JOB'] : [];
      const userRoleRef = await getOrCreateRoleAndPermissions(dbRoleName, defaultPerms);

      user = await UserRepository.create({
        email: normalizedEmail,
        name: name || '',
        profilePic: profilePic || '',
        role: dbRoleName,
        roleRef: userRoleRef._id,
        isActive: true,
        isEmailVerified: true,
      });

      isNewUser = true;
    } else {
      const requestedRole = role;
      if (requestedRole && user.role !== requestedRole) {
        throw ApiError.badRequest(`This email is already registered as a ${user.role}. Please log in with that role.`, ERROR_CODES.AUTH_002);
      }

      if (profilePic && (!user.profilePic || user.profilePic.startsWith('http'))) {
        user = await UserRepository.update(user._id, { profilePic });
      }
    }

    let clientCredentials = null;
    if (user.role === 'recruiter') {
      const existingClient = await ClientRepository.findByUserId(user._id);
      if (existingClient.length === 0) {
        const clientId = `client_${user._id}`;
        const plaintextSecret = `h1p_sec_${generateRandomToken(16)}`;
        const hashedSecret = await passwordService.hashPassword(plaintextSecret);

        await ClientRepository.create({
          clientId,
          clientSecret: hashedSecret,
          userId: user._id,
          name: `Client for Recruiter ${user.name || user.email}`,
          description: `API Client for recruiter: ${user.email}`,
          status: 'active',
        });

        clientCredentials = {
          clientId,
          clientSecret: plaintextSecret,
        };
      }
    }

    const clientMetadata = {
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    };

    const sessionResult = await SessionService.createSession(user._id, clientMetadata);
    const normalizedRole = roleEngine.normalizeRole(user.role);

    await AuditRepository.create({
      userId: user._id,
      action: isNewUser ? 'GOOGLE_SIGNUP' : 'GOOGLE_LOGIN',
      resource: 'User',
      ipAddress: clientMetadata.ipAddress,
      userAgent: clientMetadata.userAgent,
      status: 'SUCCESS',
    });

    const firstName = user.name ? user.name.split(' ')[0] : '';
    const lastName = user.name && user.name.split(' ').length > 1 ? user.name.split(' ').slice(1).join(' ') : '';

    const responsePayload = {
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
    };

    if (clientCredentials) {
      responsePayload.client = clientCredentials;
    }

    sendSuccess(res, {
      status: STATUS_CODES.OK,
      message: isNewUser ? 'Google registration successful.' : 'Google login successful.',
      data: responsePayload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles logout from all devices.
 */
export const logoutAll = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      throw ApiError.unauthorized('Authentication token is required.', ERROR_CODES.AUTH_001);
    }

    const verifyResult = await SessionService.verifySession(token);
    if (!verifyResult || !verifyResult.success || !verifyResult.user) {
      throw ApiError.unauthorized('Invalid or expired authentication token.', ERROR_CODES.AUTH_003);
    }

    const userId = verifyResult.user.id;
    await SessionService.revokeAllUserSessions(userId);

    await AuditRepository.create({
      userId,
      action: 'LOGOUT_ALL_DEVICES',
      resource: 'Session',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      status: 'SUCCESS',
    });

    res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Successfully logged out from all devices.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles Firebase credential exchange for API Gateway tokens.
 */
export const gatewayTokenExchange = async (req, res, next) => {
  try {
    const { email, uid } = req.body;
    if (!email && !uid) {
      throw ApiError.badRequest('Email or UID is required.', ERROR_CODES.VALIDATION_001);
    }

    let user;
    if (uid) {
      user = await UserRepository.findByUid(uid);
    } else if (email) {
      user = await UserRepository.findByEmail(email);
    }

    if (!user) {
      throw ApiError.notFound('User not found.', ERROR_CODES.AUTH_004);
    }

    const clientMetadata = {
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };

    const sessionResult = await SessionService.createSession(user._id, clientMetadata);

    res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Tokens issued successfully.',
      accessToken: sessionResult.accessToken,
      refreshToken: sessionResult.refreshToken,
      user: {
        id: user._id.toString(),
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      data: {
        accessToken: sessionResult.accessToken,
        refreshToken: sessionResult.refreshToken,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns database and Redis state summaries for the security dashboard overlay.
 */
export const getDiagnosticsState = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(5).select('email role isActive name uid tokenVersion password').lean();
    const clients = await Client.find().sort({ createdAt: -1 }).limit(5).lean();
    const sessions = await Session.find().sort({ createdAt: -1 }).limit(5).lean();
    const refreshTokens = await RefreshToken.find().sort({ createdAt: -1 }).limit(5).lean();
    const auditLogs = await AuditLog.find().sort({ timestamp: -1 }).limit(10).lean();

    let redisKeys = [];
    try {
      if (redisClient.isOpen) {
        const keys = await redisClient.keys('session:*');
        for (const key of keys) {
          const val = await redisClient.get(key);
          const ttl = await redisClient.ttl(key);
          let parsedVal = {};
          try {
            parsedVal = JSON.parse(val || '{}');
          } catch (e) {
            parsedVal = { raw: val };
          }
          redisKeys.push({ key, value: parsedVal, ttl });
        }
      }
    } catch (redisError) {
      console.error('Redis diagnostics error:', redisError.message);
    }

    res.status(STATUS_CODES.OK).json({
      success: true,
      data: {
        users: users.map(u => ({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          uid: u.uid,
          tokenVersion: u.tokenVersion,
          hasHashedPassword: u.password ? u.password.startsWith('$2a$') || u.password.startsWith('$2b$') : false,
          passwordPrefix: u.password ? u.password.substring(0, 10) + '...' : null,
        })),
        clients: clients.map(c => ({
          id: c._id,
          clientId: c.clientId,
          status: c.status,
          hasHashedSecret: c.clientSecret ? c.clientSecret.startsWith('$2a$') || c.clientSecret.startsWith('$2b$') : false,
          clientSecretPrefix: c.clientSecret ? c.clientSecret.substring(0, 10) + '...' : null,
        })),
        sessions: sessions.map(s => ({
          id: s._id,
          userId: s.userId,
          device: s.device,
          browser: s.browser,
          ip: s.ip,
          revoked: s.revoked,
          tokenVersion: s.tokenVersion,
          lastActivity: s.lastActivity,
          hasHashedRefreshToken: s.refreshTokenHash ? true : false,
          refreshTokenHashPrefix: s.refreshTokenHash ? s.refreshTokenHash.substring(0, 10) + '...' : null,
        })),
        refreshTokens: refreshTokens.map(rt => ({
          id: rt._id,
          userId: rt.userId,
          revoked: rt.revoked,
          expiresAt: rt.expiresAt,
          hasHashedToken: rt.token ? true : false,
          tokenPrefix: rt.token ? rt.token.substring(0, 10) + '...' : null,
          replacedByTokenPrefix: rt.replacedByToken ? rt.replacedByToken.substring(0, 10) + '...' : null,
        })),
        auditLogs,
        redis: redisKeys,
      }
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
  logoutAll,
  resourceAccessCheck,
  signupRecruiter,
  signupCandidate,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
  verifyEmail,
  confirmEmail,
  googleLogin,
  gatewayTokenExchange,
  getDiagnosticsState,
};
