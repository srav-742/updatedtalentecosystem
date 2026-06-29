import { errors } from '@hire1percent/shared';

/**
 * Express middleware to restrict routes to specific roles.
 * @param {string[]} roles - Array of allowed roles
 */
export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new errors.AuthenticationError('Authentication context missing.', 'AUTH_002'));
    }

    const hasRole = roles.map((r) => r.toUpperCase()).includes(req.user.role?.toUpperCase());
    if (!hasRole) {
      return next(new errors.ForbiddenError('Access denied: Insufficient permissions for this role.', 'AUTH_003'));
    }

    next();
  };
};

/**
 * Express middleware to restrict routes to specific permissions.
 * @param {string} permission - The required permission string
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new errors.AuthenticationError('Authentication context missing.', 'AUTH_002'));
    }

    const hasPermission = req.user.permissions?.includes(permission);
    if (!hasPermission) {
      return next(new errors.ForbiddenError(`Access denied: Missing required permission "${permission}".`, 'AUTH_004'));
    }

    next();
  };
};

export default {
  requireRole,
  requirePermission,
};
