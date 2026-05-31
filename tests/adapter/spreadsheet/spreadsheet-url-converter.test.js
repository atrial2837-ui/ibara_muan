/**
 * @file tests/adapter/spreadsheet/spreadsheet-url-converter.test.js
 * @description spreadsheetCsvUrl の単体テスト (Node built-in test runner)
 *
 * 実行方法: node --test tests/adapter/spreadsheet/spreadsheet-url-converter.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spreadsheetCsvUrl } from '../../../src/adapter/spreadsheet/spreadsheet-url-converter.js';

// ─── 空 / null ────────────────────────────────────────────────────────────────

test('spreadsheetCsvUrl: 空文字列は空文字列を返す', () => {
  assert.equal(spreadsheetCsvUrl(''), '');
});

test('spreadsheetCsvUrl: null は空文字列を返す', () => {
  assert.equal(spreadsheetCsvUrl(null), '');
});

test('spreadsheetCsvUrl: undefined は空文字列を返す', () => {
  assert.equal(spreadsheetCsvUrl(undefined), '');
});

// ─── 既に CSV URL ─────────────────────────────────────────────────────────────

test('spreadsheetCsvUrl: output=csv を含む URL はそのまま返す', () => {
  const url = 'https://docs.google.com/spreadsheets/d/ABC/export?format=csv&output=csv';
  assert.equal(spreadsheetCsvUrl(url), url);
});

test('spreadsheetCsvUrl: tqx=out:csv を含む URL はそのまま返す', () => {
  const url = 'https://docs.google.com/spreadsheets/d/ABC/gviz/tq?tqx=out:csv&gid=0';
  assert.equal(spreadsheetCsvUrl(url), url);
});

// ─── Google Sheets 編集 URL 変換 ─────────────────────────────────────────────

test('spreadsheetCsvUrl: 編集 URL を CSV URL に変換する (gid なし → gid=0)', () => {
  const editUrl = 'https://docs.google.com/spreadsheets/d/SHEET_ID/edit';
  const result = spreadsheetCsvUrl(editUrl);
  assert.equal(
    result,
    'https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&gid=0'
  );
});

test('spreadsheetCsvUrl: gid パラメータがある場合は保持する', () => {
  const editUrl = 'https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=12345';
  const result = spreadsheetCsvUrl(editUrl);
  assert.equal(
    result,
    'https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&gid=12345'
  );
});

test('spreadsheetCsvUrl: ?gid= 形式も gid を抽出できる', () => {
  const editUrl = 'https://docs.google.com/spreadsheets/d/SHEET_ID/edit?gid=99';
  const result = spreadsheetCsvUrl(editUrl);
  assert.equal(
    result,
    'https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&gid=99'
  );
});

// ─── 変換不能 URL ─────────────────────────────────────────────────────────────

test('spreadsheetCsvUrl: /spreadsheets/d/ を含まない URL はそのまま返す', () => {
  const url = 'https://example.com/some-sheet';
  assert.equal(spreadsheetCsvUrl(url), url);
});

// ─── normalize 適用確認 ───────────────────────────────────────────────────────

test('spreadsheetCsvUrl: 前後空白は除去される', () => {
  const editUrl = '  https://docs.google.com/spreadsheets/d/SHEET_ID/edit  ';
  const result = spreadsheetCsvUrl(editUrl);
  assert.equal(
    result,
    'https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&gid=0'
  );
});
