import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { onRequest } from '../../functions/api/admin/[[path]].js';

describe('Pages admin function', () => {
  it('D1不要の /health は DB binding なしでも応答する', async () => {
    const response = await onRequest({
      request: new Request('https://example.test/api/admin/health'),
      env: {},
      params: { path: ['health'] },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, db: false });
  });

  it('D1が必要なルートでは依存構築エラーを返す', async () => {
    const response = await onRequest({
      request: new Request('https://example.test/api/admin/status'),
      env: {},
      params: { path: ['status'] },
    });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'D1 binding DB is missing' });
  });

  it('静的データ生成は既定で main / production を dispatch する', async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody = null;
    globalThis.fetch = async (_url, options) => {
      capturedBody = JSON.parse(options.body);
      return new Response(null, { status: 204 });
    };

    try {
      const response = await onRequest({
        request: new Request('https://example.test/api/admin/static-data/generate', {
          method: 'POST',
          headers: { 'x-admin-token': 'secret' },
        }),
        env: {
          ADMIN_TOKEN: 'secret',
          GITHUB_ACTIONS_TOKEN: 'ghp_test',
        },
        params: { path: ['static-data', 'generate'] },
      });

      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.ref, 'main');
      assert.equal(body.environment, 'production');
      assert.equal(capturedBody.ref, 'main');
      assert.equal(capturedBody.inputs.environment, 'production');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('自動更新は body の mode / min_timestamps を中継する', async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody = null;
    let capturedUrl = null;
    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(options.body);
      return new Response(null, { status: 204 });
    };

    try {
      const response = await onRequest({
        request: new Request('https://example.test/api/admin/auto-update/trigger', {
          method: 'POST',
          headers: { 'x-admin-token': 'secret', 'content-type': 'application/json' },
          body: JSON.stringify({ mode: 'scan-only', min_timestamps: 5 }),
        }),
        env: {
          ADMIN_TOKEN: 'secret',
          GITHUB_ACTIONS_TOKEN: 'ghp_test',
        },
        params: { path: ['auto-update', 'trigger'] },
      });

      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.mode, 'scan-only');
      assert.equal(body.minTimestamps, 5);
      assert.ok(capturedUrl.endsWith('/actions/workflows/auto-update.yml/dispatches'));
      assert.equal(capturedBody.inputs.mode, 'scan-only');
      assert.equal(capturedBody.inputs.min_timestamps, '5');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
