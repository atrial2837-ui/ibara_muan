import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildAdminRouter } from '../../../src/adapter/http/admin-router.js';
import { jsonResponse } from '../../../src/adapter/http/json-presenter.js';
import {
  InMemoryChannelRepository,
  InMemorySongRepository,
  InMemoryStreamRepository,
  FakeClock,
} from '../../../src/infra/in-memory/index.js';

describe('buildAdminRouter', () => {
  it('GET /status で loadAdminStatus 結果を返す', async () => {
    const channels = new InMemoryChannelRepository();
    const songs = new InMemorySongRepository();
    const streams = new InMemoryStreamRepository();
    const clock = new FakeClock(new Date('2026-05-24T12:00:00Z'));

    const router = buildAdminRouter({
      pathPrefix: '/api',
      getDeps: () => ({ channels, songs, streams, clock }),
      getAdminToken: () => null,
      authStrict: false,
      staticDataHandler: async () => jsonResponse({ ok: true }),
    });

    const request = new Request('http://localhost/api/status', { method: 'GET' });
    const response = await router.dispatch(request, {});
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body.channels));
    assert.ok(Array.isArray(body.issues));
    assert.ok(body.checkedAt);
  });

  it('pathPrefix なしで /health', async () => {
    const router = buildAdminRouter({
      pathPrefix: '',
      getDeps: () => ({
        channels: new InMemoryChannelRepository(),
        songs: new InMemorySongRepository(),
        streams: new InMemoryStreamRepository(),
        clock: new FakeClock(new Date('2026-05-24T12:00:00Z')),
      }),
      getAdminToken: () => null,
      authStrict: false,
      staticDataHandler: async () => jsonResponse({ ok: true }),
    });

    const response = await router.dispatch(
      new Request('http://localhost/health', { method: 'GET' }),
      { DB: {} },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.db, true);
  });
});
