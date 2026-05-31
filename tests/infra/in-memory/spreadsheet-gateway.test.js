/**
 * @file tests/infra/in-memory/spreadsheet-gateway.test.js
 * @description InMemorySpreadsheetGateway の単独テスト。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemorySpreadsheetGateway } from '../../../src/infra/in-memory/in-memory-spreadsheet-gateway.js';

const CSV_TEXT = 'title,artist\nテスト曲,アーティスト\n';
const URL = 'https://example.com/sheet.csv';

test('InMemorySpreadsheetGateway: 登録済み URL の CSV テキストを返す', async () => {
  const gw = new InMemorySpreadsheetGateway(new Map([[URL, CSV_TEXT]]));
  const result = await gw.fetchCsv(URL);
  assert.equal(result, CSV_TEXT);
});

test('InMemorySpreadsheetGateway: 未登録 URL は Error を throw する', async () => {
  const gw = new InMemorySpreadsheetGateway(new Map([[URL, CSV_TEXT]]));
  await assert.rejects(() => gw.fetchCsv('https://example.com/unknown.csv'), Error);
});

test('InMemorySpreadsheetGateway: plain object で csvMap を渡せる', async () => {
  const gw = new InMemorySpreadsheetGateway({ [URL]: CSV_TEXT });
  const result = await gw.fetchCsv(URL);
  assert.equal(result, CSV_TEXT);
});

test('InMemorySpreadsheetGateway: 複数 URL を登録できる', async () => {
  const URL2 = 'https://example.com/other.csv';
  const gw = new InMemorySpreadsheetGateway({ [URL]: 'csv1', [URL2]: 'csv2' });
  assert.equal(await gw.fetchCsv(URL), 'csv1');
  assert.equal(await gw.fetchCsv(URL2), 'csv2');
});

test('InMemorySpreadsheetGateway: 空の csvMap では任意の URL で throw する', async () => {
  const gw = new InMemorySpreadsheetGateway(new Map());
  await assert.rejects(() => gw.fetchCsv(URL), Error);
});

test('InMemorySpreadsheetGateway: 戻り値は Promise<string>', async () => {
  const gw = new InMemorySpreadsheetGateway({ [URL]: CSV_TEXT });
  const result = gw.fetchCsv(URL);
  assert.ok(result instanceof Promise);
  assert.equal(typeof await result, 'string');
});
