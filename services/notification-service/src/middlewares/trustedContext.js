import { errors, headers, context } from '@hire1percent/shared';

const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'trusted-gateway-token';

export const trustedContextMiddleware = (req, res, next) => {
  // 1. Verify internal service token
  const incomingToken = req.headers['x-h1p-service-token'];
  if (!incomingToken || incomingToken !== SERVICE_TOKEN) {
    return next(
      new errors.AuthenticationError(
        'Access denied: Invalid or missing internal service trust token.',
        'AUTH_001'
      )
    );
  }

  // 2. Parse X-H1P internal identity headers
  const identity = headers.parseHeaders(req.headers);

  // 3. Validate header structures
  const validation = headers.validateHeaders(req.headers);
  if (!validation.valid) {
    return next(
      new errors.ValidationError(
        `Invalid trusted headers: ${validation.error}`,
        null,
        'VALIDATION_001'
      )
    );
  }

  // 4. Attach authenticated user payload to request and update RequestContext
  if (identity.userId) {
    req.user = {
      userId: identity.userId,
      role: identity.role,
      permissions: identity.permissions,
      organizationId: identity.organizationId,
      tenantId: identity.tenantId,
      sessionId: identity.sessionId,
    };

    const ctx = context.getContext();
    if (ctx) {
      Object.assign(ctx, identity, { user: req.user });
    }
  }

  next();
};

export default trustedContextMiddleware;
