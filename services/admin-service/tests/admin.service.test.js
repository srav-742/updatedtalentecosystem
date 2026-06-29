import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { AdminService } from '../src/services/admin.service.js';

test('AdminService creates, audits, and soft deletes resources', () => {
  const service = new AdminService();
  const actor = { id: 'admin_1', role: 'super_admin' };
  const user = service.create('users', {
    id: 'user_1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'tenant_admin',
    tenantId: 'tenant_1',
  }, actor);

  assert.equal(user.id, 'user_1');
  assert.equal(service.listAudit(actor).length, 1);

  service.softDelete('users', 'user_1', actor);
  assert.equal(service.list('users', actor).length, 0);
  assert.equal(service.listAudit(actor).at(-1).action, 'soft_delete');
});

test('Organization admin is scoped to its organization', () => {
  const service = new AdminService();
  const superAdmin = { id: 'root', role: 'super_admin' };
  const orgAdmin = {
    id: 'org_admin',
    role: 'organization_admin',
    tenantId: 'tenant_1',
    organizationId: 'org_1',
  };

  service.create('users', {
    id: 'user_2',
    email: 'member@example.com',
    name: 'Member',
    role: 'candidate',
    tenantId: 'tenant_1',
    organizationId: 'org_1',
  }, superAdmin);

  assert.equal(service.list('users', orgAdmin).length, 1);
  assert.throws(() => service.create('users', {
    id: 'user_3',
    tenantId: 'tenant_1',
    organizationId: 'org_2',
  }, orgAdmin), /another organization/);
});
