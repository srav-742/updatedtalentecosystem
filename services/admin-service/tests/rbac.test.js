import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { RbacService } from '../src/services/rbac.service.js';

test('RBAC allows super admin and blocks out-of-scope tenant admin', () => {
  const rbac = new RbacService();
  assert.equal(rbac.hasPermission('super_admin', 'users:write'), true);
  assert.equal(rbac.hasPermission('organization_admin', 'audit:read'), false);

  assert.throws(() => rbac.assertScope(
    { role: 'tenant_admin', tenantId: 'tenant_a' },
    { tenantId: 'tenant_b' }
  ), /another tenant/);
});
