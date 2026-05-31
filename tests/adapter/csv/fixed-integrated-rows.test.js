/**
 * @file tests/adapter/csv/fixed-integrated-rows.test.js
 * @description fixedIntegratedRows の単体テスト (Node built-in test runner)
 *
 * 実行方法: node --test tests/adapter/csv/fixed-integrated-rows.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixedIntegratedRows } from '../../../src/adapter/csv/fixed-integrated-rows.js';

/**
 * テスト用 CSV 行を生成する。固定列は:
 *   index 19 (T列): title
 *   index 20 (U列): artist
 *   index 21 (V列): displayKey
 *   index 23 (X列): genre  (index 22 = W列 はスキップ)
 *
 * @param {string} title
 * @param {string} artist
 * @param {string} displayKey
 * @param {string} genre
 * @returns {string} 1行分の CSV 文字列
 */
function makeCsvRow(title = '', artist = '', displayKey = '', genre = '') {
  const cells = Array(24).fill('');
  cells[19] = title;
  cells[20] = artist;
  cells[21] = displayKey;
  cells[23] = genre;
  return cells.join(',');
}

// ─── 基本ケース ───────────────────────────────────────────────────────────────

test('fixedIntegratedRows: title + displayKey がある行を返す', () => {
  const csv = 'header_row\n' + makeCsvRow('曲名', 'アーティスト', '+2', '');
  const result = fixedIntegratedRows(csv);
  assert.equal(result.length, 1);
  assert.equal(result[0].title, '曲名');
  assert.equal(result[0].artist, 'アーティスト');
  assert.equal(result[0].displayKey, '+2');
});

test('fixedIntegratedRows: title + genre がある行を返す', () => {
  const csv = 'header_row\n' + makeCsvRow('曲名', '', '', 'J-POP');
  const result = fixedIntegratedRows(csv);
  assert.equal(result.length, 1);
  assert.equal(result[0].genre, 'J-POP');
});

test('fixedIntegratedRows: title + displayKey + genre 両方ある行も返す', () => {
  const csv = 'header_row\n' + makeCsvRow('曲名', 'アーティスト', '-1', 'アニソン');
  const result = fixedIntegratedRows(csv);
  assert.equal(result.length, 1);
  assert.equal(result[0].displayKey, '-1');
  assert.equal(result[0].genre, 'アニソン');
});

// ─── フィルタリング ────────────────────────────────────────────────────────────

test('fixedIntegratedRows: title が空の行はスキップ', () => {
  const csv = 'header_row\n' + makeCsvRow('', 'アーティスト', '+1', '');
  assert.equal(fixedIntegratedRows(csv).length, 0);
});

test('fixedIntegratedRows: displayKey も genre も空の行はスキップ', () => {
  const csv = 'header_row\n' + makeCsvRow('曲名', 'アーティスト', '', '');
  assert.equal(fixedIntegratedRows(csv).length, 0);
});

test('fixedIntegratedRows: displayKey が無効値 (#REF!) でも genre があれば返す', () => {
  const csv = 'header_row\n' + makeCsvRow('曲名', '', '#REF!', 'J-POP');
  // #REF! は parseDisplayKey → '' (falsy), genre は 'J-POP' (truthy via cleanMetadata)
  const result = fixedIntegratedRows(csv);
  assert.equal(result.length, 1);
});

test('fixedIntegratedRows: 複数行のうち有効な行のみ返す', () => {
  const validRow = makeCsvRow('曲名A', 'アーティスト', '+1', '');
  const invalidRow = makeCsvRow('', 'アーティスト', '+1', ''); // title 空
  const csv = 'header\n' + validRow + '\n' + invalidRow;
  assert.equal(fixedIntegratedRows(csv).length, 1);
});

// ─── インデックス確認 ─────────────────────────────────────────────────────────

test('fixedIntegratedRows: W列 (index 22) は genre ではなく無視される', () => {
  // index 22 に genre 値を入れても取得されない (index 23 が genre)
  const cells = Array(24).fill('');
  cells[19] = '曲名';
  cells[20] = 'アーティスト';
  cells[21] = '+1';
  cells[22] = 'ここはW列';  // genre として拾われない
  cells[23] = '';
  const csv = cells.join(',');
  const result = fixedIntegratedRows(csv);
  assert.equal(result.length, 1);
  assert.equal(result[0].genre, ''); // W列の値は無視
});

test('fixedIntegratedRows: 空 CSV は空配列', () => {
  assert.deepEqual(fixedIntegratedRows(''), []);
});
