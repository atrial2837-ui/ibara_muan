/**
 * @file tests/adapter/http/admin-auth-middleware.test.js
 * @description wrapWithAdminAuth の単体テスト (Node built-in test runner)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { wrapWithAdminAuth } from '../../../src/adapter/http/admin-auth-middleware.js';

/**
 * テスト用 RouteContext を生成するヘルパー。
 *
 * @param {{ token?: string|null, env?: object }} opts
 * @returns {import('../../../src/adapter/http/router.js').RouteContext}
 */
function makeCtx({ token = null, env = {} } = {}) {
  const headers = new Headers();
  if (token !== null && token !== undefined) {
    headers.set('x-admin-token', token);
  }
  const request = new Request('http://localhost/api/admin/health', {
    method: 'GET',
    headers,
  });
  return {
    request,
    env,
    query: new URLSearchParams(),
    readJson: async () => null,
  };
}

describe('wrapWithAdminAuth', () => {
  // ─── 認証成功 ─────────────────────────────────────────────────────────────

  it('token が一致する場合は handler が呼ばれる', async () => {
    let called = false;
    const handler = async (_ctx) => {
      called = true;
      return new Response('ok', { status: 200 });
    };
    const wrapped = wrapWithAdminAuth(handler, (env) => env.ADMIN_TOKEN);
    const ctx = makeCtx({ token: 'secret', env: { ADMIN_TOKEN: 'secret' } });

    const res = await wrapped(ctx);
    assert.equal(res.status, 200);
    assert.equal(called, true);
  });

  it('strict=false で token 未設定の場合は handler が呼ばれる (既存互換)', async () => {
    let called = false;
    const handler = async (_ctx) => {
      called = true;
      return new Response('ok', { status: 200 });
    };
    const wrapped = wrapWithAdminAuth(handler, (env) => env.ADMIN_TOKEN, { strict: false });
    const ctx = makeCtx({ token: null, env: {} }); // ADMIN_TOKEN 未設定

    const res = await wrapped(ctx);
    assert.equal(res.status, 200);
    assert.equal(called, true);
  });

  // ─── 認証失敗 ─────────────────────────────────────────────────────────────

  it('token が null (ヘッダー未送信) → 401', async () => {
    const handler = async () => new Response('ok', { status: 200 });
    const wrapped = wrapWithAdminAuth(handler, (env) => env.ADMIN_TOKEN);
    const ctx = makeCtx({ token: null, env: { ADMIN_TOKEN: 'secret' } });

    const res = await wrapped(ctx);
    assert.equal(res.status, 401);
    assert.equal(res.headers.get('Content-Type'), 'application/json; charset=utf-8');
  });

  it('token が不一致 → 401', async () => {
    const handler = async () => new Response('ok', { status: 200 });
    const wrapped = wrapWithAdminAuth(handler, (env) => env.ADMIN_TOKEN);
    const ctx = makeCtx({ token: 'wrong', env: { ADMIN_TOKEN: 'secret' } });

    const res = await wrapped(ctx);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'Invalid admin token');
  });

  it('strict=true (デフォルト) で ADMIN_TOKEN 未設定 → 401', async () => {
    const handler = async () => new Response('ok', { status: 200 });
    const wrapped = wrapWithAdminAuth(handler, (env) => env.ADMIN_TOKEN);
    const ctx = makeCtx({ token: 'any', env: {} }); // ADMIN_TOKEN 未設定

    const res = await wrapped(ctx);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'ADMIN_TOKEN is not configured');
  });

  // ─── expectedTokenGetter の柔軟性 ────────────────────────────────────────

  it('expectedTokenGetter で process.env のような外部値を使える', async () => {
    let called = false;
    const handler = async () => {
      called = true;
      return new Response('ok', { status: 200 });
    };
    const MY_TOKEN = 'node-server-token';
    const wrapped = wrapWithAdminAuth(handler, (_env) => MY_TOKEN);
    const ctx = makeCtx({ token: 'node-server-token', env: {} });

    const res = await wrapped(ctx);
    assert.equal(res.status, 200);
    assert.equal(called, true);
  });

  it('handler が呼ばれず認証失敗時に handler の副作用が起きない', async () => {
    let handlerCallCount = 0;
    const handler = async () => {
      handlerCallCount++;
      return new Response('ok');
    };
    const wrapped = wrapWithAdminAuth(handler, (env) => env.ADMIN_TOKEN);
    const ctx = makeCtx({ token: 'bad', env: { ADMIN_TOKEN: 'secret' } });

    await wrapped(ctx);
    assert.equal(handlerCallCount, 0);
  });
});
