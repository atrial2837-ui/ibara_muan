/**
 * @module tests/adapter/presenter/static-data-presenter.test
 * @description formatStaticDataFiles の単体テスト。
 *
 * generateStaticData UseCase の出力を docs/data/{meta,songs,streams}.json と
 * 同じ構造に整形することを検証する。
 *
 * 既存実装 admin-server/server.js:758-798 / tools/generate_static_data.mjs:252-280 と同等。
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatStaticDataFiles } from '../../../src/adapter/presenter/static-data-presenter.js';

// ─── フィクスチャビルダー ──────────────────────────────────────────────────────

/** @returns {object} ChannelStats */
function makeStats(overrides = {}) {
  return {
    title: '新ch',
    updateText: '更新日：2026/05/19',
    updateDate: '2026-05-19',
    total: 100,
    repertoire: 50,
    streams: 10,
    avgPerStream: 10.0,
    channelId: 'new',
    channelLabel: '新ch',
    keyPublished: true,
    ...overrides,
  };
}

/** @returns {object} EnrichedSong */
function makeSong(overrides = {}) {
  return {
    sourceIndex: 1,
    title: 'テスト曲',
    artist: 'テストアーティスト',
    count: 5,
    key: 'test_key',
    displayKey: '+2',
    keyText: '+2',
    genre: 'J-POP',
    genreText: 'J-POP',
    channels: ['new'],
    dates: ['2026-05-19'],
    streamRefs: [{ streamId: 1, date: '2026-05-19', index: 10, position: 1 }],
    lastSung: '2026-05-19',
    firstSung: '2026-05-19',
    daysSinceLast: 5,
    rank: 1,
    ...overrides,
  };
}

/** @returns {object} EnrichedStream */
function makeStream(overrides = {}) {
  return {
    index: 10,
    channel: 'new',
    dateRaw: '2026/05/19',
    date: '2026-05-19',
    title: '歌枠 #10',
    url: 'https://youtube.com/watch?v=abc',
    songCount: 15,
    songs: [
      { key: 'test_key', raw: 'テスト曲', title: '表示タイトル', artist: 'アーティスト名' },
    ],
    monthKey: '2026-05',
    year: 2026,
    month: 5,
    dayOfWeek: 2,
    ...overrides,
  };
}

/** generateStaticData 相当の入力を作成 */
function makeStaticData() {
  return {
    meta: {
      generatedAt: '2026-05-24T00:00:00.000Z',
      channels: {
        new: makeStats(),
      },
      combined: makeStats({ title: '全期間', channelId: 'all', channelLabel: '全期間' }),
    },
    songs: {
      generatedAt: '2026-05-24T00:00:00.000Z',
      channels: {
        new: [makeSong()],
      },
    },
    streams: {
      generatedAt: '2026-05-24T00:00:00.000Z',
      channels: {
        new: [makeStream()],
      },
    },
  };
}

// ─── formatStaticDataFiles ────────────────────────────────────────────────────

describe('formatStaticDataFiles', () => {
  it('meta / songs / streams の 3 キーが存在する', () => {
    const result = formatStaticDataFiles(makeStaticData());
    assert.ok('meta' in result);
    assert.ok('songs' in result);
    assert.ok('streams' in result);
  });

  it('meta.generatedAt が入力から引き継がれる', () => {
    const result = formatStaticDataFiles(makeStaticData());
    assert.equal(result.meta.generatedAt, '2026-05-24T00:00:00.000Z');
  });

  it('meta.channels に channel code キーが含まれる', () => {
    const result = formatStaticDataFiles(makeStaticData());
    assert.ok('new' in result.meta.channels);
  });

  it('meta.channels[code] に stats フィールドが含まれる', () => {
    const result = formatStaticDataFiles(makeStaticData());
    const stats = result.meta.channels.new;
    assert.equal(stats.title, '新ch');
    assert.equal(stats.channelId, 'new');
    assert.equal(stats.total, 100);
  });

  it('meta.combined に合算 stats が含まれる', () => {
    const result = formatStaticDataFiles(makeStaticData());
    assert.equal(result.meta.combined.channelId, 'all');
    assert.equal(result.meta.combined.channelLabel, '全期間');
  });

  it('songs.generatedAt が入力から引き継がれる', () => {
    const result = formatStaticDataFiles(makeStaticData());
    assert.equal(result.songs.generatedAt, '2026-05-24T00:00:00.000Z');
  });

  it('songs.channels[code] に SongRecord[] が含まれる', () => {
    const result = formatStaticDataFiles(makeStaticData());
    const songs = result.songs.channels.new;
    assert.ok(Array.isArray(songs));
    assert.equal(songs.length, 1);
    assert.equal(songs[0].title, 'テスト曲');
    assert.equal(songs[0].artist, 'テストアーティスト');
    assert.equal(songs[0].displayKey, '+2');
  });

  it('streams.generatedAt が入力から引き継がれる', () => {
    const result = formatStaticDataFiles(makeStaticData());
    assert.equal(result.streams.generatedAt, '2026-05-24T00:00:00.000Z');
  });

  it('streams.channels[code] に StreamRecord[] が含まれる', () => {
    const result = formatStaticDataFiles(makeStaticData());
    const streams = result.streams.channels.new;
    assert.ok(Array.isArray(streams));
    assert.equal(streams.length, 1);
    assert.equal(streams[0].date, '2026-05-19');
  });

  it('静的版: streams[].songs は { key } のみを含む (raw/title/artist を除く)', () => {
    // 根拠: admin-server/server.js:619-625 / tools/generate_static_data.mjs:113-118
    // 動的 API 版 (data.js:100-109) では title/artist を含む
    const result = formatStaticDataFiles(makeStaticData());
    const songRef = result.streams.channels.new[0].songs[0];

    assert.ok('key' in songRef);
    assert.ok(!('raw' in songRef), 'raw は静的版に含まれない');
    assert.ok(!('title' in songRef), 'title は静的版に含まれない');
    assert.ok(!('artist' in songRef), 'artist は静的版に含まれない');
    assert.equal(songRef.key, 'test_key');
  });

  it('静的版: songs[] は履歴派生フィールドを含まない', () => {
    const result = formatStaticDataFiles(makeStaticData());
    const song = result.songs.channels.new[0];

    assert.ok(!('dates' in song), 'dates は streams から復元するため含まれない');
    assert.ok(!('streamRefs' in song), 'streamRefs は streams から復元するため含まれない');
    assert.ok(!('lastSung' in song), 'lastSung は streams から復元するため含まれない');
    assert.ok(!('firstSung' in song), 'firstSung は streams から復元するため含まれない');
    assert.ok(!('daysSinceLast' in song), 'daysSinceLast は streams から復元するため含まれない');
  });

  it('静的版: songs[] はクライアントで復元できる表示用フィールドを含まない', () => {
    const result = formatStaticDataFiles(makeStaticData());
    const song = result.songs.channels.new[0];

    assert.ok(!('sourceIndex' in song), 'sourceIndex は公開表示で使わないため含まれない');
    assert.ok(!('keyText' in song), 'keyText は displayKey から復元するため含まれない');
    assert.ok(!('genreText' in song), 'genreText は genre から復元するため含まれない');
    assert.ok(!('channels' in song), 'channels はチャンネル別ファイル構造から復元するため含まれない');
    assert.ok(!('rank' in song), 'rank は count から復元するため含まれない');
  });

  it('streams の他のフィールドは動的 API 版と同一', () => {
    const result = formatStaticDataFiles(makeStaticData());
    const stream = result.streams.channels.new[0];
    assert.equal(stream.index, 10);
    assert.equal(stream.channel, 'new');
    assert.equal(stream.dateRaw, '2026/05/19');
    assert.equal(stream.monthKey, '2026-05');
    assert.equal(stream.year, 2026);
    assert.equal(stream.month, 5);
    assert.equal(stream.dayOfWeek, 2);
  });

  it('songs[].displayKey が空のとき空文字列を返す', () => {
    const staticData = makeStaticData();
    staticData.songs.channels.new = [makeSong({ displayKey: '', keyText: '' })];
    const result = formatStaticDataFiles(staticData);
    assert.equal(result.songs.channels.new[0].displayKey, '');
  });

  it('複数チャンネルがあれば全チャンネルが含まれる', () => {
    const staticData = makeStaticData();
    staticData.meta.channels.old = makeStats({ title: '旧ch', channelId: 'old', channelLabel: '旧ch' });
    staticData.songs.channels.old = [makeSong({ channels: ['old'] })];
    staticData.streams.channels.old = [makeStream({ channel: 'old' })];

    const result = formatStaticDataFiles(staticData);
    assert.ok('new' in result.meta.channels);
    assert.ok('old' in result.meta.channels);
    assert.ok('new' in result.songs.channels);
    assert.ok('old' in result.songs.channels);
    assert.ok('new' in result.streams.channels);
    assert.ok('old' in result.streams.channels);
  });

  it('songs と streams が空チャンネルも正しく出力される', () => {
    const staticData = makeStaticData();
    staticData.songs.channels.new = [];
    staticData.streams.channels.new = [];

    const result = formatStaticDataFiles(staticData);
    assert.deepEqual(result.songs.channels.new, []);
    assert.deepEqual(result.streams.channels.new, []);
  });

  it('docs/data/meta.json の構造に対応する stats フィールドが含まれる', () => {
    // meta.json: { generatedAt, channels: { [code]: stats }, combined: stats }
    // stats: { title, updateText, updateDate, total, repertoire, streams,
    //          avgPerStream, channelId, channelLabel, keyPublished }
    const result = formatStaticDataFiles(makeStaticData());
    const expectedKeys = [
      'title', 'updateText', 'updateDate', 'total', 'repertoire',
      'streams', 'avgPerStream', 'channelId', 'channelLabel', 'keyPublished',
    ];
    for (const key of expectedKeys) {
      assert.ok(key in result.meta.channels.new, `meta.channels.new に ${key} フィールドがない`);
      assert.ok(key in result.meta.combined, `meta.combined に ${key} フィールドがない`);
    }
  });
});
