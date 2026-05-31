/**
 * @module tests/usecase/load-admin-status.test
 * @description loadAdminStatus UseCase のテスト。
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { loadAdminStatus } from '../../src/usecase/load-admin-status.js';
import { FakeClock } from '../../src/infra/in-memory/fake-clock.js';
import { InMemoryChannelRepository } from '../../src/infra/in-memory/in-memory-channel-repository.js';
import { InMemorySongRepository } from '../../src/infra/in-memory/in-memory-song-repository.js';
import { InMemoryStreamRepository } from '../../src/infra/in-memory/in-memory-stream-repository.js';
import { InMemoryArtistRepository } from '../../src/infra/in-memory/in-memory-artist-repository.js';

describe('loadAdminStatus', () => {
  it('チャンネル毎のステータスを返す', async () => {
    const clock = new FakeClock(new Date('2026-01-15T12:00:00Z'));
    const channels = new InMemoryChannelRepository();
    channels._store.set(1, { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2025-01-01T00:00:00Z' });
    channels._store.set(2, { id: 2, code: 'old', name: '旧ch', sort_order: 2, created_at: '2025-01-01T00:00:00Z' });
    channels._nextId = 3;
    const artists = new InMemoryArtistRepository();
    const songs = new InMemorySongRepository(artists);
    songs._store.set(1, {
      id: 1,
      title: 'Song A',
      normalized_title: 'song a',
      artist_id: null,
      song_key: 'song-a',
      display_key: '',
      genre: '',
      created_at: '2025-01-01T00:00:00Z',
    });
    const streams = new InMemoryStreamRepository();
    streams._store.set(1, {
      id: 1,
      channel_id: 1,
      source_index: 1,
      streamed_on: '2026-01-10',
      title: 'Stream 1',
      url: 'https://example.com/1',
      url_key: 'stream-1',
      song_count: 5,
      created_at: '2026-01-10T00:00:00Z',
    });
    streams._store.set(2, {
      id: 2,
      channel_id: 1,
      source_index: 2,
      streamed_on: '2026-01-08',
      title: 'Stream 2',
      url: 'https://example.com/2',
      url_key: 'stream-2',
      song_count: 3,
      created_at: '2026-01-08T00:00:00Z',
    });
    streams._nextId = 3;

    const result = await loadAdminStatus({ channels, songs, streams, clock });

    assert.ok(Array.isArray(result.channels));
    assert.equal(result.channels.length, 2);
    assert.equal(result.channels[0].code, 'new');
    assert.equal(result.channels[0].name, '新ch');
    assert.equal(result.channels[0].songCount, 1);
    assert.equal(result.channels[0].streamCount, 2);
    assert.equal(result.channels[0].lastStreamedOn, '2026-01-10');

    assert.equal(result.channels[1].code, 'old');
    assert.equal(result.channels[1].streamCount, 0);
    assert.equal(result.channels[1].lastStreamedOn, null);
  });

  it('stale channel が issues に出る (30日以上歌枠がない)', async () => {
    const clock = new FakeClock(new Date('2026-02-15T12:00:00Z')); // 2026-01-10 から 36 日経過
    const channels = new InMemoryChannelRepository([
      { id: 1, code: 'stale', name: 'stale ch', sort_order: 1, created_at: '2025-01-01T00:00:00Z' },
    ]);
    const artists = new InMemoryArtistRepository();
    const songs = new InMemorySongRepository(artists);
    songs._store.set(1, {
      id: 1,
      title: 'Song A',
      normalized_title: 'song a',
      artist_id: null,
      song_key: 'song-a',
      display_key: '',
      genre: '',
      created_at: '2025-01-01T00:00:00Z',
    });
    const streams = new InMemoryStreamRepository();
    streams._store.set(1, {
      id: 1,
      channel_id: 1,
      source_index: 1,
      streamed_on: '2026-01-10',
      title: 'Stream 1',
      url: null,
      url_key: 'stream-1',
      song_count: 5,
      created_at: '2026-01-10T00:00:00Z',
    });
    streams._nextId = 2;

    const result = await loadAdminStatus({ channels, songs, streams, clock });

    const staleIssue = result.issues.find((i) => i.code === 'stale' && i.message.includes('日間'));
    assert.ok(staleIssue);
    assert.match(staleIssue.message, /36日間/);
  });

  it('空のチャンネル (曲が0件) が issues に出る', async () => {
    const clock = new FakeClock();
    const channels = new InMemoryChannelRepository();
    channels._store.set(1, { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2025-01-01T00:00:00Z' });
    channels._nextId = 2;
    const artists = new InMemoryArtistRepository();
    const songs = new InMemorySongRepository(artists);
    const streams = new InMemoryStreamRepository();

    const result = await loadAdminStatus({ channels, songs, streams, clock });

    const emptyIssue = result.issues.find((i) => i.code === 'new' && i.message.includes('曲'));
    assert.ok(emptyIssue);
    assert.match(emptyIssue.message, /曲が登録されていません/);
  });

  it('歌枠が 0 件のチャンネルが issues に出る', async () => {
    const clock = new FakeClock();
    const channels = new InMemoryChannelRepository();
    channels._store.set(1, { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2025-01-01T00:00:00Z' });
    channels._nextId = 2;
    const artists = new InMemoryArtistRepository();
    const songs = new InMemorySongRepository(artists);
    songs._store.set(1, {
      id: 1,
      title: 'Song A',
      normalized_title: 'song a',
      artist_id: null,
      song_key: 'song-a',
      display_key: '',
      genre: '',
      created_at: '2025-01-01T00:00:00Z',
    });
    const streams = new InMemoryStreamRepository();

    const result = await loadAdminStatus({ channels, songs, streams, clock });

    const noStreamIssue = result.issues.find((i) => i.code === 'new' && i.message.includes('歌枠'));
    assert.ok(noStreamIssue);
    assert.match(noStreamIssue.message, /歌枠が記録されていません/);
  });

  it('正常なチャンネルは issues に出ない', async () => {
    const clock = new FakeClock(new Date('2026-01-15T12:00:00Z'));
    const channels = new InMemoryChannelRepository([
      { id: 1, code: 'healthy', name: 'Healthy', sort_order: 1, created_at: '2025-01-01T00:00:00Z' },
    ]);
    const artists = new InMemoryArtistRepository();
    const songs = new InMemorySongRepository(artists);
    songs._store.set(1, {
      id: 1,
      title: 'Song A',
      normalized_title: 'song a',
      artist_id: null,
      song_key: 'song-a',
      display_key: '',
      genre: '',
      created_at: '2025-01-01T00:00:00Z',
    });
    const streams = new InMemoryStreamRepository();
    streams._store.set(1, {
      id: 1,
      channel_id: 1,
      source_index: 1,
      streamed_on: '2026-01-10',
      title: 'Stream 1',
      url: null,
      url_key: 'stream-1',
      song_count: 5,
      created_at: '2026-01-10T00:00:00Z',
    });
    streams._nextId = 2;

    const result = await loadAdminStatus({ channels, songs, streams, clock });

    // 曲が 1 件あるので "曲が登録されていません" は出ない
    // 歌枠があり 30日以内なので stale も出ない
    const healthyIssues = result.issues.filter((i) => i.code === 'healthy');
    assert.equal(healthyIssues.length, 0);
  });

  it('複数チャンネルについて正しく集計される', async () => {
    const clock = new FakeClock(new Date('2026-02-15T12:00:00Z'));
    const channels = new InMemoryChannelRepository([
      { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2025-01-01T00:00:00Z' },
      { id: 2, code: 'old', name: '旧ch', sort_order: 2, created_at: '2025-01-01T00:00:00Z' },
    ]);
    const artists = new InMemoryArtistRepository();
    const songs = new InMemorySongRepository(artists);
    songs._store.set(1, {
      id: 1,
      title: 'Song A',
      normalized_title: 'song a',
      artist_id: null,
      song_key: 'song-a',
      display_key: '',
      genre: '',
      created_at: '2025-01-01T00:00:00Z',
    });
    const streams = new InMemoryStreamRepository();
    streams._store.set(1, {
      id: 1,
      channel_id: 1,
      source_index: 1,
      streamed_on: '2026-02-01',
      title: 'Stream 1',
      url: null,
      url_key: 'stream-1',
      song_count: 5,
      created_at: '2026-02-01T00:00:00Z',
    });
    streams._store.set(2, {
      id: 2,
      channel_id: 2,
      source_index: 1,
      streamed_on: '2026-01-10',
      title: 'Stream 2',
      url: null,
      url_key: 'stream-2',
      song_count: 3,
      created_at: '2026-01-10T00:00:00Z',
    });
    streams._nextId = 3;

    const result = await loadAdminStatus({ channels, songs, streams, clock });

    assert.equal(result.channels.length, 2);
    assert.equal(result.channels[0].code, 'new');
    assert.equal(result.channels[0].streamCount, 1);
    assert.equal(result.channels[1].code, 'old');
    assert.equal(result.channels[1].streamCount, 1);

    // new は 2026-02-01 から 14 日なので stale ではない
    // old は 2026-01-10 から 36 日なので stale
    const oldStaleIssue = result.issues.find((i) => i.code === 'old' && i.message.includes('日間'));
    assert.ok(oldStaleIssue);
  });

  it('checkedAt は clock.now() から生成される', async () => {
    const customClock = new FakeClock(new Date('2026-05-24T18:30:45.123Z'));
    const channels = new InMemoryChannelRepository();
    const artists = new InMemoryArtistRepository();
    const songs = new InMemorySongRepository(artists);
    const streams = new InMemoryStreamRepository();

    const result = await loadAdminStatus({ channels, songs, streams, clock: customClock });

    assert.match(result.checkedAt, /^2026-05-24T18:30:45.123Z$/);
  });

  it('複数の歌枠がある場合、最新日を取得する', async () => {
    const clock = new FakeClock();
    const channels = new InMemoryChannelRepository();
    channels._store.set(1, { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2025-01-01T00:00:00Z' });
    channels._nextId = 2;
    const artists = new InMemoryArtistRepository();
    const songs = new InMemorySongRepository(artists);
    const streams = new InMemoryStreamRepository();
    // InMemoryStreamRepository に直接 _store で追加
    streams._store.set(1, {
      id: 1,
      channel_id: 1,
      source_index: 1,
      streamed_on: '2026-01-05',
      title: 'Old',
      url: null,
      url_key: 'stream-old',
      song_count: 2,
      created_at: '2026-01-05T00:00:00Z',
    });
    streams._store.set(2, {
      id: 2,
      channel_id: 1,
      source_index: 2,
      streamed_on: '2026-01-15',
      title: 'New',
      url: null,
      url_key: 'stream-new',
      song_count: 3,
      created_at: '2026-01-15T00:00:00Z',
    });
    streams._store.set(3, {
      id: 3,
      channel_id: 1,
      source_index: 3,
      streamed_on: '2026-01-10',
      title: 'Middle',
      url: null,
      url_key: 'stream-middle',
      song_count: 1,
      created_at: '2026-01-10T00:00:00Z',
    });
    streams._nextId = 4; // _nextId も更新

    const result = await loadAdminStatus({ channels, songs, streams, clock });

    assert.equal(result.channels[0].lastStreamedOn, '2026-01-15');
  });
});
