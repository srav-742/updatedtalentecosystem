export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  ORGANIZATION_ADMIN: 'organization_admin',
};

export const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: ['*'],
  [ADMIN_ROLES.TENANT_ADMIN]: [
    'users:read',
    'users:write',
    'roles:read',
    'organizations:read',
    'organizations:write',
    'tenants:read',
    'settings:read',
    'audit:read',
    'dashboard:read',
  ],
  [ADMIN_ROLES.ORGANIZATION_ADMIN]: [
    'users:read',
    'users:write',
    'organizations:read',
    'settings:read',
    'dashboard:read',
  ],
};
