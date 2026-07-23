/**
 * @fileoverview Request Validation Middleware
 * @module validators/auth.validator
 */

import ApiError from '../errors/ApiError.js';
import ERROR_CODES from '../constants/errors.js';

/**
 * Validator for /login request body.
 */
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(ApiError.badRequest('Email and password are required.', ERROR_CODES.VALIDATION_001));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(ApiError.badRequest('Invalid email format.', ERROR_CODES.VALIDATION_001));
  }

  if (password.length < 8) {
    return next(ApiError.badRequest('Password must be at least 8 characters long.', ERROR_CODES.VALIDATION_001));
  }

  next();
};

/**
 * Validator for /verify request body.
 */
export const validateVerify = (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(ApiError.badRequest('Token is required.', ERROR_CODES.VALIDATION_001));
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isJwt = token.split('.').length === 3;
  if (!uuidRegex.test(token) && !isJwt) {
    return next(ApiError.badRequest('Token must be a valid UUID or JWT.', ERROR_CODES.VALIDATION_001));
  }

  next();
};

/**
 * Validator for /refresh request body.
 */
export const validateRefresh = (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(ApiError.badRequest('Refresh token is required.', ERROR_CODES.VALIDATION_001));
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(refreshToken)) {
    return next(ApiError.badRequest('Refresh token must be a valid UUID.', ERROR_CODES.VALIDATION_001));
  }

  next();
};

/**
 * Validator for /resource-access-check request body.
 */
export const validateAccessCheck = (req, res, next) => {
  const { userId, resource, action } = req.body;

  if (!userId || !resource || !action) {
    return next(ApiError.badRequest('userId, resource, and action are required.', ERROR_CODES.VALIDATION_001));
  }

  const allowedActions = ['read', 'write', 'delete', 'admin'];
  if (!allowedActions.includes(action)) {
    return next(ApiError.badRequest(`Action must be one of: ${allowedActions.join(', ')}`, ERROR_CODES.VALIDATION_001));
  }

  next();
};

/**
 * Validator for /signup/candidate request body.
 */
export const validateSignupCandidate = (req, res, next) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return next(ApiError.badRequest('Email, password, and name are required.', ERROR_CODES.VALIDATION_001));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(ApiError.badRequest('Invalid email format.', ERROR_CODES.VALIDATION_001));
  }

  if (password.length < 8) {
    return next(ApiError.badRequest('Password must be at least 8 characters long.', ERROR_CODES.VALIDATION_001));
  }

  next();
};

/**
 * Validator for /signup/recruiter request body.
 */
export const validateSignupRecruiter = (req, res, next) => {
  const { email, password, name, company } = req.body;

  if (!email || !password || !name) {
    return next(ApiError.badRequest('Email, password, and name are required.', ERROR_CODES.VALIDATION_001));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(ApiError.badRequest('Invalid email format.', ERROR_CODES.VALIDATION_001));
  }

  if (password.length < 8) {
    return next(ApiError.badRequest('Password must be at least 8 characters long.', ERROR_CODES.VALIDATION_001));
  }

  if (!company || (typeof company === 'object' && !company.name) || (typeof company === 'string' && !company.trim())) {
    return next(ApiError.badRequest('Company name is required for recruiter registration.', ERROR_CODES.VALIDATION_001));
  }

  next();
};

/**
 * Validator for /forgot-password request body.
 */
export const validateForgotPassword = (req, res, next) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return next(ApiError.badRequest('Email and role are required.', ERROR_CODES.VALIDATION_001));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(ApiError.badRequest('Invalid email format.', ERROR_CODES.VALIDATION_001));
  }

  const allowedRoles = ['candidate', 'seeker', 'recruiter', 'admin'];
  if (!allowedRoles.includes(role)) {
    return next(ApiError.badRequest(`Role must be one of: ${allowedRoles.join(', ')}`, ERROR_CODES.VALIDATION_001));
  }

  next();
};

/**
 * Validator for /reset-password request body.
 */
export const validateResetPassword = (req, res, next) => {
  const { email, role, otp, newPassword } = req.body;

  if (!email || !role || !otp || !newPassword) {
    return next(ApiError.badRequest('Email, role, otp, and newPassword are required.', ERROR_CODES.VALIDATION_001));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(ApiError.badRequest('Invalid email format.', ERROR_CODES.VALIDATION_001));
  }

  if (newPassword.length < 8) {
    return next(ApiError.badRequest('newPassword must be at least 8 characters long.', ERROR_CODES.VALIDATION_001));
  }

  next();
};

/**
 * Validator for /change-password request body.
 */
export const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(ApiError.badRequest('currentPassword and newPassword are required.', ERROR_CODES.VALIDATION_001));
  }

  if (newPassword.length < 8) {
    return next(ApiError.badRequest('newPassword must be at least 8 characters long.', ERROR_CODES.VALIDATION_001));
  }

  next();
};

/**
 * Validator for /verify-email request body.
 */
export const validateVerifyEmail = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(ApiError.badRequest('Email is required.', ERROR_CODES.VALIDATION_001));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(ApiError.badRequest('Invalid email format.', ERROR_CODES.VALIDATION_001));
  }

  next();
};

/**
 * Validator for /verify-email/confirm request body.
 */
export const validateConfirmEmail = (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(ApiError.badRequest('Verification token is required.', ERROR_CODES.VALIDATION_001));
  }

  next();
};

/**
 * Validator for /google request body.
 */
export const validateGoogleAuth = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(ApiError.badRequest('Email is required.', ERROR_CODES.VALIDATION_001));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(ApiError.badRequest('Invalid email format.', ERROR_CODES.VALIDATION_001));
  }

  next();
};

export default {
  validateLogin,
  validateVerify,
  validateRefresh,
  validateAccessCheck,
  validateSignupCandidate,
  validateSignupRecruiter,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateVerifyEmail,
  validateConfirmEmail,
  validateGoogleAuth,
};
