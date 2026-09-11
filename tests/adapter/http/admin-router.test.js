import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildAdminRouter } from '../../../src/adapter/http/admin-router.js';
import { jsonResponse } from '../../../src/adapter/http/json-presenter.js';
import {
  InMemoryArtistRepository,
  InMemoryChannelRepository,
  InMemorySongChannelStatsRepository,
  InMemorySongRepository,
  InMemoryStreamRepository,
  InMemoryStreamSongRepository,
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

describe('buildAdminRouter 歌枠・セトリ編集と打刻ツール', () => {
  function setupEditRouter() {
    const channels = new InMemoryChannelRepository([
      { id: 1, code: 'main', name: '茨むあん', sort_order: 1, created_at: '2026-01-01T00:00:00.000Z' },
    ]);
    const streams = new InMemoryStreamRepository();
    const streamSongs = new InMemoryStreamSongRepository();
    const songs = new InMemorySongRepository();
    const artists = new InMemoryArtistRepository();
    const stats = new InMemorySongChannelStatsRepository();
    const timestamps = {
      calls: [],
      async getApproved() {
        return [{ songIndex: 0, timeSeconds: 10 }];
      },
      async countApprovedByChannel() {
        return [{ streamIndex: 7, count: 3 }];
      },
      async replaceApproved(channelCode, streamIndex, items) {
        this.calls.push({ channelCode, streamIndex, items });
        return items.length;
      },
    };
    const router = buildAdminRouter({
      pathPrefix: '/api',
      getDeps: () => ({
        channels, streams, streamSongs, songs, artists, stats, timestamps,
        clock: new FakeClock(new Date('2026-08-02T00:00:00.000Z')),
      }),
      getAdminToken: () => null,
      authStrict: false,
      staticDataHandler: async () => jsonResponse({ ok: true }),
    });
    return { router, streams, streamSongs, timestamps };
  }

  async function seedStream(streams) {
    const { id } = await streams.insert({
      channelId: 1, sourceIndex: 7, streamedOn: '2026-08-02', title: '枠',
      url: 'https://example.com/s', urlKey: 'https://example.com/s', songCount: 1,
      createdAt: '2026-08-02T00:00:00.000Z',
    });
    return id;
  }

  it('GET /streams/:id/songs でセトリテキストを返す', async () => {
    const { router, streams, streamSongs } = setupEditRouter();
    const id = await seedStream(streams);
    await streamSongs.insertBatch([{
      streamId: id, songId: null, position: 1, rawText: 'レオ / 優里',
      titleSnapshot: 'レオ', artistSnapshot: '優里', songKeySnapshot: 'key',
      createdAt: '2026-08-02T00:00:00.000Z',
    }]);

    const response = await router.dispatch(
      new Request(`http://localhost/api/streams/${id}/songs`, { method: 'GET' }), {},
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.songsText, 'レオ / 優里');
  });

  it('POST /streams/:id でメタ情報を更新する', async () => {
    const { router, streams } = setupEditRouter();
    const id = await seedStream(streams);

    const response = await router.dispatch(
      new Request(`http://localhost/api/streams/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: '新タイトル' }),
      }),
      {},
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    assert.equal((await streams.findById(id)).title, '新タイトル');
  });

  it('POST /streams/:id/setlist でセトリを置き換える', async () => {
    const { router, streams, streamSongs } = setupEditRouter();
    const id = await seedStream(streams);

    const response = await router.dispatch(
      new Request(`http://localhost/api/streams/${id}/setlist`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ songsText: 'レオ / 優里\nダーリン / 須田景凪' }),
      }),
      {},
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { streamId: id, count: 2 });
    assert.equal((await streamSongs.findByStreamId(id)).length, 2);
  });

  it('POST /timestamps/bulk で承認済みを保存する', async () => {
    const { router, timestamps } = setupEditRouter();

    const response = await router.dispatch(
      new Request('http://localhost/api/timestamps/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          channelCode: 'main', streamIndex: 7,
          items: [{ songIndex: 0, timeSeconds: 5 }],
        }),
      }),
      {},
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, count: 1 });
    assert.equal(timestamps.calls.length, 1);
    assert.equal(timestamps.calls[0].channelCode, 'main');
  });

  it('GET /timestamps/coverage で枠別件数を返す', async () => {
    const { router } = setupEditRouter();

    const response = await router.dispatch(
      new Request('http://localhost/api/timestamps/coverage?channelCode=main', { method: 'GET' }), {},
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { coverage: { 7: 3 } });
  });

  it('GET /timestamps/approved で承認済みを返す', async () => {
    const { router } = setupEditRouter();

    const response = await router.dispatch(
      new Request('http://localhost/api/timestamps/approved?channelCode=main&streamIndex=7', { method: 'GET' }), {},
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { items: [{ songIndex: 0, timeSeconds: 10 }] });
  });
});
