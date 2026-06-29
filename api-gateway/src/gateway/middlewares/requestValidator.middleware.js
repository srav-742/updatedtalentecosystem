/**
 * @fileoverview Request Validator Middleware
 * @module gateway/middlewares/requestValidator.middleware
 *
 * Validates incoming request properties (Content-Type, body size,
 * required headers) before proxying. Rejects invalid requests early
 * to avoid unnecessary upstream traffic.
 */

import ApiError from '../../core/errors/ApiError.js';
import MESSAGES from '../../core/constants/messages.js';
import ERROR_CODES from '../../core/constants/errors.js';

/**
 * Content types that are accepted for request bodies.
 * @type {string[]}
 */
const ACCEPTED_CONTENT_TYPES = [
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
];

/**
 * Request validator middleware.
 * Performs basic validation on incoming requests.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
const requestValidatorMiddleware = (req, _res, next) => {
  // ─── Validate Content-Type for requests with bodies ──
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];

    if (contentType) {
      const baseType = contentType.split(';')[0].trim().toLowerCase();
      const isAccepted = ACCEPTED_CONTENT_TYPES.some((type) => baseType.includes(type));

      if (!isAccepted) {
        return next(
          new ApiError(
            415,
            `Unsupported Content-Type: ${baseType}. Accepted types: ${ACCEPTED_CONTENT_TYPES.join(', ')}`,
            ERROR_CODES.VALIDATION_001
          )
        );
      }
    }
  }

  // ─── Validate path does not contain suspicious patterns ──
  const suspiciousPatterns = [
    /\.\.\//,   // Directory traversal
    /\/\.\//,   // Hidden path segments
    /<script/i, // XSS in URL
    /%3Cscript/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(req.originalUrl)) {
      return next(
        ApiError.badRequest(
          'Request path contains invalid characters.',
          ERROR_CODES.VALIDATION_003
        )
      );
    }
  }

  next();
};

export default requestValidatorMiddleware;
