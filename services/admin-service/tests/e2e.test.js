import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import adminService from '../src/services/admin.service.js';

const request = async (baseUrl, path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-h1p-user-id': 'super_1',
      'x-h1p-user-role': 'super_admin',
      ...(options.headers || {}),
    },
  });
  return { res, body: await res.json() };
};

test('Admin Service E2E manages users, settings, audit, and dashboard', async () => {
  adminService.reset();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;

  try {
    const created = await request(baseUrl, '/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        id: 'user_e2e_1',
        email: 'owner@example.com',
        name: 'Owner',
        role: 'tenant_admin',
        tenantId: 'tenant_1',
      }),
    });
    assert.equal(created.res.status, 201);

    const settings = await request(baseUrl, '/api/v1/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ id: 'setting_1', key: 'maintenance_mode', value: false }),
    });
    assert.equal(settings.res.status, 201);

    const dashboard = await request(baseUrl, '/api/v1/admin/dashboard');
    assert.equal(dashboard.body.data.users, 1);

    const deleted = await request(baseUrl, '/api/v1/admin/users/user_e2e_1', { method: 'DELETE' });
    assert.equal(Boolean(deleted.body.data.deletedAt), true);

    const audit = await request(baseUrl, '/api/v1/admin/audit');
    assert.equal(audit.body.data.length >= 3, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
