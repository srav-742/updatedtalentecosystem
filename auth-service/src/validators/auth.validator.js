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
  if (!uuidRegex.test(token)) {
    return next(ApiError.badRequest('Token must be a valid UUID.', ERROR_CODES.VALIDATION_001));
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

export default {
  validateLogin,
  validateVerify,
  validateRefresh,
  validateAccessCheck,
};
