/**
 * @file tests/adapter/http/read-json-body.test.js
 * @description readJsonBody の単体テスト (Node built-in test runner)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readJsonBody } from '../../../src/adapter/http/read-json-body.js';

/**
 * テスト用 Request を生成するヘルパー。
 *
 * @param {string} body
 * @returns {Request}
 */
function makeRequest(body) {
  return new Request('http://localhost/', {
    method: 'POST',
    body,
  });
}

describe('readJsonBody', () => {
  it('正常な JSON オブジェクト → object を返す', async () => {
    const req = makeRequest('{"name":"kanau","count":10}');
    const result = await readJsonBody(req);
    assert.deepEqual(result, { name: 'kanau', count: 10 });
  });

  it('JSON 配列 → array を返す', async () => {
    const req = makeRequest('[1,2,3]');
    const result = await readJsonBody(req);
    assert.deepEqual(result, [1, 2, 3]);
  });

  it('JSON 文字列 → string を返す', async () => {
    const req = makeRequest('"hello"');
    const result = await readJsonBody(req);
    assert.equal(result, 'hello');
  });

  it('空 body → null を返す', async () => {
    const req = new Request('http://localhost/', { method: 'POST' });
    const result = await readJsonBody(req);
    assert.equal(result, null);
  });

  it('空文字列 body → null を返す', async () => {
    const req = makeRequest('');
    const result = await readJsonBody(req);
    assert.equal(result, null);
  });

  it('不正 JSON → null を返す (例外を投げない)', async () => {
    const req = makeRequest('{invalid json}');
    const result = await readJsonBody(req);
    assert.equal(result, null);
  });

  it('途中で切れた JSON → null を返す', async () => {
    const req = makeRequest('{"key":');
    const result = await readJsonBody(req);
    assert.equal(result, null);
  });

  it('JSON null リテラル → null を返す', async () => {
    // "null" という文字列は JSON.parse すると null になる
    // しかし text が空でないため JSON.parse を試みる
    const req = makeRequest('null');
    const result = await readJsonBody(req);
    assert.equal(result, null);
  });

  it('ネストしたオブジェクト → 正しくパース', async () => {
    const data = { songs: [{ id: 1, title: 'test' }], total: 1 };
    const req = makeRequest(JSON.stringify(data));
    const result = await readJsonBody(req);
    assert.deepEqual(result, data);
  });
});
