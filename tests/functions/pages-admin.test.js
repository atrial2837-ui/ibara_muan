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
});
