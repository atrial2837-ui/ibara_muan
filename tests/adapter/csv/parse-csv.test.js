/**
 * @file tests/adapter/csv/parse-csv.test.js
 * @description parseCsv の単体テスト (Node built-in test runner)
 *
 * 実行方法: node --test tests/adapter/csv/parse-csv.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../../../src/adapter/csv/parse-csv.js';

// ─── 基本ケース ───────────────────────────────────────────────────────────────

test('parseCsv: 1行1列', () => {
  assert.deepEqual(parseCsv('hello'), [['hello']]);
});

test('parseCsv: 1行3列', () => {
  assert.deepEqual(parseCsv('a,b,c'), [['a', 'b', 'c']]);
});

test('parseCsv: 2行3列 (LF)', () => {
  assert.deepEqual(parseCsv('a,b,c\n1,2,3'), [
    ['a', 'b', 'c'],
    ['1', '2', '3'],
  ]);
});

test('parseCsv: CRLF 改行 (\\r\\n) を LF と同じに扱う', () => {
  assert.deepEqual(parseCsv('a,b\r\nc,d'), [
    ['a', 'b'],
    ['c', 'd'],
  ]);
});

test('parseCsv: 末尾の空行は含まない', () => {
  assert.deepEqual(parseCsv('a,b\n'), [['a', 'b']]);
});

test('parseCsv: 空文字列は空配列を返す', () => {
  assert.deepEqual(parseCsv(''), []);
});

// ─── クォートケース ───────────────────────────────────────────────────────────

test('parseCsv: ダブルクォートで囲まれたセル', () => {
  assert.deepEqual(parseCsv('"hello","world"'), [['hello', 'world']]);
});

test('parseCsv: クォート内のカンマはセル区切りとしない', () => {
  assert.deepEqual(parseCsv('"a,b",c'), [['a,b', 'c']]);
});

test('parseCsv: クォート内の "" はエスケープ済みクォート', () => {
  assert.deepEqual(parseCsv('"a""b"'), [['a"b']]);
});

test('parseCsv: クォート内の改行もセル値に含む', () => {
  assert.deepEqual(parseCsv('"a\nb",c'), [['a\nb', 'c']]);
});

test('parseCsv: クォート内の CRLF もセル値に含む', () => {
  assert.deepEqual(parseCsv('"a\r\nb",c'), [['a\r\nb', 'c']]);
});

// ─── エッジケース ─────────────────────────────────────────────────────────────

test('parseCsv: 空セルを含む行', () => {
  assert.deepEqual(parseCsv('a,,c'), [['a', '', 'c']]);
});

test('parseCsv: 空クォートセル', () => {
  assert.deepEqual(parseCsv('"",b'), [['', 'b']]);
});

test('parseCsv: 複数行でクォート内のカンマを含む', () => {
  assert.deepEqual(parseCsv('title,artist\n"曲名,サブタイトル",歌手名'), [
    ['title', 'artist'],
    ['曲名,サブタイトル', '歌手名'],
  ]);
});

test('parseCsv: 末尾の空行は追加しない (row.length === 1 && !row[0])', () => {
  // 末尾 LF のみの場合
  const result = parseCsv('a\n');
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], ['a']);
});
