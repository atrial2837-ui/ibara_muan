/**
 * @file tests/domain/stream/setlist-parser.test.js
 * @description stream/setlist-parser モジュールの単体テスト (Node built-in test runner)
 *
 * 実行方法: node --test tests/domain/stream/setlist-parser.test.js
 *
 * ## テスト設計の背景
 *   admin-server/server.js:56-79 の既知バグ修正 (displayKey に parseDisplayKey を通さない)
 *   を検証するため、無効 displayKey が '' になることを明示的に確認するテストを含む。
 *   SoT 03_admin_server.md §8-6 参照。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSongLine, cleanSongLine } from '../../../src/domain/stream/setlist-parser.js';

// ─── splitSongLine: 基本ケース ────────────────────────────────────────────────

test('splitSongLine: 基本形 "曲名 / アーティスト" を正しく分割する', () => {
  const result = splitSongLine('One Last Kiss / 宇多田ヒカル');
  assert.equal(result.title, 'One Last Kiss');
  assert.equal(result.artist, '宇多田ヒカル');
  assert.equal(result.displayKey, '');
  assert.equal(result.genre, '');
  assert.equal(result.raw, 'One Last Kiss / 宇多田ヒカル');
});

test('splitSongLine: 拡張形 SoT 04 付録実例 "ステラ / Leo/need | 原キー | ゲーム・キャラソン"', () => {
  // アーティスト名 'Leo/need' に '/' が含まれるため lastIndexOf で正しく分離される
  const result = splitSongLine('ステラ / Leo/need | 原キー | ゲーム・キャラソン');
  assert.equal(result.title, 'ステラ');
  assert.equal(result.artist, 'Leo/need');
  assert.equal(result.displayKey, '原キー');
  assert.equal(result.genre, 'ゲーム・キャラソン');
  assert.equal(result.raw, 'ステラ / Leo/need | 原キー | ゲーム・キャラソン');
});

// ─── splitSongLine: セパレータバリエーション ──────────────────────────────────

test('splitSongLine: 全角スラッシュ "曲名 ／ アーティスト" を分割する', () => {
  const result = splitSongLine('曲名 ／ アーティスト');
  assert.equal(result.title, '曲名');
  assert.equal(result.artist, 'アーティスト');
});

test('splitSongLine: スペースなし半角スラッシュ "曲名/アーティスト" を分割する', () => {
  const result = splitSongLine('曲名/アーティスト');
  assert.equal(result.title, '曲名');
  assert.equal(result.artist, 'アーティスト');
});

test('splitSongLine: " / " が最優先 (lastIndexOf で右端)', () => {
  // "A/B / C" → ' / ' の lastIndexOf → index=3 → title='A/B', artist='C'
  const result = splitSongLine('A/B / C');
  assert.equal(result.title, 'A/B');
  assert.equal(result.artist, 'C');
});

test('splitSongLine: アーティスト名に "/" が含まれても正しく分割する (lastIndexOf 右端優先)', () => {
  // "曲名 / Art/ist" → ' / ' の lastIndexOf → 最右端 → title='曲名', artist='Art/ist'
  const result = splitSongLine('曲名 / Art/ist');
  assert.equal(result.title, '曲名');
  assert.equal(result.artist, 'Art/ist');
});

// ─── splitSongLine: displayKey バリエーション ─────────────────────────────────

test('splitSongLine: キー "原キー" を正しく解析する', () => {
  const result = splitSongLine('曲名 / アーティスト | 原キー');
  assert.equal(result.displayKey, '原キー');
  assert.equal(result.genre, '');
});

test('splitSongLine: キー "+2" を正しく解析する', () => {
  const result = splitSongLine('曲名 / アーティスト | +2 | J-POP');
  assert.equal(result.displayKey, '+2');
});

test('splitSongLine: キー "-1" を正しく解析する', () => {
  const result = splitSongLine('曲名 / アーティスト | -1');
  assert.equal(result.displayKey, '-1');
});

test('splitSongLine: 全角プラス "＋2" → "+2" に正規化される', () => {
  // SoT 10 §3-2 の仕様: '＋' → '+' 全角→半角正規化
  const result = splitSongLine('曲名 / アーティスト | ＋2 | J-POP');
  assert.equal(result.displayKey, '+2');
});

test('splitSongLine: 無効キー "invalid_key" → displayKey は "" (admin-server バグ修正の検証)', () => {
  // admin-server では 'invalid_key' がそのまま displayKey に入るが、
  // Domain では parseDisplayKey を通すため '' になる。
  // これは SoT 03_admin_server.md §8-6 で明示された既知バグの修正。
  const result = splitSongLine('曲名 / アーティスト | invalid_key | アニソン');
  assert.equal(result.displayKey, '');
  assert.equal(result.genre, 'アニソン');
});

test('splitSongLine: displayKey に "#REF!" → "" に変換される', () => {
  const result = splitSongLine('曲名 / アーティスト | #REF! | アニソン');
  assert.equal(result.displayKey, '');
});

// ─── splitSongLine: genre バリエーション ──────────────────────────────────────

test('splitSongLine: genre なし → genre は ""', () => {
  const result = splitSongLine('曲名 / アーティスト | 原キー');
  assert.equal(result.genre, '');
});

test('splitSongLine: キーもジャンルもなし → displayKey は ""、genre は ""', () => {
  const result = splitSongLine('曲名 / アーティスト');
  assert.equal(result.displayKey, '');
  assert.equal(result.genre, '');
});

test('splitSongLine: genre に "#REF!" → "" に変換される (cleanMetadata)', () => {
  const result = splitSongLine('曲名 / アーティスト | 原キー | #REF!');
  assert.equal(result.genre, '');
});

test('splitSongLine: genre に "N/A" → "" に変換される (cleanMetadata)', () => {
  const result = splitSongLine('曲名 / アーティスト | 原キー | N/A');
  assert.equal(result.genre, '');
});

// ─── splitSongLine: エッジケース ──────────────────────────────────────────────

test('splitSongLine: 空文字列 → { title: "", artist: "", displayKey: "", genre: "", raw: "" }', () => {
  const result = splitSongLine('');
  assert.equal(result.title, '');
  assert.equal(result.artist, '');
  assert.equal(result.displayKey, '');
  assert.equal(result.genre, '');
  assert.equal(result.raw, '');
});

test('splitSongLine: null → 空入力と同等', () => {
  const result = splitSongLine(null);
  assert.equal(result.title, '');
  assert.equal(result.artist, '');
  assert.equal(result.displayKey, '');
  assert.equal(result.genre, '');
  assert.equal(result.raw, '');
});

test('splitSongLine: undefined → 空入力と同等', () => {
  const result = splitSongLine(undefined);
  assert.equal(result.title, '');
  assert.equal(result.artist, '');
  assert.equal(result.raw, '');
});

test('splitSongLine: セパレータなし → title に全体、artist は ""', () => {
  const result = splitSongLine('セパレータなし曲名');
  assert.equal(result.title, 'セパレータなし曲名');
  assert.equal(result.artist, '');
});

test('splitSongLine: 前後の空白は trim される', () => {
  const result = splitSongLine('  曲名 / アーティスト  ');
  assert.equal(result.raw, '曲名 / アーティスト');
  assert.equal(result.title, '曲名');
  assert.equal(result.artist, 'アーティスト');
});

test('splitSongLine: title と artist に normalize が適用される (全角英字)', () => {
  // 'Ａ' (全角A) は NFKC で 'A' に正規化される
  const result = splitSongLine('Ａ曲名 / Ｂアーティスト');
  assert.equal(result.title, 'A曲名');
  assert.equal(result.artist, 'Bアーティスト');
});

test('splitSongLine: パイプ区切り 4 フィールド以上でも displayKey と genre のみ抽出', () => {
  const result = splitSongLine('曲名 / アーティスト | +2 | J-POP | 余分なフィールド');
  assert.equal(result.displayKey, '+2');
  assert.equal(result.genre, 'J-POP');
  assert.equal(result.raw, '曲名 / アーティスト | +2 | J-POP | 余分なフィールド');
});

test('splitSongLine: raw フィールドは trim 後の入力テキストそのまま', () => {
  const input = 'ステラ / Leo/need | 原キー | ゲーム・キャラソン';
  const result = splitSongLine(input);
  assert.equal(result.raw, input);
});

// ─── cleanSongLine: タイムスタンプ除去 ────────────────────────────────────────

test('cleanSongLine: HH:MM タイムスタンプを除去する', () => {
  assert.equal(cleanSongLine('00:01 ステラ / Leo/need'), 'ステラ / Leo/need');
});

test('cleanSongLine: HH:MM:SS タイムスタンプを除去する', () => {
  assert.equal(cleanSongLine('1:23:45 One Last Kiss / 宇多田ヒカル'), 'One Last Kiss / 宇多田ヒカル');
});

test('cleanSongLine: 複数のタイムスタンプを除去する', () => {
  assert.equal(cleanSongLine('0:00 曲名 / アーティスト 1:30'), '曲名 / アーティスト');
});

// ─── cleanSongLine: 行頭マーク除去 ────────────────────────────────────────────

test('cleanSongLine: 行頭の "1." を除去する', () => {
  assert.equal(cleanSongLine('1. One Last Kiss / 宇多田ヒカル'), 'One Last Kiss / 宇多田ヒカル');
});

test('cleanSongLine: 行頭の "10." を除去する (2桁)', () => {
  assert.equal(cleanSongLine('10. 曲名 / アーティスト'), '曲名 / アーティスト');
});

test('cleanSongLine: 行頭の "-" を除去する', () => {
  assert.equal(cleanSongLine('- 曲名 / アーティスト'), '曲名 / アーティスト');
});

test('cleanSongLine: 行頭の "・" を除去する', () => {
  assert.equal(cleanSongLine('・曲名 / アーティスト'), '曲名 / アーティスト');
});

test('cleanSongLine: マークなし・タイムスタンプなしの行はそのまま返す', () => {
  assert.equal(cleanSongLine('曲名 / アーティスト'), '曲名 / アーティスト');
});

test('cleanSongLine: 空文字列は空文字列を返す', () => {
  assert.equal(cleanSongLine(''), '');
});

test('cleanSongLine: タイムスタンプ除去後に行頭マークを除去する (組み合わせ)', () => {
  // "1:23 1. 曲名 / アーティスト" → タイムスタンプ除去 → "1. 曲名 / アーティスト" → マーク除去 → "曲名 / アーティスト"
  assert.equal(cleanSongLine('1:23 1. 曲名 / アーティスト'), '曲名 / アーティスト');
});
