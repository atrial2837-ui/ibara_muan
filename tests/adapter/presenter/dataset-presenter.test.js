/**
 * @module tests/adapter/presenter/dataset-presenter.test
 * @description formatApiDataResponse の単体テスト。
 *
 * buildDataset の戻り値を /api/data レスポンス互換の JSON に整形することを検証する。
 * 既存実装 functions/api/data.js:244 と同等の出力になることを確認。
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatApiDataResponse } from '../../../src/adapter/presenter/dataset-presenter.js';

// ─── フィクスチャビルダー ──────────────────────────────────────────────────────

/** @returns {import('../../../src/domain/analytics/channel-stats.js').ChannelStats} */
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

/** @returns {import('../../../src/domain/analytics/channel-stats.js').EnrichedSong} */
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
    dates: ['2026-05-19', '2026-05-10'],
    streamRefs: [{ streamId: 1, date: '2026-05-19', index: 10, position: 1 }],
    lastSung: '2026-05-19',
    firstSung: '2026-05-10',
    daysSinceLast: 5,
    rank: 1,
    ...overrides,
  };
}

/** @returns {import('../../../src/domain/analytics/channel-stats.js').EnrichedStream} */
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
      { key: 'test_key', raw: 'テスト曲' },
    ],
    monthKey: '2026-05',
    year: 2026,
    month: 5,
    dayOfWeek: 2,
    ...overrides,
  };
}

/** @returns {import('../../../src/domain/analytics/channel-stats.js').ChannelDataset} */
function makeChannelDataset(overrides = {}) {
  return {
    stats: makeStats(),
    songs: [makeSong()],
    streams: [makeStream()],
    orphans: [],
    artists: [{ artist: 'テストアーティスト', songs: [makeSong()], totalCount: 5, songCount: 1 }],
    ...overrides,
  };
}

/** @returns {{ channels: Record<string, import('../../../src/domain/analytics/channel-stats.js').ChannelDataset>, combined: import('../../../src/domain/analytics/channel-stats.js').MergedDataset }} */
function makeDataset(overrides = {}) {
  return {
    channels: {
      new: makeChannelDataset(),
    },
    combined: makeChannelDataset({
      stats: makeStats({
        title: '全期間',
        channelId: 'all',
        channelLabel: '全期間',
        total: 100,
        streams: 10,
      }),
    }),
    ...overrides,
  };
}

// ─── formatApiDataResponse ──────────────────────────────────────────────────────

describe('formatApiDataResponse', () => {
  it('channels と combined のトップレベルキーが存在する', () => {
    const response = formatApiDataResponse(makeDataset());
    assert.ok('channels' in response);
    assert.ok('combined' in response);
  });

  it('channels に channel code キーが含まれる', () => {
    const response = formatApiDataResponse(makeDataset());
    assert.ok('new' in response.channels);
  });

  it('stats の全フィールドが正しく出力される', () => {
    const response = formatApiDataResponse(makeDataset());
    const stats = response.channels.new.stats;

    assert.equal(stats.title, '新ch');
    assert.equal(stats.updateText, '更新日：2026/05/19');
    assert.equal(stats.updateDate, '2026-05-19');
    assert.equal(stats.total, 100);
    assert.equal(stats.repertoire, 50);
    assert.equal(stats.streams, 10);
    assert.equal(stats.avgPerStream, 10.0);
    assert.equal(stats.channelId, 'new');
    assert.equal(stats.channelLabel, '新ch');
    assert.equal(stats.keyPublished, true);
  });

  it('songs の全フィールドが正しく出力される', () => {
    const response = formatApiDataResponse(makeDataset());
    const song = response.channels.new.songs[0];

    assert.equal(song.sourceIndex, 1);
    assert.equal(song.title, 'テスト曲');
    assert.equal(song.artist, 'テストアーティスト');
    assert.equal(song.count, 5);
    assert.equal(song.key, 'test_key');
    assert.equal(song.displayKey, '+2');
    assert.equal(song.keyText, '+2');
    assert.equal(song.genre, 'J-POP');
    assert.equal(song.genreText, 'J-POP');
    assert.deepEqual(song.channels, ['new']);
    assert.deepEqual(song.dates, ['2026-05-19', '2026-05-10']);
    assert.equal(song.lastSung, '2026-05-19');
    assert.equal(song.firstSung, '2026-05-10');
    assert.equal(song.daysSinceLast, 5);
    assert.equal(song.rank, 1);
  });

  it('keyText が空のとき空文字列を返す (displayKey が空のケース)', () => {
    // 既存実装 data.js:139: keyText = displayKey (空ならそのまま '')
    const dataset = makeDataset({
      channels: {
        new: makeChannelDataset({
          songs: [makeSong({ displayKey: '', keyText: '' })],
        }),
      },
    });
    const response = formatApiDataResponse(dataset);
    assert.equal(response.channels.new.songs[0].keyText, '');
  });

  it('genreText が空のとき空文字列を返す (genre が空のケース)', () => {
    // 既存実装 data.js:140: genreText = genre (空ならそのまま '')
    const dataset = makeDataset({
      channels: {
        new: makeChannelDataset({
          songs: [makeSong({ genre: '', genreText: '' })],
        }),
      },
    });
    const response = formatApiDataResponse(dataset);
    assert.equal(response.channels.new.songs[0].genreText, '');
  });

  it('streams の全フィールドが正しく出力される', () => {
    const response = formatApiDataResponse(makeDataset());
    const stream = response.channels.new.streams[0];

    assert.equal(stream.index, 10);
    assert.equal(stream.channel, 'new');
    assert.equal(stream.dateRaw, '2026/05/19');
    assert.equal(stream.date, '2026-05-19');
    assert.equal(stream.title, '歌枠 #10');
    assert.equal(stream.url, 'https://youtube.com/watch?v=abc');
    assert.equal(stream.songCount, 15);
    assert.equal(stream.monthKey, '2026-05');
    assert.equal(stream.year, 2026);
    assert.equal(stream.month, 5);
    assert.equal(stream.dayOfWeek, 2);
  });

  it('orphans は常に空配列', () => {
    // 既存実装 data.js:169: orphans: []
    const response = formatApiDataResponse(makeDataset());
    assert.deepEqual(response.channels.new.orphans, []);
    assert.deepEqual(response.combined.orphans, []);
  });

  it('combined.stats の channelId が "all"、channelLabel が "全期間"', () => {
    const response = formatApiDataResponse(makeDataset());
    assert.equal(response.combined.stats.channelId, 'all');
    assert.equal(response.combined.stats.channelLabel, '全期間');
  });

  it('複数チャンネルがあれば channels に全チャンネルが含まれる', () => {
    const dataset = makeDataset({
      channels: {
        new: makeChannelDataset(),
        old: makeChannelDataset({
          stats: makeStats({ title: '旧ch', channelId: 'old', channelLabel: '旧ch' }),
          songs: [makeSong({ channels: ['old'] })],
          streams: [makeStream({ channel: 'old' })],
        }),
      },
    });
    const response = formatApiDataResponse(dataset);
    assert.ok('new' in response.channels);
    assert.ok('old' in response.channels);
    assert.equal(response.channels.old.stats.channelId, 'old');
  });

  it('チャンネルが 0 件のとき channels は空オブジェクト', () => {
    const dataset = {
      channels: {},
      combined: makeChannelDataset({
        stats: makeStats({ title: '全期間', channelId: 'all', channelLabel: '全期間', total: 0, streams: 0 }),
        songs: [],
        streams: [],
        artists: [],
      }),
    };
    const response = formatApiDataResponse(dataset);
    assert.deepEqual(response.channels, {});
  });

  it('songs が空のチャンネルも正しく出力される', () => {
    const dataset = makeDataset({
      channels: {
        new: makeChannelDataset({ songs: [], streams: [], artists: [] }),
      },
    });
    const response = formatApiDataResponse(dataset);
    assert.deepEqual(response.channels.new.songs, []);
    assert.deepEqual(response.channels.new.streams, []);
  });

  it('updateDate が null のとき updateText は空文字列', () => {
    // 既存実装 data.js:156: updateText = newestStream ? `更新日：${...}` : ''
    const dataset = makeDataset({
      channels: {
        new: makeChannelDataset({
          stats: makeStats({ updateDate: null, updateText: '' }),
        }),
      },
    });
    const response = formatApiDataResponse(dataset);
    assert.equal(response.channels.new.stats.updateDate, null);
    assert.equal(response.channels.new.stats.updateText, '');
  });

  it('lastSung / firstSung / daysSinceLast が null のとき null を返す', () => {
    const dataset = makeDataset({
      channels: {
        new: makeChannelDataset({
          songs: [makeSong({ dates: [], lastSung: null, firstSung: null, daysSinceLast: null })],
        }),
      },
    });
    const response = formatApiDataResponse(dataset);
    const song = response.channels.new.songs[0];
    assert.equal(song.lastSung, null);
    assert.equal(song.firstSung, null);
    assert.equal(song.daysSinceLast, null);
    assert.deepEqual(song.dates, []);
  });

  it('artists フィールドが含まれる', () => {
    const response = formatApiDataResponse(makeDataset());
    assert.ok(Array.isArray(response.channels.new.artists));
    assert.equal(response.channels.new.artists.length, 1);
    assert.equal(response.channels.new.artists[0].artist, 'テストアーティスト');
  });

  it('meta.json の実データ構造に対応するフィールドが stats に含まれる', () => {
    // docs/data/meta.json の構造との対応確認
    // { title, updateText, updateDate, total, repertoire, streams,
    //   avgPerStream, channelId, channelLabel, keyPublished }
    const response = formatApiDataResponse(makeDataset());
    const stats = response.channels.new.stats;
    const expectedKeys = [
      'title', 'updateText', 'updateDate', 'total', 'repertoire',
      'streams', 'avgPerStream', 'channelId', 'channelLabel', 'keyPublished',
    ];
    for (const key of expectedKeys) {
      assert.ok(key in stats, `stats に ${key} フィールドがない`);
    }
  });
});
