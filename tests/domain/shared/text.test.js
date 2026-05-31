/**
 * @file tests/domain/shared/text.test.js
 * @description shared/text モジュールの単体テスト (Node built-in test runner)
 *
 * 実行方法: node --test tests/domain/shared/text.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize,
  normalizedKey,
  cleanMetadata,
  escapeHtml,
  escapeRegExp,
} from '../../../src/domain/shared/text.js';

// ─── normalize ────────────────────────────────────────────────────────────────

test('normalize: 通常の文字列をそのまま返す', () => {
  assert.equal(normalize('hello'), 'hello');
});

test('normalize: null は空文字列を返す', () => {
  assert.equal(normalize(null), '');
});

test('normalize: undefined は空文字列を返す', () => {
  assert.equal(normalize(undefined), '');
});

test('normalize: 数値を文字列化する', () => {
  assert.equal(normalize(42), '42');
});

test('normalize: 前後の空白を除去する', () => {
  assert.equal(normalize('  hello world  '), 'hello world');
});

test('normalize: 連続空白を1つに畳む', () => {
  assert.equal(normalize('a  b\t\tc'), 'a b c');
});

test('normalize: 全角空白も連続空白として畳む', () => {
  // 全角スペース U+3000 は \s に含まれる
  assert.equal(normalize('a　b'), 'a b');
});

test('normalize: NFKC正規化を行う (全角英数字)', () => {
  // '１２３' (全角) → '123' (半角)
  assert.equal(normalize('１２３'), '123');
});

test('normalize: NFKC正規化を行う (① → 1)', () => {
  // '①' は NFKC で '1' に正規化される
  assert.equal(normalize('①'), '1');
});

test('normalize: 空文字列は空文字列を返す', () => {
  assert.equal(normalize(''), '');
});

// ─── normalizedKey ────────────────────────────────────────────────────────────

test('normalizedKey: 大文字を小文字化する', () => {
  assert.equal(normalizedKey('Hello World'), 'hello world');
});

test('normalizedKey: null は空文字列を返す', () => {
  assert.equal(normalizedKey(null), '');
});

test('normalizedKey: undefined は空文字列を返す', () => {
  assert.equal(normalizedKey(undefined), '');
});

test('normalizedKey: normalize と toLowerCase の合成', () => {
  assert.equal(normalizedKey('  FOO  BAR  '), 'foo bar');
});

test('normalizedKey: 全角英字を半角小文字化する', () => {
  // 'Ａ' (全角A) → NFKC → 'A' → toLowerCase → 'a'
  assert.equal(normalizedKey('Ａ'), 'a');
});

test('normalizedKey: 数値は文字列化して返す', () => {
  assert.equal(normalizedKey(0), '0');
});

// ─── cleanMetadata ────────────────────────────────────────────────────────────

test('cleanMetadata: 通常の文字列はそのまま返す (normalize済み)', () => {
  assert.equal(cleanMetadata('エンジェル'), 'エンジェル');
});

test('cleanMetadata: #REF! は空文字列を返す', () => {
  assert.equal(cleanMetadata('#REF!'), '');
});

test('cleanMetadata: #N/A は空文字列を返す', () => {
  assert.equal(cleanMetadata('#N/A'), '');
});

test('cleanMetadata: N/A は空文字列を返す', () => {
  assert.equal(cleanMetadata('N/A'), '');
});

test('cleanMetadata: NULL は空文字列を返す', () => {
  assert.equal(cleanMetadata('NULL'), '');
});

test('cleanMetadata: センチネルは小文字でもヒットする (大文字照合)', () => {
  assert.equal(cleanMetadata('null'), '');
  assert.equal(cleanMetadata('n/a'), '');
});

test('cleanMetadata: null 入力は空文字列を返す', () => {
  assert.equal(cleanMetadata(null), '');
});

test('cleanMetadata: undefined 入力は空文字列を返す', () => {
  assert.equal(cleanMetadata(undefined), '');
});

// ─── escapeHtml ───────────────────────────────────────────────────────────────

test('escapeHtml: & をエスケープする', () => {
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
});

test('escapeHtml: < をエスケープする', () => {
  assert.equal(escapeHtml('<div>'), '&lt;div&gt;');
});

test('escapeHtml: > をエスケープする', () => {
  assert.equal(escapeHtml('x > y'), 'x &gt; y');
});

test('escapeHtml: " をエスケープする', () => {
  assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;');
});

test("escapeHtml: ' をエスケープする", () => {
  assert.equal(escapeHtml("it's"), 'it&#39;s');
});

test('escapeHtml: null は空文字列を返す', () => {
  assert.equal(escapeHtml(null), '');
});

test('escapeHtml: undefined は空文字列を返す', () => {
  assert.equal(escapeHtml(undefined), '');
});

test('escapeHtml: 全特殊文字を含む文字列', () => {
  assert.equal(
    escapeHtml('<a href="x" data-x=\'y\'>a & b</a>'),
    '&lt;a href=&quot;x&quot; data-x=&#39;y&#39;&gt;a &amp; b&lt;/a&gt;',
  );
});

// ─── escapeRegExp ─────────────────────────────────────────────────────────────

test('escapeRegExp: ドット . をエスケープする', () => {
  assert.equal(escapeRegExp('a.b'), 'a\\.b');
});

test('escapeRegExp: アスタリスク * をエスケープする', () => {
  assert.equal(escapeRegExp('a*'), 'a\\*');
});

test('escapeRegExp: すべての特殊文字をエスケープする', () => {
  const special = '.*+?^${}()|[]\\';
  const escaped = escapeRegExp(special);
  // エスケープ後は正規表現としてコンパイル可能かつリテラルにマッチする
  assert.match(special, new RegExp(escaped));
});

test('escapeRegExp: null は空文字列を返す', () => {
  assert.equal(escapeRegExp(null), '');
});

test('escapeRegExp: undefined は空文字列を返す', () => {
  assert.equal(escapeRegExp(undefined), '');
});

test('escapeRegExp: 特殊文字なし文字列はそのまま返す', () => {
  assert.equal(escapeRegExp('hello world'), 'hello world');
});

test('escapeRegExp: バックスラッシュをエスケープする', () => {
  assert.equal(escapeRegExp('a\\b'), 'a\\\\b');
});
