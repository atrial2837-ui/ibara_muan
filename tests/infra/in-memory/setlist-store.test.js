/**
 * @file tests/infra/in-memory/setlist-store.test.js
 * @description InMemorySetlistStore の単独テスト。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemorySetlistStore } from '../../../src/infra/in-memory/in-memory-setlist-store.js';

test('InMemorySetlistStore: 初期状態は load() が null を返す', () => {
  const store = new InMemorySetlistStore();
  assert.equal(store.load(), null);
});

test('InMemorySetlistStore: save した後 load で取得できる', () => {
  const store = new InMemorySetlistStore();
  store.save({ songKeys: ['key1', 'key2'] });
  const result = store.load();
  assert.ok(result !== null);
  assert.deepEqual(result.songKeys, ['key1', 'key2']);
});

test('InMemorySetlistStore: clear した後 load() が null を返す', () => {
  const store = new InMemorySetlistStore();
  store.save({ songKeys: ['key1'] });
  store.clear();
  assert.equal(store.load(), null);
});

test('InMemorySetlistStore: save は既存データを上書きする', () => {
  const store = new InMemorySetlistStore();
  store.save({ songKeys: ['key1'] });
  store.save({ songKeys: ['key2', 'key3'] });
  const result = store.load();
  assert.ok(result !== null);
  assert.deepEqual(result.songKeys, ['key2', 'key3']);
});

test('InMemorySetlistStore: load の返り値は元データのコピー (変更が反映されない)', () => {
  const store = new InMemorySetlistStore();
  store.save({ songKeys: ['key1'] });
  const result = store.load();
  result.songKeys.push('key2');
  const again = store.load();
  assert.deepEqual(again.songKeys, ['key1']); // 変更されていない
});

test('InMemorySetlistStore: 空の songKeys を保存できる', () => {
  const store = new InMemorySetlistStore();
  store.save({ songKeys: [] });
  const result = store.load();
  assert.ok(result !== null);
  assert.deepEqual(result.songKeys, []);
});

test('InMemorySetlistStore: clear は未保存状態で呼んでもエラーにならない', () => {
  const store = new InMemorySetlistStore();
  assert.doesNotThrow(() => store.clear());
});
