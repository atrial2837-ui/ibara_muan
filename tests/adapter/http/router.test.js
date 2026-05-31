/**
 * @file tests/adapter/http/router.test.js
 * @description Router の単体テスト (Node built-in test runner)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../../../src/adapter/http/router.js';
import { ValidationError } from '../../../src/domain/error/validation-error.js';
import { NotFoundError } from '../../../src/domain/error/not-found-error.js';

/**
 * テスト用 Request を生成するヘルパー。
 *
 * @param {string} method
 * @param {string} url
 * @param {string} [body]
 * @returns {Request}
 */
function makeRequest(method, url, body) {
  return new Request(url, { method, body });
}

describe('Router', () => {
  // ─── ルート登録とディスパッチ ───────────────────────────────────────────

  it('get() でルートを登録し dispatch で GET ハンドラーが呼ばれる', async () => {
    const router = new Router();
    let called = false;
    router.get('/api/songs', () => {
      called = true;
      return new Response('ok', { status: 200 });
    });

    const res = await router.dispatch(makeRequest('GET', 'http://localhost/api/songs'));
    assert.equal(res.status, 200);
    assert.equal(called, true);
  });

  it('post() でルートを登録し dispatch で POST ハンドラーが呼ばれる', async () => {
    const router = new Router();
    let called = false;
    router.post('/api/songs', () => {
      called = true;
      return new Response('created', { status: 201 });
    });

    const res = await router.dispatch(makeRequest('POST', 'http://localhost/api/songs'));
    assert.equal(res.status, 201);
    assert.equal(called, true);
  });

  it('on() で任意メソッドのルートを登録できる', async () => {
    const router = new Router();
    router.on('DELETE', '/api/songs/1', () => new Response('deleted', { status: 200 }));

    const res = await router.dispatch(makeRequest('DELETE', 'http://localhost/api/songs/1'));
    assert.equal(res.status, 200);
  });

  it('on() のメソッドは大文字小文字を区別しない', async () => {
    const router = new Router();
    router.on('get', '/api/health', () => new Response('ok', { status: 200 }));

    const res = await router.dispatch(makeRequest('GET', 'http://localhost/api/health'));
    assert.equal(res.status, 200);
  });

  // ─── メソッドチェーン ─────────────────────────────────────────────────────

  it('on/get/post がメソッドチェーン (this) を返す', () => {
    const router = new Router();
    const result = router.get('/a', () => new Response('a')).post('/b', () => new Response('b'));
    assert(result instanceof Router);
  });

  // ─── 404 ─────────────────────────────────────────────────────────────────

  it('マッチするルートがない場合は 404 を返す', async () => {
    const router = new Router();
    router.get('/api/songs', () => new Response('ok'));

    const res = await router.dispatch(makeRequest('GET', 'http://localhost/api/unknown'));
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'Not Found');
  });

  it('メソッドが一致しない場合は 404 を返す', async () => {
    const router = new Router();
    router.get('/api/songs', () => new Response('ok'));

    const res = await router.dispatch(makeRequest('POST', 'http://localhost/api/songs'));
    assert.equal(res.status, 404);
  });

  // ─── エラーハンドリング ──────────────────────────────────────────────────

  it('handler が Error を throw すると 500 レスポンスになる', async () => {
    const router = new Router();
    router.get('/api/fail', () => {
      throw new Error('internal error');
    });

    const res = await router.dispatch(makeRequest('GET', 'http://localhost/api/fail'));
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'internal error');
  });

  it('handler が ValidationError を throw すると 400 になる', async () => {
    const router = new Router();
    router.post('/api/songs', () => {
      throw new ValidationError('title is required');
    });

    const res = await router.dispatch(makeRequest('POST', 'http://localhost/api/songs'));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'title is required');
  });

  it('handler が NotFoundError を throw すると 404 になる', async () => {
    const router = new Router();
    router.get('/api/songs/999', () => {
      throw new NotFoundError('song not found');
    });

    const res = await router.dispatch(makeRequest('GET', 'http://localhost/api/songs/999'));
    assert.equal(res.status, 404);
  });

  it('handler が Response を直接返せる', async () => {
    const router = new Router();
    router.get('/api/custom', () => new Response('custom body', { status: 202 }));

    const res = await router.dispatch(makeRequest('GET', 'http://localhost/api/custom'));
    assert.equal(res.status, 202);
    assert.equal(await res.text(), 'custom body');
  });

  // ─── RegExp パスのマッチング ─────────────────────────────────────────────

  it('RegExp パスが pathname にマッチすれば handler を呼ぶ', async () => {
    const router = new Router();
    router.get(/^\/api\/songs\/\d+$/, () => new Response('song', { status: 200 }));

    const res = await router.dispatch(makeRequest('GET', 'http://localhost/api/songs/42'));
    assert.equal(res.status, 200);
  });

  it('RegExp パスがマッチしない場合は 404 になる', async () => {
    const router = new Router();
    router.get(/^\/api\/songs\/\d+$/, () => new Response('song', { status: 200 }));

    const res = await router.dispatch(makeRequest('GET', 'http://localhost/api/songs/abc'));
    assert.equal(res.status, 404);
  });

  // ─── RouteContext の内容 ─────────────────────────────────────────────────

  it('ctx.query に URLSearchParams が渡される', async () => {
    const router = new Router();
    let receivedQ = null;
    router.get('/api/search', (ctx) => {
      receivedQ = ctx.query.get('q');
      return new Response('ok');
    });

    await router.dispatch(makeRequest('GET', 'http://localhost/api/search?q=kanau'));
    assert.equal(receivedQ, 'kanau');
  });

  it('ctx.env が dispatch に渡した env オブジェクトと同じ', async () => {
    const router = new Router();
    const env = { DB: 'mock-db', ADMIN_TOKEN: 'secret' };
    let receivedEnv = null;
    router.get('/api/health', (ctx) => {
      receivedEnv = ctx.env;
      return new Response('ok');
    });

    await router.dispatch(makeRequest('GET', 'http://localhost/api/health'), env);
    assert.equal(receivedEnv, env);
  });

  it('ctx.readJson は readJsonBody 関数が注入されている', async () => {
    const router = new Router();
    let receivedBody = null;
    router.post('/api/data', async (ctx) => {
      receivedBody = await ctx.readJson(ctx.request);
      return new Response('ok');
    });

    const req = new Request('http://localhost/api/data', {
      method: 'POST',
      body: '{"x":1}',
    });
    await router.dispatch(req);
    assert.deepEqual(receivedBody, { x: 1 });
  });

  // ─── 複数ルート ───────────────────────────────────────────────────────────

  it('複数のルートのうち最初にマッチしたものが呼ばれる', async () => {
    const router = new Router();
    const calls = [];
    router.get('/api/songs', () => { calls.push('first'); return new Response('first'); });
    router.get('/api/songs', () => { calls.push('second'); return new Response('second'); });

    await router.dispatch(makeRequest('GET', 'http://localhost/api/songs'));
    assert.deepEqual(calls, ['first']);
  });

  it('env を省略した場合は空オブジェクトが ctx.env になる', async () => {
    const router = new Router();
    let receivedEnv = null;
    router.get('/api/health', (ctx) => {
      receivedEnv = ctx.env;
      return new Response('ok');
    });

    await router.dispatch(makeRequest('GET', 'http://localhost/api/health'));
    assert.deepEqual(receivedEnv, {});
  });
});
