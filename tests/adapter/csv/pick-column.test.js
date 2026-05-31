/**
 * @file tests/adapter/csv/pick-column.test.js
 * @description pickColumn の単体テスト (Node built-in test runner)
 *
 * 実行方法: node --test tests/adapter/csv/pick-column.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickColumn } from '../../../src/adapter/csv/pick-column.js';

// ─── 完全一致 (Phase 1) ──────────────────────────────────────────────────────

test('pickColumn: 完全一致で最初の候補を返す', () => {
  assert.equal(pickColumn(['title', 'artist', 'key'], ['title', '曲名']), 'title');
});

test('pickColumn: 完全一致で 2 番目の候補にマッチ', () => {
  assert.equal(pickColumn(['曲名', 'artist'], ['title', '曲名']), '曲名');
});

test('pickColumn: 大文字小文字を区別しない (normalizedKey で変換)', () => {
  assert.equal(pickColumn(['Title', 'artist'], ['title']), 'Title');
});

test('pickColumn: アンダースコア・ハイフン・スペースを無視する', () => {
  // 'song_title' → 'songtitle' として比較
  assert.equal(pickColumn(['song_title', 'artist'], ['song_title']), 'song_title');
  assert.equal(pickColumn(['songtitle', 'artist'], ['song_title']), 'songtitle');
});

// ─── 部分一致 (Phase 2) ──────────────────────────────────────────────────────

test('pickColumn: 完全一致なし → 部分一致にフォールバック', () => {
  // 'display_key' の正規化キー 'displaykey' が 'displaykey' を includes
  assert.equal(
    pickColumn(['display_key'], ['key', 'display_key']),
    'display_key'
  );
});

test('pickColumn: 部分一致: 列名が候補キーを含む', () => {
  // 'song_key_text' → 'songkeytext', 候補 'key' → 'key', includes チェック
  assert.equal(pickColumn(['song_key_text'], ['key']), 'song_key_text');
});

// ─── null ケース ──────────────────────────────────────────────────────────────

test('pickColumn: 候補が全て見つからない場合は null', () => {
  assert.equal(pickColumn(['title', 'artist'], ['genre', 'ジャンル']), null);
});

test('pickColumn: 空の列配列は null', () => {
  assert.equal(pickColumn([], ['title']), null);
});

test('pickColumn: 空の候補配列は null', () => {
  assert.equal(pickColumn(['title', 'artist'], []), null);
});

// ─── 候補の優先順序 ───────────────────────────────────────────────────────────

test('pickColumn: 完全一致が部分一致より優先される', () => {
  // 列: ['key_text', 'key'], 候補: ['key', 'key_text']
  // Phase1: 'key' → exact match 'key' を発見 → 'key' を返す
  assert.equal(pickColumn(['key_text', 'key'], ['key', 'key_text']), 'key');
});
