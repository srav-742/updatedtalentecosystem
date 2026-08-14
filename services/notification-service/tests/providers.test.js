import './setup.js';
import test from 'node:test';
import assert from 'node:assert';
import { EmailProviderFactory } from '../src/providers/email/emailProvider.factory.js';
import { SmsProviderFactory } from '../src/providers/sms/smsProvider.factory.js';
import { PushProviderFactory } from '../src/providers/push/pushProvider.factory.js';

test('EmailProviderFactory: resolves correct provider and dispatches successfully', async (t) => {
  const provider = EmailProviderFactory.getProvider('smtp');
  assert.strictEqual(provider.constructor.name, 'SmtpProvider');

  const res = await provider.send({
    to: 'candidate@example.com',
    subject: 'Welcome',
    body: 'Hi Candidate',
  });
  
  assert.strictEqual(res.success, true);
  assert.ok(res.messageId.startsWith('smtp-'));
});

test('EmailProviderFactory: triggers error handling for failed email recipients', async (t) => {
  const provider = EmailProviderFactory.getProvider('smtp');
  const res = await provider.send({
    to: 'fail-candidate@example.com',
    subject: 'Welcome',
    body: 'Hi Candidate',
  });

  assert.strictEqual(res.success, false);
  assert.ok(res.error.includes('SMTP delivery failed'));
});

test('SmsProviderFactory: resolves and sends successfully', async (t) => {
  const provider = SmsProviderFactory.getProvider('twilio');
  assert.strictEqual(provider.constructor.name, 'TwilioProvider');

  const res = await provider.send({
    to: '+1234567890',
    body: 'Your code is 1234',
  });

  assert.strictEqual(res.success, true);
  assert.ok(res.messageId.startsWith('tw-'));
});

test('SmsProviderFactory: fails on error recipient phone number', async (t) => {
  const provider = SmsProviderFactory.getProvider('twilio');
  const res = await provider.send({
    to: '+1555000000',
    body: 'Your code is 1234',
  });

  assert.strictEqual(res.success, false);
  assert.ok(res.error.includes('Resource not found or number invalid'));
});

test('PushProviderFactory: resolves and sends push notifications', async (t) => {
  const provider = PushProviderFactory.getProvider('firebase');
  assert.strictEqual(provider.constructor.name, 'FirebaseProvider');

  const res = await provider.send({
    tokens: ['token_abc_123'],
    title: 'New Job Alert',
    body: 'A job has been posted.',
  });

  assert.strictEqual(res.success, true);
  assert.ok(res.messageId.startsWith('fcm-'));
});

test('PushProviderFactory: fails on error token', async (t) => {
  const provider = PushProviderFactory.getProvider('firebase');
  const res = await provider.send({
    tokens: ['token_fail_123'],
    title: 'New Job Alert',
    body: 'A job has been posted.',
  });

  assert.strictEqual(res.success, false);
  assert.ok(res.error.includes('Messaging payload credentials mismatch'));
});
