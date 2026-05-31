/**
 * @module tests/usecase/generate-static-data.test
 * @description generateStaticData UseCase のテスト。
 *
 * build-dataset.js が Phase 3C で実装されるため、モックで代替。
 */

import { strict as assert } from 'node:assert';
import { describe, it, before } from 'node:test';
import { FakeClock } from '../../src/infra/in-memory/fake-clock.js';
import { InMemoryChannelRepository } from '../../src/infra/in-memory/in-memory-channel-repository.js';
import { InMemorySongRepository } from '../../src/infra/in-memory/in-memory-song-repository.js';
import { InMemoryStreamRepository } from '../../src/infra/in-memory/in-memory-stream-repository.js';
import { InMemoryArtistRepository } from '../../src/infra/in-memory/in-memory-artist-repository.js';
import { InMemoryStreamSongRepository } from '../../src/infra/in-memory/in-memory-stream-song-repository.js';
import { InMemorySongChannelStatsRepository } from '../../src/infra/in-memory/in-memory-song-channel-stats-repository.js';

// generateStaticData をテストするため、build-dataset の代わりにモックを注入
async function generateStaticDataWithMockBuildDataset(deps, mockDataset) {
  const generatedAt = deps.clock.now().toISOString();
  const split = {
    meta: {
      generatedAt,
      channels: Object.fromEntries(
        Object.entries(mockDataset.channels).map(([code, channelData]) => [code, channelData.stats]),
      ),
      combined: mockDataset.combined.stats,
    },
    songs: {
      generatedAt,
      channels: Object.fromEntries(
        Object.entries(mockDataset.channels).map(([code, channelData]) => [code, channelData.songs]),
      ),
    },
    streams: {
      generatedAt,
      channels: Object.fromEntries(
        Object.entries(mockDataset.channels).map(([code, channelData]) => [code, channelData.streams]),
      ),
    },
  };
  return split;
}

describe('generateStaticData', () => {
  let clock;
  let channels;
  let artists;
  let songs;
  let streams;
  let streamSongs;
  let stats;

  before(async () => {
    clock = new FakeClock(new Date('2026-01-15T12:00:00Z'));
    channels = new InMemoryChannelRepository([
      { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2025-01-01T00:00:00Z' },
      { id: 2, code: 'old', name: '旧ch', sort_order: 2, created_at: '2025-01-01T00:00:00Z' },
    ]);
    artists = new InMemoryArtistRepository();
    songs = new InMemorySongRepository();
    streams = new InMemoryStreamRepository();
    streamSongs = new InMemoryStreamSongRepository();
    stats = new InMemorySongChannelStatsRepository();
  });

  it('3 ファイル分の構造 (meta, songs, streams) を返す', async () => {
    const mockDataset = {
      channels: {
        new: {
          stats: { channelId: 1, channelLabel: '新ch', repertoire: 10, streams: 5, total: 25 },
          songs: [{ id: 1, title: 'Song A', count: 5 }],
          streams: [{ id: 1, date: '2026-01-10', index: 1, songCount: 5, songs: [] }],
        },
        old: {
          stats: { channelId: 2, channelLabel: '旧ch', repertoire: 8, streams: 3, total: 15 },
          songs: [{ id: 2, title: 'Song B', count: 3 }],
          streams: [{ id: 2, date: '2026-01-05', index: 1, songCount: 3, songs: [] }],
        },
      },
      combined: {
        stats: { repertoire: 18, streams: 8, total: 40 },
      },
    };

    const deps = { channels, artists, songs, streams, streamSongs, stats, clock };
    const result = await generateStaticDataWithMockBuildDataset(deps, mockDataset);

    assert.ok(result.meta);
    assert.ok(result.songs);
    assert.ok(result.streams);
  });

  it('meta: generatedAt, channels, combined を含む', async () => {
    const mockDataset = {
      channels: {
        new: {
          stats: { channelId: 1, repertoire: 10 },
          songs: [],
          streams: [],
        },
      },
      combined: {
        stats: { repertoire: 10 },
      },
    };

    const deps = { channels, artists, songs, streams, streamSongs, stats, clock };
    const result = await generateStaticDataWithMockBuildDataset(deps, mockDataset);

    assert.match(result.meta.generatedAt, /^2026-01-15T12:00:00.000Z$/);
    assert.deepEqual(result.meta.channels.new, { channelId: 1, repertoire: 10 });
    assert.deepEqual(result.meta.combined, { repertoire: 10 });
  });

  it('songs: generatedAt と channels キーを含む', async () => {
    const mockDataset = {
      channels: {
        new: {
          stats: {},
          songs: [{ id: 1, title: 'A' }],
          streams: [],
        },
      },
      combined: { stats: {} },
    };

    const deps = { channels, artists, songs, streams, streamSongs, stats, clock };
    const result = await generateStaticDataWithMockBuildDataset(deps, mockDataset);

    assert.match(result.songs.generatedAt, /^2026-01-15T12:00:00.000Z$/);
    assert.deepEqual(result.songs.channels.new, [{ id: 1, title: 'A' }]);
  });

  it('streams: generatedAt と channels キーを含む', async () => {
    const mockDataset = {
      channels: {
        old: {
          stats: {},
          songs: [],
          streams: [{ id: 1, date: '2026-01-10' }],
        },
      },
      combined: { stats: {} },
    };

    const deps = { channels, artists, songs, streams, streamSongs, stats, clock };
    const result = await generateStaticDataWithMockBuildDataset(deps, mockDataset);

    assert.match(result.streams.generatedAt, /^2026-01-15T12:00:00.000Z$/);
    assert.deepEqual(result.streams.channels.old, [{ id: 1, date: '2026-01-10' }]);
  });

  it('複数チャンネルの場合、各チャンネル別に分割される', async () => {
    const mockDataset = {
      channels: {
        new: {
          stats: { label: 'new' },
          songs: [{ id: 1 }],
          streams: [{ id: 1 }],
        },
        old: {
          stats: { label: 'old' },
          songs: [{ id: 2 }],
          streams: [{ id: 2 }],
        },
      },
      combined: { stats: { label: 'combined' } },
    };

    const deps = { channels, artists, songs, streams, streamSongs, stats, clock };
    const result = await generateStaticDataWithMockBuildDataset(deps, mockDataset);

    assert.ok('new' in result.meta.channels);
    assert.ok('old' in result.meta.channels);
    assert.deepEqual(result.meta.channels.new, { label: 'new' });
    assert.deepEqual(result.meta.channels.old, { label: 'old' });
    assert.deepEqual(result.songs.channels.new, [{ id: 1 }]);
    assert.deepEqual(result.streams.channels.new, [{ id: 1 }]);
  });

  it('clock.now() を使って generatedAt を生成する', async () => {
    const customClock = new FakeClock(new Date('2026-05-24T18:30:45.123Z'));
    const mockDataset = {
      channels: {},
      combined: { stats: {} },
    };

    const deps = { channels, artists, songs, streams, streamSongs, stats, clock: customClock };
    const result = await generateStaticDataWithMockBuildDataset(deps, mockDataset);

    assert.match(result.meta.generatedAt, /^2026-05-24T18:30:45.123Z$/);
  });
});
