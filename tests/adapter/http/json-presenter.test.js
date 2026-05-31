/**
 * @file tests/adapter/http/json-presenter.test.js
 * @description jsonResponse の単体テスト (Node built-in test runner)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { jsonResponse } from '../../../src/adapter/http/json-presenter.js';

describe('jsonResponse', () => {
  it('data と status を指定すると Response が返る', async () => {
    const res = jsonResponse({ ok: true }, 200);
    assert(res instanceof Response);
    assert.equal(res.status, 200);
  });

  it('status を省略すると 200 になる', () => {
    const res = jsonResponse({ hello: 'world' });
    assert.equal(res.status, 200);
  });

  it('body が JSON 文字列になっている', async () => {
    const data = { id: 1, name: 'test' };
    const res = jsonResponse(data);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), data);
  });

  it('Content-Type が application/json; charset=utf-8 になっている', () => {
    const res = jsonResponse({ x: 1 });
    assert.equal(res.headers.get('Content-Type'), 'application/json; charset=utf-8');
  });

  it('追加ヘッダーがマージされる', () => {
    const res = jsonResponse({ x: 1 }, 200, { 'Cache-Control': 'no-store' });
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.equal(res.headers.get('Content-Type'), 'application/json; charset=utf-8');
  });

  it('status 201 が正しく反映される', () => {
    const res = jsonResponse({ created: true }, 201);
    assert.equal(res.status, 201);
  });

  it('status 400 が正しく反映される', () => {
    const res = jsonResponse({ error: 'bad' }, 400);
    assert.equal(res.status, 400);
  });

  it('null データも JSON 文字列化される', async () => {
    const res = jsonResponse(null);
    const text = await res.text();
    assert.equal(text, 'null');
  });

  it('配列データも正しく JSON 文字列化される', async () => {
    const data = [1, 2, 3];
    const res = jsonResponse(data);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), data);
  });
});
