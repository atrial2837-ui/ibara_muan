/**
 * @file tests/adapter/csv/csv-objects.test.js
 * @description csvObjects の単体テスト (Node built-in test runner)
 *
 * 実行方法: node --test tests/adapter/csv/csv-objects.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvObjects } from '../../../src/adapter/csv/csv-objects.js';

// ─── 基本ケース ───────────────────────────────────────────────────────────────

test('csvObjects: ヘッダーのみは空配列', () => {
  assert.deepEqual(csvObjects('title,artist'), []);
});

test('csvObjects: 1行データ', () => {
  const result = csvObjects('title,artist\n曲名,歌手');
  assert.equal(result.length, 1);
  assert.equal(result[0].title, '曲名');
  assert.equal(result[0].artist, '歌手');
});

test('csvObjects: 複数行データ', () => {
  const result = csvObjects('title,artist\n曲A,歌手A\n曲B,歌手B');
  assert.equal(result.length, 2);
  assert.equal(result[0].title, '曲A');
  assert.equal(result[1].title, '曲B');
});

// ─── ヘッダー正規化 ────────────────────────────────────────────────────────────

test('csvObjects: ヘッダーは normalize される (前後空白除去)', () => {
  const result = csvObjects(' title , artist \n曲名,歌手');
  assert.ok('title' in result[0], 'ヘッダー "title" が正規化されて存在する');
  assert.ok('artist' in result[0], 'ヘッダー "artist" が正規化されて存在する');
});

test('csvObjects: ヘッダーは NFKC 正規化される', () => {
  // 全角スペースを含むヘッダー
  const result = csvObjects('ｔｉｔｌｅ,ａｒｔｉｓｔ\n曲名,歌手');
  // NFKC では全角英字 → 半角英字
  assert.ok('title' in result[0]);
});

// ─── 欠損値補完 ────────────────────────────────────────────────────────────────

test('csvObjects: 行のセル数がヘッダーより少ない場合は空文字で補完', () => {
  const result = csvObjects('title,artist,key\n曲名');
  assert.equal(result[0].title, '曲名');
  assert.equal(result[0].artist, '');
  assert.equal(result[0].key, '');
});

// ─── 空 CSV ───────────────────────────────────────────────────────────────────

test('csvObjects: 空テキストは空配列', () => {
  assert.deepEqual(csvObjects(''), []);
});

// ─── クォート対応 ─────────────────────────────────────────────────────────────

test('csvObjects: クォートで囲まれたセル値を正しく取得', () => {
  const result = csvObjects('title,artist\n"曲名,サブ",歌手');
  assert.equal(result[0].title, '曲名,サブ');
});
