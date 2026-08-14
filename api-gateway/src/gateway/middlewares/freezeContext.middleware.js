/**
 * @fileoverview Request Context Freeze Middleware
 * @module gateway/middlewares/freezeContext.middleware
 *
 * Freezes the RequestContext object in AsyncLocalStorage after the auth
 * and policy phases, preventing accidental mutation during downstream proxying.
 */

import contextStore from '../../core/context/contextStore.js';

/**
 * Freeze Context middleware.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const freezeContextMiddleware = (req, res, next) => {
  const ctx = contextStore.getContext();
  if (ctx) {
    // Deep freeze session if it exists
    if (ctx.session) {
      Object.freeze(ctx.session);
    }
    // Freeze permissions array
    if (ctx.permissions) {
      Object.freeze(ctx.permissions);
    }
    // Freeze the main context object
    Object.freeze(ctx);
  }
  next();
};

export default freezeContextMiddleware;
