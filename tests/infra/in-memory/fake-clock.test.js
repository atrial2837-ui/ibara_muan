/**
 * @file tests/infra/in-memory/fake-clock.test.js
 * @description FakeClock の単独テスト。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeClock } from '../../../src/infra/in-memory/fake-clock.js';

test('FakeClock: デフォルトは 2026-01-01T00:00:00.000Z', () => {
  const clock = new FakeClock();
  assert.equal(clock.now().toISOString(), '2026-01-01T00:00:00.000Z');
});

test('FakeClock: コンストラクタで初期 Date を指定できる', () => {
  const date = new Date('2024-06-15T12:00:00.000Z');
  const clock = new FakeClock(date);
  assert.equal(clock.now().toISOString(), '2024-06-15T12:00:00.000Z');
});

test('FakeClock: now() は Date オブジェクトを返す', () => {
  const clock = new FakeClock();
  assert.ok(clock.now() instanceof Date);
});

test('FakeClock: advance(ms) で時刻を進められる', () => {
  const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
  clock.advance(1000); // 1秒
  assert.equal(clock.now().toISOString(), '2026-01-01T00:00:01.000Z');
});

test('FakeClock: advance(ms) は複数回呼べる', () => {
  const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
  clock.advance(60 * 1000); // 1分
  clock.advance(60 * 1000); // さらに1分
  assert.equal(clock.now().toISOString(), '2026-01-01T00:02:00.000Z');
});

test('FakeClock: advance(ms) はメソッドチェーンできる (this を返す)', () => {
  const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
  const result = clock.advance(1000);
  assert.strictEqual(result, clock);
});

test('FakeClock: set(date) で任意の時刻に設定できる', () => {
  const clock = new FakeClock();
  clock.set(new Date('2030-12-31T23:59:59.000Z'));
  assert.equal(clock.now().toISOString(), '2030-12-31T23:59:59.000Z');
});

test('FakeClock: now() が返す Date オブジェクトは内部参照のコピー', () => {
  const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
  const d1 = clock.now();
  d1.setFullYear(2099); // 変更しても内部に影響しない
  const d2 = clock.now();
  assert.equal(d2.toISOString(), '2026-01-01T00:00:00.000Z');
});

test('FakeClock: advance に負値を渡すと時刻を巻き戻せる', () => {
  const clock = new FakeClock(new Date('2026-01-01T01:00:00.000Z'));
  clock.advance(-60 * 60 * 1000); // -1時間
  assert.equal(clock.now().toISOString(), '2026-01-01T00:00:00.000Z');
});
