/**
 * @module tests/usecase/build-dataset.test
 * @description buildDataset UseCase のテスト。
 *
 * InMemory リポジトリ + FakeClock を使って全体 flow を検証する。
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildDataset } from '../../src/usecase/build-dataset.js';
import { FakeClock } from '../../src/infra/in-memory/fake-clock.js';
import { InMemoryChannelRepository } from '../../src/infra/in-memory/in-memory-channel-repository.js';
import { InMemoryArtistRepository } from '../../src/infra/in-memory/in-memory-artist-repository.js';
import { InMemorySongRepository } from '../../src/infra/in-memory/in-memory-song-repository.js';
import { InMemoryStreamRepository } from '../../src/infra/in-memory/in-memory-stream-repository.js';
import { InMemoryStreamSongRepository } from '../../src/infra/in-memory/in-memory-stream-song-repository.js';
import { InMemorySongChannelStatsRepository } from '../../src/infra/in-memory/in-memory-song-channel-stats-repository.js';

/**
 * deps を生成する。各リポジトリを返すので追加 seed が可能。
 * @param {Date} [now]
 */
function makeDeps(now = new Date('2026-01-15T00:00:00Z')) {
  const clock = new FakeClock(now);
  const channels = new InMemoryChannelRepository();
  const artists = new InMemoryArtistRepository();
  const songs = new InMemorySongRepository(artists);
  const streams = new InMemoryStreamRepository();
  const streamSongs = new InMemoryStreamSongRepository();
  const stats = new InMemorySongChannelStatsRepository();
  return { clock, channels, artists, songs, streams, streamSongs, stats };
}

// ─── 基本 ──────────────────────────────────────────────────────────────────────

describe('buildDataset', () => {
  it('チャンネルが 0 件のとき channels は空オブジェクト、combined は空', async () => {
    const deps = makeDeps();
    const result = await buildDataset(deps);

    assert.deepEqual(result.channels, {});
    assert.equal(result.combined.songs.length, 0);
    assert.equal(result.combined.streams.length, 0);
    assert.equal(result.combined.stats.channelId, 'all');
  });

  it('単一チャンネル・単一曲のフル flow を検証する', async () => {
    const deps = makeDeps();

    // チャンネル
    deps.channels._insert({ code: 'new', name: '新ch', sort_order: 1, created_at: '2025-01-01T00:00:00Z' });
    const [channel] = await deps.channels.findAll();

    // アーティスト
    await deps.artists.insert({ name: 'テストアーティスト', normalizedName: 'テストあーてぃすと', createdAt: '2025-01-01T00:00:00Z' });
    const [artist] = await deps.artists.findAll();

    // 曲
    await deps.songs.insert({
      title: 'テスト曲',
      normalizedTitle: 'テストきょく',
      artistId: artist.id,
      songKey: 'test_key',
      displayKey: '',
      genre: 'J-POP',
      createdAt: '2025-01-01T00:00:00Z',
    });

    // 歌枠
    await deps.streams.insert({
      channelId: channel.id,
      sourceIndex: 1,
      streamedOn: '2026-01-10',
      title: '歌枠 #1',
      url: 'https://example.com/1',
      urlKey: 'k1',
      songCount: 1,
      createdAt: '2026-01-10T00:00:00Z',
    });
    const [stream] = await deps.streams.findAll();
    const [song] = await deps.songs.findAll();

    // セトリ
    await deps.streamSongs.insertBatch([{
      streamId: stream.id,
      songId: song.id,
      position: 1,
      rawText: null,
      titleSnapshot: 'テスト曲',
      artistSnapshot: 'テストアーティスト',
      songKeySnapshot: 'test_key',
      createdAt: '2026-01-10T00:00:00Z',
    }]);

    // 統計
    await deps.stats.upsertIncrement(song.id, channel.id, '2026-01-10T00:00:00Z');

    const result = await buildDataset(deps);

    assert.ok('new' in result.channels);
    const ch = result.channels.new;
    assert.equal(ch.songs.length, 1);
    assert.equal(ch.songs[0].title, 'テスト曲');
    assert.equal(ch.songs[0].count, 1);
    assert.equal(ch.songs[0].genre, 'J-POP');
    assert.equal(ch.streams.length, 1);
    assert.equal(ch.stats.total, 1);
  });

  it('複数チャンネルがある場合、channels に各 code がキーとして入る', async () => {
    const deps = makeDeps();
    deps.channels._insert({ code: 'new', name: '新ch', sort_order: 1, created_at: '2025-01-01T00:00:00Z' });
    deps.channels._insert({ code: 'old', name: '旧ch', sort_order: 2, created_at: '2025-01-01T00:00:00Z' });

    const result = await buildDataset(deps);

    assert.ok('new' in result.channels);
    assert.ok('old' in result.channels);
  });

  it('clock.now() から today を計算する (FakeClock で検証)', async () => {
    const deps = makeDeps(new Date('2026-06-01T00:00:00Z'));

    // 曲 + 歌枠を作成して daysSinceLast を確認
    deps.channels._insert({ code: 'new', name: '新ch', sort_order: 1, created_at: '2025-01-01T00:00:00Z' });
    const [channel] = await deps.channels.findAll();
    await deps.artists.insert({ name: 'A', normalizedName: 'a', createdAt: '' });
    const [artist] = await deps.artists.findAll();
    await deps.songs.insert({ title: 'X', normalizedTitle: 'x', artistId: artist.id, songKey: 'x_key', displayKey: '', genre: '', createdAt: '' });
    const [song] = await deps.songs.findAll();
    await deps.streams.insert({ channelId: channel.id, sourceIndex: 1, streamedOn: '2026-05-01', title: null, url: null, urlKey: 'k1', songCount: 1, createdAt: '' });
    const [stream] = await deps.streams.findAll();
    await deps.streamSongs.insertBatch([{ streamId: stream.id, songId: song.id, position: 1, rawText: null, titleSnapshot: 'X', artistSnapshot: 'A', songKeySnapshot: 'x_key', createdAt: '' }]);
    await deps.stats.upsertIncrement(song.id, channel.id, '');

    const result = await buildDataset(deps);
    const s = result.channels.new.songs[0];

    // 2026-06-01 - 2026-05-01 = 31 日
    assert.equal(s.daysSinceLast, 31);
  });

  it('combined は全チャンネルを合算する', async () => {
    const deps = makeDeps();
    deps.channels._insert({ code: 'new', name: '新ch', sort_order: 1, created_at: '' });
    deps.channels._insert({ code: 'old', name: '旧ch', sort_order: 2, created_at: '' });
    const channels = await deps.channels.findAll();

    await deps.artists.insert({ name: 'A', normalizedName: 'a', createdAt: '' });
    const [artist] = await deps.artists.findAll();

    // 同一 song_key を 2 チャンネルに登録
    await deps.songs.insert({ title: 'SharedSong', normalizedTitle: 'sharedsong', artistId: artist.id, songKey: 'shared', displayKey: '', genre: 'J-POP', createdAt: '' });
    const [song] = await deps.songs.findAll();

    for (const ch of channels) {
      await deps.stats.upsertIncrement(song.id, ch.id, '');
      await deps.stats.upsertIncrement(song.id, ch.id, '');
    }

    const result = await buildDataset(deps);

    // combined: 2 (new) + 2 (old) = 4
    assert.equal(result.combined.stats.total, 4);
    assert.equal(result.combined.songs.length, 1);
    assert.equal(result.combined.songs[0].count, 4);
  });

  it('genre が空のとき combined でも空文字を保持する (inferGenre を呼ばない)', async () => {
    const deps = makeDeps();
    deps.channels._insert({ code: 'new', name: '新ch', sort_order: 1, created_at: '' });
    const [channel] = await deps.channels.findAll();
    await deps.artists.insert({ name: 'A', normalizedName: 'a', createdAt: '' });
    const [artist] = await deps.artists.findAll();
    await deps.songs.insert({ title: 'TestSong', normalizedTitle: 'testsong', artistId: artist.id, songKey: 'test_key', displayKey: '', genre: '', createdAt: '' });
    const [song] = await deps.songs.findAll();
    await deps.stats.upsertIncrement(song.id, channel.id, '');

    const result = await buildDataset(deps);

    assert.equal(result.channels.new.songs[0].genre, '');
    assert.equal(result.combined.songs[0].genre, '');
  });

  it('lastSung / firstSung / daysSinceLast が正しく計算される', async () => {
    const deps = makeDeps(new Date('2026-01-20T00:00:00Z'));
    deps.channels._insert({ code: 'new', name: '新ch', sort_order: 1, created_at: '' });
    const [channel] = await deps.channels.findAll();
    await deps.artists.insert({ name: 'A', normalizedName: 'a', createdAt: '' });
    const [artist] = await deps.artists.findAll();
    await deps.songs.insert({ title: 'Song', normalizedTitle: 'song', artistId: artist.id, songKey: 'key', displayKey: '', genre: '', createdAt: '' });
    const [song] = await deps.songs.findAll();

    // 2 回歌った
    await deps.streams.insert({ channelId: channel.id, sourceIndex: 1, streamedOn: '2026-01-10', title: null, url: null, urlKey: 'k1', songCount: 1, createdAt: '' });
    await deps.streams.insert({ channelId: channel.id, sourceIndex: 2, streamedOn: '2026-01-05', title: null, url: null, urlKey: 'k2', songCount: 1, createdAt: '' });
    const allStreams = await deps.streams.findAll();
    for (const s of allStreams) {
      await deps.streamSongs.insertBatch([{
        streamId: s.id,
        songId: song.id,
        position: 1,
        rawText: null,
        titleSnapshot: 'Song',
        artistSnapshot: 'A',
        songKeySnapshot: 'key',
        createdAt: '',
      }]);
      await deps.stats.upsertIncrement(song.id, channel.id, '');
    }

    const result = await buildDataset(deps);
    const resultSong = result.channels.new.songs[0];

    assert.equal(resultSong.lastSung, '2026-01-10');
    assert.equal(resultSong.firstSung, '2026-01-05');
    assert.equal(resultSong.daysSinceLast, 10);  // 2026-01-20 - 2026-01-10 = 10
  });

  it('streamSongs がないとき dates は空で lastSung は null', async () => {
    const deps = makeDeps();
    deps.channels._insert({ code: 'new', name: '新ch', sort_order: 1, created_at: '' });
    const [channel] = await deps.channels.findAll();
    await deps.artists.insert({ name: 'A', normalizedName: 'a', createdAt: '' });
    const [artist] = await deps.artists.findAll();
    await deps.songs.insert({ title: 'Song', normalizedTitle: 'song', artistId: artist.id, songKey: 'key', displayKey: '', genre: 'J-POP', createdAt: '' });
    const [song] = await deps.songs.findAll();
    await deps.streams.insert({ channelId: channel.id, sourceIndex: 1, streamedOn: '2026-01-10', title: null, url: null, urlKey: 'k1', songCount: 0, createdAt: '' });
    // streamSongs は挿入しない
    await deps.stats.upsertIncrement(song.id, channel.id, '');

    const result = await buildDataset(deps);
    const resultSong = result.channels.new.songs[0];

    assert.deepEqual(resultSong.dates, []);
    assert.equal(resultSong.lastSung, null);
    assert.equal(resultSong.firstSung, null);
    assert.equal(resultSong.daysSinceLast, null);
  });

  it('6 リポジトリすべてを並列取得する (Promise.all で副作用なし)', async () => {
    // 呼び出し回数を追跡して Promise.all の動作を簡易確認
    const deps = makeDeps();
    let callCount = 0;
    const origChannelFindAll = deps.channels.findAll.bind(deps.channels);
    deps.channels.findAll = async () => { callCount++; return origChannelFindAll(); };

    await buildDataset(deps);
    assert.equal(callCount, 1);  // findAll は 1 回だけ呼ばれる
  });

  it('combined.stats.avgPerStream を正しく計算する', async () => {
    const deps = makeDeps();
    deps.channels._insert({ code: 'new', name: '新ch', sort_order: 1, created_at: '' });
    deps.channels._insert({ code: 'old', name: '旧ch', sort_order: 2, created_at: '' });
    const [ch1, ch2] = await deps.channels.findAll();

    // ch1: 2 歌枠 / ch2: 1 歌枠、合計 total=10
    await deps.artists.insert({ name: 'A', normalizedName: 'a', createdAt: '' });
    const [artist] = await deps.artists.findAll();
    await deps.songs.insert({ title: 'S', normalizedTitle: 's', artistId: artist.id, songKey: 'skey', displayKey: '', genre: '', createdAt: '' });
    const [song] = await deps.songs.findAll();

    await deps.streams.insert({ channelId: ch1.id, sourceIndex: 1, streamedOn: '2026-01-10', title: null, url: null, urlKey: 'k1', songCount: 0, createdAt: '' });
    await deps.streams.insert({ channelId: ch1.id, sourceIndex: 2, streamedOn: '2026-01-09', title: null, url: null, urlKey: 'k2', songCount: 0, createdAt: '' });
    await deps.streams.insert({ channelId: ch2.id, sourceIndex: 1, streamedOn: '2026-01-08', title: null, url: null, urlKey: 'k3', songCount: 0, createdAt: '' });

    // total: ch1=7, ch2=3 → combined.total=10
    for (let i = 0; i < 7; i++) await deps.stats.upsertIncrement(song.id, ch1.id, '');
    for (let i = 0; i < 3; i++) await deps.stats.upsertIncrement(song.id, ch2.id, '');

    const result = await buildDataset(deps);

    // combined: total=10, streams=3 → 10/3=3.3
    assert.equal(result.combined.stats.total, 10);
    assert.equal(result.combined.stats.streams, 3);
    assert.equal(result.combined.stats.avgPerStream, 3.3);
  });
});
