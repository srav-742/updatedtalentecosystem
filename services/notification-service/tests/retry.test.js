import './setup.js';
import test from 'node:test';
import assert from 'node:assert';
import { calculateBackoff } from '../src/workers/queueWorker.js';

test('calculateBackoff: returns correct exponential delay based on attempt number', () => {
  const delay1 = calculateBackoff(1);
  const delay2 = calculateBackoff(2);
  const delay3 = calculateBackoff(3);

  assert.strictEqual(delay1, 10000); // 2^1 * 5000
  assert.strictEqual(delay2, 20000); // 2^2 * 5000
  assert.strictEqual(delay3, 40000); // 2^3 * 5000
});
