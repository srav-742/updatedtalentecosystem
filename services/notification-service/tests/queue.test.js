import './setup.js';
import test from 'node:test';
import assert from 'node:assert';
import { processQueue } from '../src/workers/queueWorker.js';
import { queueRepository } from '../src/repositories/queue.repository.js';
import { notificationRepository } from '../src/repositories/notification.repository.js';
import { EmailProviderFactory } from '../src/providers/email/emailProvider.factory.js';

test('QueueWorker: successfully processes pending queue items', async (t) => {
  // Mock finding pending items
  const mockQueueItem = {
    _id: 'q_item_111',
    notificationId: 'notif_111',
    payload: {
      recipientId: 'user_1',
      recipientEmail: 'user@example.com',
      title: 'Hi',
      body: 'Welcome',
      channel: 'email',
    },
    attempts: 0,
    maxAttempts: 3,
    nextRunAt: new Date(),
  };

  t.mock.method(queueRepository, 'findPendingToRun', async () => [mockQueueItem]);

  // Mock provider dispatch (success)
  const mockEmailProvider = {
    send: async () => ({ success: true, messageId: 'msg_999' }),
  };
  t.mock.method(EmailProviderFactory, 'getProvider', () => mockEmailProvider);

  // Spies/mocks for repository updates
  let updateQueueCalledWith = null;
  t.mock.method(queueRepository, 'updateQueueItem', async (id, data) => {
    updateQueueCalledWith = { id, data };
    return { ...mockQueueItem, ...data };
  });

  let updateNotifCalledWith = null;
  t.mock.method(notificationRepository, 'update', async (id, data) => {
    updateNotifCalledWith = { id, data };
    return { _id: id };
  });

  t.mock.method(notificationRepository, 'createLog', async () => ({}));
  t.mock.method(queueRepository, 'findRetries', async () => []);

  // Run processing
  await processQueue();

  // Assertions
  assert.ok(updateQueueCalledWith);
  assert.strictEqual(updateQueueCalledWith.id, 'q_item_111');
  assert.strictEqual(updateQueueCalledWith.data.status, 'sent');

  assert.ok(updateNotifCalledWith);
  assert.strictEqual(updateNotifCalledWith.id, 'notif_111');
  assert.strictEqual(updateNotifCalledWith.data.status, 'sent');
});

test('QueueWorker: schedules a retry on failure if attempts < maxAttempts', async (t) => {
  const mockQueueItem = {
    _id: 'q_item_222',
    notificationId: 'notif_222',
    payload: {
      recipientId: 'user_2',
      recipientEmail: 'fail-user@example.com',
      title: 'Alert',
      body: 'Critical',
      channel: 'email',
    },
    attempts: 0,
    maxAttempts: 3,
    nextRunAt: new Date(),
  };

  t.mock.method(queueRepository, 'findPendingToRun', async () => [mockQueueItem]);

  // Mock provider dispatch (failure)
  const mockEmailProvider = {
    send: async () => ({ success: false, error: 'Connection timed out' }),
  };
  t.mock.method(EmailProviderFactory, 'getProvider', () => mockEmailProvider);

  let updateQueueCalledWith = null;
  t.mock.method(queueRepository, 'updateQueueItem', async (id, data) => {
    updateQueueCalledWith = { id, data };
    return { ...mockQueueItem, ...data };
  });

  let createRetryCalledWith = null;
  t.mock.method(queueRepository, 'createRetry', async (data) => {
    createRetryCalledWith = data;
    return { _id: 'retry_111' };
  });

  t.mock.method(notificationRepository, 'createLog', async () => ({}));
  t.mock.method(queueRepository, 'findRetries', async () => []);

  // Run processing
  await processQueue();

  // Assertions
  assert.ok(updateQueueCalledWith);
  assert.strictEqual(updateQueueCalledWith.data.status, 'pending'); // Set back to pending
  assert.strictEqual(updateQueueCalledWith.data.attempts, 1);
  assert.strictEqual(updateQueueCalledWith.data.error, 'Connection timed out');
  assert.ok(updateQueueCalledWith.data.nextRunAt);

  assert.ok(createRetryCalledWith);
  assert.strictEqual(createRetryCalledWith.queueItemId, 'q_item_222');
  assert.strictEqual(createRetryCalledWith.attemptNumber, 1);
  assert.strictEqual(createRetryCalledWith.status, 'pending');
});

test('QueueWorker: sends to DLQ if attempts reach maxAttempts', async (t) => {
  const mockQueueItem = {
    _id: 'q_item_333',
    notificationId: 'notif_333',
    payload: {
      recipientId: 'user_3',
      recipientEmail: 'fail-user@example.com',
      title: 'Alert',
      body: 'Critical',
      channel: 'email',
    },
    attempts: 2, // 3rd attempt about to run
    maxAttempts: 3,
    nextRunAt: new Date(),
  };

  t.mock.method(queueRepository, 'findPendingToRun', async () => [mockQueueItem]);

  const mockEmailProvider = {
    send: async () => ({ success: false, error: 'Auth failed' }),
  };
  t.mock.method(EmailProviderFactory, 'getProvider', () => mockEmailProvider);

  let updateQueueCalledWith = null;
  t.mock.method(queueRepository, 'updateQueueItem', async (id, data) => {
    updateQueueCalledWith = { id, data };
    return { ...mockQueueItem, ...data };
  });

  let updateNotifCalledWith = null;
  t.mock.method(notificationRepository, 'update', async (id, data) => {
    updateNotifCalledWith = { id, data };
    return { _id: id };
  });

  t.mock.method(notificationRepository, 'createLog', async () => ({}));
  t.mock.method(queueRepository, 'findRetries', async () => []);

  // Run processing
  await processQueue();

  // Assertions
  assert.ok(updateQueueCalledWith);
  assert.strictEqual(updateQueueCalledWith.data.status, 'dlq'); // Moved to DLQ
  assert.strictEqual(updateQueueCalledWith.data.attempts, 3);

  assert.ok(updateNotifCalledWith);
  assert.strictEqual(updateNotifCalledWith.data.status, 'failed'); // Main notification failed
});
