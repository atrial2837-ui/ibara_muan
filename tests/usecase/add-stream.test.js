/**
 * @file tests/usecase/add-stream.test.js
 * @description addStream UseCase のテスト。
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { addStream } from '../../src/usecase/add-stream.js';
import { ValidationError } from '../../src/domain/error/validation-error.js';
import {
  InMemoryArtistRepository,
  InMemorySongRepository,
  InMemoryStreamRepository,
  InMemoryStreamSongRepository,
  InMemorySongChannelStatsRepository,
  InMemoryChannelRepository,
  FakeClock,
} from '../../src/infra/in-memory/index.js';

/**
 * テスト用セットアップ。
 */
function setup() {
  const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
  const artists = new InMemoryArtistRepository();
  const songs = new InMemorySongRepository(artists);
  const channels = new InMemoryChannelRepository([
    { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2026-01-01T00:00:00.000Z' },
  ]);
  const streams = new InMemoryStreamRepository();
  const streamSongs = new InMemoryStreamSongRepository();
  const stats = new InMemorySongChannelStatsRepository();

  const deps = { channels, streams, streamSongs, songs, artists, stats, clock };
  return { deps };
}

/** 標準的な addStream 入力 */
const baseInput = {
  channelCode: 'new',
  streamedOn: '2026-01-15',
  title: '歌枠タイトル',
  url: 'https://example.com/stream/1',
  songsText: 'アイドル / YOASOBI\nLemon / 米津玄師',
};

describe('addStream', () => {
  test('新規 stream を挿入する', async () => {
    const { deps } = setup();
    const result = await addStream(deps, baseInput);

    assert.ok(result.streamId > 0);
    assert.equal(result.count, 2);
  });

  test('stream_songs が正しい件数で登録される', async () => {
    const { deps } = setup();
    const { streamId } = await addStream(deps, baseInput);

    const rows = await deps.streamSongs.findByStreamId(streamId);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].position, 1);
    assert.equal(rows[1].position, 2);
  });

  test('sing_count が各曲で +1 される', async () => {
    const { deps } = setup();
    await addStream(deps, baseInput);

    const allStats = await deps.stats.findAll();
    // 2 曲それぞれに sing_count=1 の統計が存在する
    assert.equal(allStats.length, 2);
    assert.ok(allStats.every((s) => s.sing_count === 1));
  });

  test('同じ stream を再度登録すると上書き (sing_count をロールバック)', async () => {
    const { deps } = setup();
    await addStream(deps, baseInput);

    // 同じ url で再度登録 (曲を 1 件に変更)
    await addStream(deps, { ...baseInput, songsText: '新曲 / 新アーティスト' });

    const allStats = await deps.stats.findAll();
    // アイドル / YOASOBI と Lemon / 米津玄師 は sing_count=0 に戻る
    const originalSongs = allStats.filter((s) => s.sing_count === 0);
    assert.equal(originalSongs.length, 2);

    // 新曲の sing_count=1
    const newSongs = allStats.filter((s) => s.sing_count === 1);
    assert.equal(newSongs.length, 1);
  });

  test('既存 stream の上書きで stream_songs が入れ替わる', async () => {
    const { deps } = setup();
    const { streamId } = await addStream(deps, baseInput);

    // 同じ URL で異なる曲リストを登録
    await addStream(deps, { ...baseInput, songsText: '上書き曲 / 上書きアーティスト' });

    const rows = await deps.streamSongs.findByStreamId(streamId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title_snapshot, '上書き曲');
  });

  test('配信日が不正なら ValidationError', async () => {
    const { deps } = setup();
    await assert.rejects(
      () => addStream(deps, { ...baseInput, streamedOn: '2026/01/15' }),
      (err) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.status, 400);
        return true;
      },
    );
  });

  test('曲リストが空なら ValidationError', async () => {
    const { deps } = setup();
    await assert.rejects(
      () => addStream(deps, { ...baseInput, songsText: '' }),
      ValidationError,
    );
  });

  test('空行のみなら ValidationError', async () => {
    const { deps } = setup();
    await assert.rejects(
      () => addStream(deps, { ...baseInput, songsText: '\n\n\n' }),
      ValidationError,
    );
  });

  test('未知チャンネルなら ValidationError', async () => {
    const { deps } = setup();
    await assert.rejects(
      () => addStream(deps, { ...baseInput, channelCode: 'unknown_channel' }),
      (err) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.status, 400);
        return true;
      },
    );
  });

  test('url が空の場合は channelCode:streamedOn:title で urlKey を生成', async () => {
    const { deps } = setup();
    const result = await addStream(deps, { ...baseInput, url: '' });
    assert.ok(result.streamId > 0);

    // streams に保存された url_key を確認
    const allStreams = await deps.streams.findAll();
    const stream = allStreams.find((s) => s.id === result.streamId);
    assert.equal(stream?.url_key, 'new:2026-01-15:歌枠タイトル');
  });

  test('曲が重複していても重複 song は作られない', async () => {
    const { deps } = setup();
    // 同じ曲名を 2 回含むセトリ
    await addStream(deps, { ...baseInput, songsText: 'アイドル / YOASOBI\nアイドル / YOASOBI' });

    const allSongs = await deps.songs.findAll();
    const duplicates = allSongs.filter((s) => s.title === 'アイドル');
    assert.equal(duplicates.length, 1);
  });

  test('sourceIndex を指定すると streams に反映される', async () => {
    const { deps } = setup();
    const result = await addStream(deps, { ...baseInput, sourceIndex: 42 });

    const allStreams = await deps.streams.findAll();
    const stream = allStreams.find((s) => s.id === result.streamId);
    assert.equal(stream?.source_index, 42);
  });
});
