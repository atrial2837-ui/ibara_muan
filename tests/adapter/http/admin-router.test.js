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

/** 歌枠一覧 / 配信日更新ルート用の Router セットアップ */
function setupStreamRouter() {
  const channels = new InMemoryChannelRepository([
    { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2026-01-01T00:00:00.000Z' },
  ]);
  const streams = new InMemoryStreamRepository();
  const router = buildAdminRouter({
    pathPrefix: '/api',
    getDeps: () => ({
      channels,
      streams,
      songs: new InMemorySongRepository(),
      clock: new FakeClock(new Date('2026-07-31T12:00:00Z')),
    }),
    getAdminToken: () => null,
    authStrict: false,
    staticDataHandler: async () => jsonResponse({ ok: true }),
  });
  return { router, channels, streams };
}

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

  it('GET /streams で登録済み歌枠を配信日の新しい順に返す', async () => {
    const { router, streams } = setupStreamRouter();
    await streams.insert({
      channelId: 1, sourceIndex: 1, streamedOn: '2026-07-08', title: '旧い枠',
      url: 'https://example.com/a', urlKey: 'a', songCount: 3,
      createdAt: '2026-07-08T00:00:00.000Z',
    });
    await streams.insert({
      channelId: 1, sourceIndex: 2, streamedOn: '2026-07-31', title: '新しい枠',
      url: 'https://example.com/b', urlKey: 'b', songCount: 5,
      createdAt: '2026-07-31T00:00:00.000Z',
    });

    const response = await router.dispatch(
      new Request('http://localhost/api/streams?channel=new&limit=10', { method: 'GET' }),
      {},
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.total, 2);
    assert.deepEqual(body.streams.map((s) => s.streamedOn), ['2026-07-31', '2026-07-08']);
  });

  it('POST /streams/:id/date で配信日を更新する', async () => {
    const { router, streams } = setupStreamRouter();
    const { id } = await streams.insert({
      channelId: 1, sourceIndex: 1, streamedOn: '2026-07-31', title: 'むあゆる歌枠第2弾',
      url: 'https://example.com/x', urlKey: 'x', songCount: 3,
      createdAt: '2026-07-31T00:00:00.000Z',
    });

    const response = await router.dispatch(
      new Request(`http://localhost/api/streams/${id}/date`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ streamedOn: '2026-07-08' }),
      }),
      {},
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.previousStreamedOn, '2026-07-31');
    assert.equal(body.streamedOn, '2026-07-08');
    assert.equal((await streams.findById(id)).streamed_on, '2026-07-08');
  });

  it('POST /streams/:id/date は不正な日付を 400 で返す', async () => {
    const { router, streams } = setupStreamRouter();
    const { id } = await streams.insert({
      channelId: 1, sourceIndex: 1, streamedOn: '2026-07-31', title: 'なにか',
      url: 'https://example.com/y', urlKey: 'y', songCount: 1,
      createdAt: '2026-07-31T00:00:00.000Z',
    });

    const response = await router.dispatch(
      new Request(`http://localhost/api/streams/${id}/date`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ streamedOn: '2026/07/08' }),
      }),
      {},
    );
    assert.equal(response.status, 400);
  });

  it('POST /streams/:id/date は存在しない歌枠を 404 で返す', async () => {
    const { router } = setupStreamRouter();

    const response = await router.dispatch(
      new Request('http://localhost/api/streams/999/date', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ streamedOn: '2026-07-08' }),
      }),
      {},
    );
    assert.equal(response.status, 404);
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
