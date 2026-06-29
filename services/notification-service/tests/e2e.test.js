import './setup.js';
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import { notificationService } from '../src/services/notification.service.js';

test('E2E: Notification endpoints Integration', async (t) => {
  // Mock service actions to prevent MongoDB dependency in E2E tests
  t.mock.method(notificationService, 'sendNotification', async (data) => {
    return {
      _id: 'notif_e2e_111',
      recipientId: data.recipientId,
      channel: data.channel,
      title: data.title,
      body: data.body,
      status: 'sent',
      sentAt: new Date(),
    };
  });

  t.mock.method(notificationService, 'sendBulk', async (items) => {
    return items.map((item, idx) => ({
      _id: `notif_bulk_${idx}`,
      recipientId: item.recipientId,
      channel: item.channel,
      status: 'sent',
    }));
  });

  t.mock.method(notificationService, 'getNotifications', async (filter) => {
    return [
      {
        _id: 'notif_e2e_111',
        recipientId: filter.recipientId,
        channel: 'email',
        title: 'E2E Title',
        body: 'E2E Body',
        status: 'sent',
      },
    ];
  });

  t.mock.method(notificationService, 'getNotificationById', async (id) => {
    return {
      _id: id,
      recipientId: 'user_e2e_1',
      channel: 'email',
      title: 'E2E Title',
      body: 'E2E Body',
      status: 'sent',
    };
  });

  t.mock.method(notificationService, 'updatePreferences', async (userId, data) => {
    return {
      userId,
      email: data.email ?? true,
      sms: data.sms ?? true,
      push: data.push ?? true,
      inApp: data.inApp ?? true,
    };
  });

  // Start Express on a dynamic/random open port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const headers = {
    'Content-Type': 'application/json',
    'x-h1p-service-token': 'trusted-gateway-token',
    'x-h1p-user-id': 'user_e2e_1',
    'x-h1p-user-role': 'candidate',
  };

  try {
    // 1. Test POST /api/v1/notifications/send
    const sendRes = await fetch(`${baseUrl}/api/v1/notifications/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        recipientId: 'user_e2e_1',
        recipientEmail: 'e2e@example.com',
        channel: 'email',
        title: 'Hello E2E',
        body: 'Testing notification E2E flow',
      }),
    });
    const sendData = await sendRes.json();
    assert.strictEqual(sendRes.status, 201);
    assert.strictEqual(sendData.success, true);
    assert.strictEqual(sendData.data._id, 'notif_e2e_111');

    // 2. Test POST /api/v1/notifications/bulk
    const bulkRes = await fetch(`${baseUrl}/api/v1/notifications/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: [
          { recipientId: 'user_e2e_1', channel: 'email', title: 'A', body: 'B' },
          { recipientId: 'user_e2e_1', channel: 'sms', title: 'C', body: 'D' },
        ],
      }),
    });
    const bulkData = await bulkRes.json();
    assert.strictEqual(bulkRes.status, 200);
    assert.strictEqual(bulkData.success, true);
    assert.strictEqual(bulkData.data.length, 2);

    // 3. Test GET /api/v1/notifications
    const listRes = await fetch(`${baseUrl}/api/v1/notifications`, {
      method: 'GET',
      headers,
    });
    const listData = await listRes.json();
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listData.success, true);
    assert.strictEqual(listData.data[0].recipientId, 'user_e2e_1');

    // 4. Test GET /api/v1/notifications/:id
    const detailRes = await fetch(`${baseUrl}/api/v1/notifications/notif_e2e_111`, {
      method: 'GET',
      headers,
    });
    const detailData = await detailRes.json();
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailData.success, true);
    assert.strictEqual(detailData.data._id, 'notif_e2e_111');

    // 5. Test PUT /api/v1/notifications/preferences
    const prefRes = await fetch(`${baseUrl}/api/v1/notifications/preferences`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        email: true,
        sms: false,
      }),
    });
    const prefData = await prefRes.json();
    assert.strictEqual(prefRes.status, 200);
    assert.strictEqual(prefData.success, true);
    assert.strictEqual(prefData.data.sms, false);

    // 6. Test GET /ready endpoint checks mongo ready state
    const readyRes = await fetch(`${baseUrl}/ready`, { method: 'GET' });
    // Should return 503 if mongoose is not connected (since mongoose is not connected here)
    assert.strictEqual(readyRes.status, 503);

  } finally {
    // Graceful close of server
    await new Promise((resolve) => server.close(resolve));
  }
});
