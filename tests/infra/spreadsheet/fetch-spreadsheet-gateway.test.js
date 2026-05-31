/**
 * @module tests/infra/spreadsheet/fetch-spreadsheet-gateway.test
 * @description FetchSpreadsheetGateway のテスト。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FetchSpreadsheetGateway } from '../../../src/infra/spreadsheet/fetch-spreadsheet-gateway.js';

test('fetchCsv: returns text on success', async () => {
  const mockFetch = async () => ({
    ok: true,
    text: async () => 'a,b,c\n1,2,3',
  });
  const gw = new FetchSpreadsheetGateway(mockFetch);
  const csv = await gw.fetchCsv('https://example.com/data.csv');
  assert.equal(csv, 'a,b,c\n1,2,3');
});

test('fetchCsv: throws on HTTP 404', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 404,
  });
  const gw = new FetchSpreadsheetGateway(mockFetch);
  await assert.rejects(() => gw.fetchCsv('https://example.com/missing.csv'), /404/);
});

test('fetchCsv: throws on HTTP 500', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 500,
  });
  const gw = new FetchSpreadsheetGateway(mockFetch);
  await assert.rejects(() => gw.fetchCsv('https://example.com/data.csv'), /500/);
});

test('fetchCsv: throws on HTTP 403', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 403,
  });
  const gw = new FetchSpreadsheetGateway(mockFetch);
  await assert.rejects(() => gw.fetchCsv('https://example.com/data.csv'), /403/);
});

test('fetchCsv: uses default fetch if not provided', async () => {
  const gw = new FetchSpreadsheetGateway();
  assert(typeof gw.fetch === 'function', 'should have fetch method');
});

test('fetchCsv: returns empty CSV on success', async () => {
  const mockFetch = async () => ({
    ok: true,
    text: async () => '',
  });
  const gw = new FetchSpreadsheetGateway(mockFetch);
  const csv = await gw.fetchCsv('https://example.com/empty.csv');
  assert.equal(csv, '');
});
