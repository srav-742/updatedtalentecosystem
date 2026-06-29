/**
 * @fileoverview Policy Middleware
 * @module gateway/middlewares/policy.middleware
 *
 * Evaluates Route Registry policies against the current request context.
 * Publishes evaluation events to the gateway event bus.
 */

import { findRoute } from '../routes/routeRegistry.js';
import { PolicyManager } from '../policies/PolicyManager.js';
import ApiError from '../../core/errors/ApiError.js';
import logger from '../../core/logger/logger.js';
import EVENTS from '../../core/constants/events.js';
import { pluginManager } from '../plugins/PluginManager.js';
import contextStore from '../../core/context/contextStore.js';

/**
 * Policy middleware.
 * Looks up the policies for the current route and evaluates them.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
const policyMiddleware = async (req, _res, next) => {
  try {
    const routeDef = findRoute(req.originalUrl || req.path, req.method);

    if (!routeDef || !routeDef.policies || routeDef.policies.length === 0) {
      return next();
    }

    const ctx = contextStore.getContext();
    const user = req.user || ctx?.user;

    if (!user) {
      return next(ApiError.unauthorized('User must be authenticated to evaluate policies.', 'AUTH_001'));
    }

    // Publish POLICY_STARTED to Event Bus
    pluginManager.emit(EVENTS.POLICY_STARTED, {
      policies: routeDef.policies,
      userId: user.id || user._id,
      path: req.originalUrl || req.path,
    });

    // Evaluate all policies for this route
    const result = await PolicyManager.evaluate(routeDef.policies, {
      user,
      method: req.method,
      path: req.originalUrl || req.path,
      params: req.params,
      query: req.query,
      body: req.body,
    });

    if (!result.allowed) {
      logger.warn(`Policy denied: ${result.policy} — ${result.reason}`, {
        source: 'policy.middleware',
        userId: user.id || user._id,
        policy: result.policy,
      });

      pluginManager.emit(EVENTS.POLICY_DENIED, {
        policy: result.policy,
        reason: result.reason,
        userId: user.id || user._id,
        path: req.originalUrl || req.path,
      });

      return next(ApiError.forbidden(result.reason || 'Access denied by policy.', 'AUTH_003'));
    }

    // Publish POLICY_PASSED to Event Bus
    pluginManager.emit(EVENTS.POLICY_PASSED, {
      policies: routeDef.policies,
      userId: user.id || user._id,
      path: req.originalUrl || req.path,
    });

    next();
  } catch (error) {
    logger.error(`Policy evaluation error: ${error.message}`, {
      source: 'policy.middleware',
    });
    next(error);
  }
};

export default policyMiddleware;
