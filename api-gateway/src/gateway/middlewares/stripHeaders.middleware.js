/**
 * @fileoverview Anti-Spoofing Header Stripping Middleware
 * @module gateway/middlewares/stripHeaders.middleware
 *
 * Removes client-sent internal headers that could be used to spoof
 * authenticated identity. This runs BEFORE authentication so that
 * no downstream service ever sees client-injected trusted headers.
 *
 * Stripped header patterns:
 *  - X-H1P-*           (Hire1Percent internal identity headers)
 *  - X-Authenticated-*  (Legacy authenticated context headers)
 *  - X-User-ID         (Direct user ID spoofing)
 *  - X-User-Role       (Direct role spoofing)
 *  - X-User-Email      (Direct email spoofing)
 *  - X-User-Context    (Composite context spoofing)
 */

import logger from '../../core/logger/logger.js';

/**
 * Header prefixes that are reserved for gateway-injected internal use.
 * Any incoming request carrying these headers will have them removed.
 * @type {string[]}
 */
const STRIPPED_PREFIXES = ['x-h1p-', 'x-authenticated-'];

/**
 * Exact header names (lowercase) that are stripped regardless of prefix.
 * @type {Set<string>}
 */
const STRIPPED_EXACT = new Set([
  'x-user-id',
  'x-user-role',
  'x-user-email',
  'x-user-context',
]);

/**
 * Strip Headers middleware.
 * Removes all client-spoofable internal headers from the incoming request.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
const stripHeadersMiddleware = (req, _res, next) => {
  const stripped = [];

  if (req.headers['x-user-id']) {
    req.clientUserId = req.headers['x-user-id'];
  }

  Object.keys(req.headers).forEach((header) => {
    const lower = header.toLowerCase();

    // Check prefix matches
    const matchesPrefix = STRIPPED_PREFIXES.some((prefix) => lower.startsWith(prefix));

    // Check exact matches
    const matchesExact = STRIPPED_EXACT.has(lower);

    if (matchesPrefix || matchesExact) {
      delete req.headers[header];
      stripped.push(header);
    }
  });

  if (stripped.length > 0) {
    logger.debug(
      `Stripped ${stripped.length} spoofable header(s): [${stripped.join(', ')}]`,
      { source: 'stripHeaders.middleware' }
    );
  }

  next();
};

export default stripHeadersMiddleware;
