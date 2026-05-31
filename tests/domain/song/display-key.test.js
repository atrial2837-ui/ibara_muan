/**
 * @file tests/domain/song/display-key.test.js
 * @description song/display-key モジュールの単体テスト (Node built-in test runner)
 *
 * 実行方法: node --test tests/domain/song/display-key.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDisplayKey, isValidDisplayKey } from '../../../src/domain/song/display-key.js';

// ─── parseDisplayKey: 空・null・undefined ────────────────────────────────────

test('parseDisplayKey: 空文字列は空文字列を返す', () => {
  assert.equal(parseDisplayKey(''), '');
});

test('parseDisplayKey: null は空文字列を返す', () => {
  assert.equal(parseDisplayKey(null), '');
});

test('parseDisplayKey: undefined は空文字列を返す', () => {
  assert.equal(parseDisplayKey(undefined), '');
});

// ─── parseDisplayKey: 有効値 ─────────────────────────────────────────────────

test('parseDisplayKey: "原キー" はそのまま返す', () => {
  assert.equal(parseDisplayKey('原キー'), '原キー');
});

test('parseDisplayKey: "+1" はそのまま返す', () => {
  assert.equal(parseDisplayKey('+1'), '+1');
});

test('parseDisplayKey: "+2" はそのまま返す', () => {
  assert.equal(parseDisplayKey('+2'), '+2');
});

test('parseDisplayKey: "-1" はそのまま返す', () => {
  assert.equal(parseDisplayKey('-1'), '-1');
});

test('parseDisplayKey: "-2" はそのまま返す', () => {
  assert.equal(parseDisplayKey('-2'), '-2');
});

test('parseDisplayKey: "+12" はそのまま返す (2桁)', () => {
  assert.equal(parseDisplayKey('+12'), '+12');
});

test('parseDisplayKey: "-99" はそのまま返す (2桁)', () => {
  assert.equal(parseDisplayKey('-99'), '-99');
});

// ─── parseDisplayKey: 全角記号の正規化 ───────────────────────────────────────

test('parseDisplayKey: "＋1" (全角プラス) → "+1"', () => {
  assert.equal(parseDisplayKey('＋1'), '+1');
});

test('parseDisplayKey: "－2" (全角マイナス) → "-2"', () => {
  assert.equal(parseDisplayKey('－2'), '-2');
});

test('parseDisplayKey: "＋12" (全角プラス・2桁) → "+12"', () => {
  assert.equal(parseDisplayKey('＋12'), '+12');
});

// ─── parseDisplayKey: 無効値 → '' ────────────────────────────────────────────

test('parseDisplayKey: "+100" は無効 (3桁) → ""', () => {
  assert.equal(parseDisplayKey('+100'), '');
});

test('parseDisplayKey: "-100" は無効 (3桁) → ""', () => {
  assert.equal(parseDisplayKey('-100'), '');
});

test('parseDisplayKey: "+0" は無効 (/^[+-]\\d{1,2}$/ で 0 は 1桁なので有効)', () => {
  // /^[+-]\d{1,2}$/ は +0 にマッチする。既存の cleanDisplayKey 挙動に従い有効とする。
  assert.equal(parseDisplayKey('+0'), '+0');
});

test('parseDisplayKey: "-0" は有効 (既存挙動に従う)', () => {
  assert.equal(parseDisplayKey('-0'), '-0');
});

test('parseDisplayKey: "#REF!" → ""', () => {
  assert.equal(parseDisplayKey('#REF!'), '');
});

test('parseDisplayKey: "#N/A" → ""', () => {
  assert.equal(parseDisplayKey('#N/A'), '');
});

test('parseDisplayKey: "N/A" → ""', () => {
  assert.equal(parseDisplayKey('N/A'), '');
});

test('parseDisplayKey: "NULL" → ""', () => {
  assert.equal(parseDisplayKey('NULL'), '');
});

test('parseDisplayKey: "null" (小文字) → ""', () => {
  assert.equal(parseDisplayKey('null'), '');
});

test('parseDisplayKey: "n/a" (小文字) → ""', () => {
  assert.equal(parseDisplayKey('n/a'), '');
});

test('parseDisplayKey: "C" (コード名) → ""', () => {
  assert.equal(parseDisplayKey('C'), '');
});

test('parseDisplayKey: "F#" (コード名) → ""', () => {
  assert.equal(parseDisplayKey('F#'), '');
});

test('parseDisplayKey: "Bm" (コード名) → ""', () => {
  assert.equal(parseDisplayKey('Bm'), '');
});

test('parseDisplayKey: "1" (符号なし) → ""', () => {
  assert.equal(parseDisplayKey('1'), '');
});

test('parseDisplayKey: "+" (符号のみ) → ""', () => {
  assert.equal(parseDisplayKey('+'), '');
});

// ─── parseDisplayKey: 前後空白 ────────────────────────────────────────────────

test('parseDisplayKey: " +1 " (前後空白) → "+1" (normalize で trim される)', () => {
  // cleanMetadata → normalize → trim により前後空白は除去される
  assert.equal(parseDisplayKey(' +1 '), '+1');
});

test('parseDisplayKey: " 原キー " (前後空白) → "原キー"', () => {
  assert.equal(parseDisplayKey(' 原キー '), '原キー');
});

// ─── isValidDisplayKey ───────────────────────────────────────────────────────

test('isValidDisplayKey: "" は有効', () => {
  assert.equal(isValidDisplayKey(''), true);
});

test('isValidDisplayKey: "原キー" は有効', () => {
  assert.equal(isValidDisplayKey('原キー'), true);
});

test('isValidDisplayKey: "+1" は有効', () => {
  assert.equal(isValidDisplayKey('+1'), true);
});

test('isValidDisplayKey: "-2" は有効', () => {
  assert.equal(isValidDisplayKey('-2'), true);
});

test('isValidDisplayKey: "+12" は有効', () => {
  assert.equal(isValidDisplayKey('+12'), true);
});

test('isValidDisplayKey: "+100" は無効 (3桁)', () => {
  assert.equal(isValidDisplayKey('+100'), false);
});

test('isValidDisplayKey: "#REF!" は無効', () => {
  assert.equal(isValidDisplayKey('#REF!'), false);
});

test('isValidDisplayKey: "N/A" は無効', () => {
  assert.equal(isValidDisplayKey('N/A'), false);
});

test('isValidDisplayKey: " +1 " は無効 (前後空白あり = 正規化前)', () => {
  // parseDisplayKey(' +1 ') === '+1' !== ' +1 ' なので false
  assert.equal(isValidDisplayKey(' +1 '), false);
});

test('isValidDisplayKey: "＋1" は無効 (全角 = 正規化前)', () => {
  // parseDisplayKey('＋1') === '+1' !== '＋1' なので false
  assert.equal(isValidDisplayKey('＋1'), false);
});

test('isValidDisplayKey: null は無効', () => {
  assert.equal(isValidDisplayKey(null), false);
});

test('isValidDisplayKey: undefined は無効', () => {
  assert.equal(isValidDisplayKey(undefined), false);
});

test('isValidDisplayKey: 数値 1 は無効 (string 以外)', () => {
  assert.equal(isValidDisplayKey(1), false);
});
