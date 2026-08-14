import { errors } from '@hire1percent/shared';
import { ADMIN_ROLES, ROLE_PERMISSIONS } from '../constants/admin.constants.js';

export class RbacService {
  hasPermission(role, permission) {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }

  assertPermission(actor, permission) {
    if (!this.hasPermission(actor.role, permission)) {
      throw errors.ApiError.forbidden(`Missing permission: ${permission}`);
    }
  }

  assertScope(actor, resource = {}) {
    if (actor.role === ADMIN_ROLES.SUPER_ADMIN) return;
    if (actor.role === ADMIN_ROLES.TENANT_ADMIN && resource.tenantId && resource.tenantId !== actor.tenantId) {
      throw errors.ApiError.forbidden('Tenant admin cannot access another tenant.');
    }
    if (actor.role === ADMIN_ROLES.ORGANIZATION_ADMIN) {
      if (resource.tenantId && resource.tenantId !== actor.tenantId) {
        throw errors.ApiError.forbidden('Organization admin cannot access another tenant.');
      }
      if (resource.organizationId && resource.organizationId !== actor.organizationId) {
        throw errors.ApiError.forbidden('Organization admin cannot access another organization.');
      }
    }
  }
}

export const rbacService = new RbacService();
export default rbacService;
