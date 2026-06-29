import { ValidationError } from '../errors/index.js';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidEmail = (email) => typeof email === 'string' && EMAIL_REGEX.test(email);
export const isValidUuid = (uuid) => typeof uuid === 'string' && UUID_REGEX.test(uuid);

export const validatePagination = (options = {}) => {
  const page = parseInt(options.page, 10);
  const limit = parseInt(options.limit, 10);
  return {
    page: isNaN(page) || page <= 0 ? 1 : page,
    limit: isNaN(limit) || limit <= 0 ? 10 : limit,
  };
};

/**
 * Higher-order middleware for validating request bodies, query params, etc.
 * 
 * @param {Function} validateFn - Function that returns null/undefined if valid, or a string/object of error(s)
 * @param {string} [source='body'] - 'body', 'query', or 'params'
 * @returns {Function} Express middleware
 */
export const validateSchema = (validateFn, source = 'body') => (req, res, next) => {
  const data = req[source];
  const errors = validateFn(data);

  if (errors) {
    const message = typeof errors === 'string' ? errors : 'Validation failed';
    const details = typeof errors === 'object' ? errors : null;
    return next(new ValidationError(message, details));
  }

  next();
};

export default {
  EMAIL_REGEX,
  UUID_REGEX,
  isValidEmail,
  isValidUuid,
  validatePagination,
  validateSchema,
};
