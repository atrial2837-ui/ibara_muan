import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { replaceSetlist } from '../../src/usecase/replace-setlist.js';
import { ValidationError } from '../../src/domain/error/validation-error.js';
import { NotFoundError } from '../../src/domain/error/not-found-error.js';
import {
  InMemoryArtistRepository,
  InMemoryChannelRepository,
  InMemorySongChannelStatsRepository,
  InMemorySongRepository,
  InMemoryStreamRepository,
  InMemoryStreamSongRepository,
  FakeClock,
} from '../../src/infra/in-memory/index.js';

describe('replaceSetlist', () => {
  let deps;
  beforeEach(async () => {
    const channels = new InMemoryChannelRepository([
      { id: 1, code: 'main', name: '茨むあん', sort_order: 1, created_at: '2026-01-01T00:00:00.000Z' },
    ]);
    const streams = new InMemoryStreamRepository();
    await streams.insert({
      channelId: 1, sourceIndex: 7, streamedOn: '2026-08-02', title: '枠',
      url: 'https://example.com/s', urlKey: 'https://example.com/s', songCount: 1,
      createdAt: '2026-08-02T00:00:00.000Z',
    });
    deps = {
      channels,
      streams,
      streamSongs: new InMemoryStreamSongRepository(),
      songs: new InMemorySongRepository(),
      artists: new InMemoryArtistRepository(),
      stats: new InMemorySongChannelStatsRepository(),
      clock: new FakeClock(),
    };
  });

  it('旧セトリを置き換えて曲数とメタ情報を更新する', async () => {
    const result = await replaceSetlist(deps, {
      streamId: 1,
      songsText: 'レオ / 優里\nダーリン / Mrs. GREEN APPLE',
    });
    assert.deepEqual(result, { streamId: 1, count: 2 });
    const rows = await deps.streamSongs.findByStreamId(1);
    assert.equal(rows.length, 2);
    const stream = await deps.streams.findById(1);
    assert.equal(stream.song_count, 2);
    assert.equal(stream.title, '枠');
  });

  it('存在しない枠は NotFoundError', async () => {
    await assert.rejects(() => replaceSetlist(deps, { streamId: 999, songsText: '曲 / 人' }), NotFoundError);
  });

  it('空の曲リストは ValidationError', async () => {
    await assert.rejects(() => replaceSetlist(deps, { streamId: 1, songsText: '  \n ' }), ValidationError);
  });
});
