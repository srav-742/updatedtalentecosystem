import { errors } from '@hire1percent/shared';
import rbacService from './rbac.service.js';
import { ROLE_PERMISSIONS } from '../constants/admin.constants.js';

const collectionNames = ['users', 'roles', 'permissions', 'organizations', 'tenants', 'subscriptions', 'featureFlags', 'settings'];

const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export class AdminService {
  constructor() {
    this.reset();
  }

  reset() {
    this.store = Object.fromEntries(collectionNames.map((name) => [name, new Map()]));
    this.auditLogs = [];
  }

  actorFromHeaders(headers = {}) {
    return {
      id: headers['x-h1p-user-id'] || 'system',
      role: headers['x-h1p-user-role'] || 'super_admin',
      tenantId: headers['x-h1p-tenant-id'] || null,
      organizationId: headers['x-h1p-organization-id'] || null,
    };
  }

  list(resource, actor) {
    this.ensureCollection(resource);
    rbacService.assertPermission(actor, this.permission(resource, 'read'));
    return [...this.store[resource].values()].filter((item) => !item.deletedAt).filter((item) => {
      rbacService.assertScope(actor, item);
      return true;
    });
  }

  create(resource, payload, actor) {
    this.ensureCollection(resource);
    rbacService.assertPermission(actor, this.permission(resource, 'write'));
    rbacService.assertScope(actor, payload);
    const id = payload.id || makeId(resource.slice(0, -1) || resource);
    const item = {
      id,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    this.store[resource].set(id, item);
    this.audit(actor, 'create', resource, id, null, item);
    return item;
  }

  update(resource, id, payload, actor) {
    this.ensureCollection(resource);
    rbacService.assertPermission(actor, this.permission(resource, 'write'));
    const existing = this.get(resource, id, actor);
    const updated = { ...existing, ...payload, id, updatedAt: new Date().toISOString() };
    rbacService.assertScope(actor, updated);
    this.store[resource].set(id, updated);
    this.audit(actor, 'update', resource, id, existing, updated);
    return updated;
  }

  softDelete(resource, id, actor) {
    this.ensureCollection(resource);
    rbacService.assertPermission(actor, this.permission(resource, 'write'));
    const existing = this.get(resource, id, actor);
    const deleted = { ...existing, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.store[resource].set(id, deleted);
    this.audit(actor, 'soft_delete', resource, id, existing, deleted);
    return deleted;
  }

  get(resource, id, actor) {
    this.ensureCollection(resource);
    rbacService.assertPermission(actor, this.permission(resource, 'read'));
    const item = this.store[resource].get(id);
    if (!item || item.deletedAt) {
      throw errors.ApiError.notFound(`${resource} record not found`);
    }
    rbacService.assertScope(actor, item);
    return item;
  }

  listAudit(actor) {
    rbacService.assertPermission(actor, 'audit:read');
    return this.auditLogs;
  }

  dashboard(actor) {
    rbacService.assertPermission(actor, 'dashboard:read');
    return {
      users: this.list('users', actor).length,
      organizations: this.list('organizations', actor).length,
      tenants: actor.role === 'super_admin' ? this.list('tenants', actor).length : undefined,
      subscriptions: actor.role === 'super_admin' ? this.list('subscriptions', actor).length : undefined,
      auditEvents: this.auditLogs.length,
    };
  }

  roleDefinitions() {
    return Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({ role, permissions }));
  }

  audit(actor, action, resourceType, resourceId, before, after) {
    this.auditLogs.push({
      id: makeId('audit'),
      actorId: actor.id,
      action,
      resourceType,
      resourceId,
      before,
      after,
      createdAt: new Date().toISOString(),
    });
  }

  permission(resource, action) {
    if (resource === 'featureFlags' || resource === 'settings') return `settings:${action}`;
    return `${resource}:${action}`;
  }

  ensureCollection(resource) {
    if (!this.store[resource]) {
      throw errors.ApiError.notFound(`Unknown admin resource: ${resource}`);
    }
  }
}

export const adminService = new AdminService();
export default adminService;
