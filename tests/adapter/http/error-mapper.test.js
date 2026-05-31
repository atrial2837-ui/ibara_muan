/**
 * @file tests/adapter/http/error-mapper.test.js
 * @description mapErrorToResponse の単体テスト (Node built-in test runner)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapErrorToResponse } from '../../../src/adapter/http/error-mapper.js';
import { ValidationError } from '../../../src/domain/error/validation-error.js';
import { NotFoundError } from '../../../src/domain/error/not-found-error.js';

describe('mapErrorToResponse', () => {
  it('ValidationError → 400', async () => {
    const res = mapErrorToResponse(new ValidationError('入力が不正です'));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, '入力が不正です');
  });

  it('NotFoundError → 404', async () => {
    const res = mapErrorToResponse(new NotFoundError('リソースが見つかりません'));
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'リソースが見つかりません');
  });

  it('error.status=409 → 409 (既存互換)', async () => {
    const err = Object.assign(new Error('Conflict'), { status: 409 });
    const res = mapErrorToResponse(err);
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error, 'Conflict');
  });

  it('error.status=401 → 401 (既存互換)', async () => {
    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    const res = mapErrorToResponse(err);
    assert.equal(res.status, 401);
  });

  it('通常の Error → 500', async () => {
    const res = mapErrorToResponse(new Error('something went wrong'));
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'something went wrong');
  });

  it('非 Error (string) → 500', async () => {
    const res = mapErrorToResponse('raw string error');
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'raw string error');
  });

  it('非 Error (number) → 500', async () => {
    const res = mapErrorToResponse(42);
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, '42');
  });

  it('レスポンスの Content-Type は application/json', () => {
    const res = mapErrorToResponse(new Error('test'));
    assert.equal(res.headers.get('Content-Type'), 'application/json; charset=utf-8');
  });

  it('ValidationError は error.status=400 を持つが instanceof チェックが優先される', async () => {
    const err = new ValidationError('bad input');
    // ValidationError は status=400 プロパティを持つが, instanceof で判定されること
    assert.equal(err.status, 400);
    const res = mapErrorToResponse(err);
    assert.equal(res.status, 400);
  });

  it('NotFoundError は error.status=404 を持つが instanceof チェックが優先される', async () => {
    const err = new NotFoundError('not found');
    assert.equal(err.status, 404);
    const res = mapErrorToResponse(err);
    assert.equal(res.status, 404);
  });

  it('error.status が数値でない場合は 500 にフォールバック', async () => {
    const err = Object.assign(new Error('fail'), { status: 'bad' });
    const res = mapErrorToResponse(err);
    assert.equal(res.status, 500);
  });
});
