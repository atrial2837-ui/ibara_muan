/**
 * @module tests/infra/clock/system-clock.test
 * @description SystemClock のテスト。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SystemClock } from '../../../src/infra/clock/system-clock.js';

test('SystemClock.now() returns a Date instance', () => {
  const clock = new SystemClock();
  const result = clock.now();
  assert(result instanceof Date, 'now() should return a Date instance');
  assert(typeof result.getTime === 'function', 'should have getTime method');
});

test('SystemClock.now() returns current time (within 1 second)', () => {
  const clock = new SystemClock();
  const before = Date.now();
  const result = clock.now().getTime();
  const after = Date.now();
  assert(result >= before && result <= after, 'now() should return current time');
});
