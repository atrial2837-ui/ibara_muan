/**
 * @module tests/domain/analytics/channel-stats.test
 * @description channel-stats.js の純粋関数テスト。
 *
 * テスト対象:
 *   - buildChannelDataset
 *   - mergeChannelDatasets
 *   - computeAvgPerStream
 *   - pickDisplayKey
 *   - pickGenre
 *
 * 既存実装との差分を明示:
 *   1. inferGenre を呼ばない → song.genre が空なら '' を返す
 *   2. dates / streamRefs / firstSung / lastSung / daysSinceLast を実計算
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChannelDataset,
  mergeChannelDatasets,
  computeAvgPerStream,
  pickDisplayKey,
  pickGenre,
} from '../../../src/domain/analytics/channel-stats.js';

// ─── テスト用フィクスチャビルダー ─────────────────────────────────────────────

/** @returns {import('../../../src/domain/analytics/channel-stats.js').RawTables} */
function emptyRaw() {
  return {
    channels: [],
    artists: [],
    songs: [],
    streams: [],
    streamSongs: [],
    songChannelStats: [],
  };
}

/** @param {object} overrides */
function makeChannel(overrides = {}) {
  return { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2025-01-01T00:00:00Z', ...overrides };
}

/** @param {object} overrides */
function makeSong(overrides = {}) {
  return {
    id: 1,
    title: 'テスト曲',
    normalized_title: 'テスト曲',
    artist_id: 1,
    artist: 'テストアーティスト',
    song_key: 'test_key',
    display_key: '',
    genre: 'J-POP',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/** @param {object} overrides */
function makeArtist(overrides = {}) {
  return { id: 1, name: 'テストアーティスト', normalized_name: 'テストアーティスト', created_at: '2025-01-01T00:00:00Z', ...overrides };
}

/** @param {object} overrides */
function makeStream(overrides = {}) {
  return {
    id: 1,
    channel_id: 1,
    source_index: 1,
    streamed_on: '2026-01-10',
    title: '歌枠 #1',
    url: 'https://example.com/1',
    url_key: 'key1',
    song_count: 2,
    created_at: '2026-01-10T00:00:00Z',
    ...overrides,
  };
}

/** @param {object} overrides */
function makeStreamSong(overrides = {}) {
  return {
    id: 1,
    stream_id: 1,
    song_id: 1,
    position: 1,
    raw_text: null,
    title_snapshot: 'テスト曲',
    artist_snapshot: 'テストアーティスト',
    song_key_snapshot: 'test_key',
    created_at: '2026-01-10T00:00:00Z',
    ...overrides,
  };
}

/** @param {object} overrides */
function makeStat(overrides = {}) {
  return {
    song_id: 1,
    channel_id: 1,
    sing_count: 3,
    source_index: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
    ...overrides,
  };
}

// ─── computeAvgPerStream ───────────────────────────────────────────────────────

describe('computeAvgPerStream', () => {
  it('streamCount が 0 のとき 0 を返す', () => {
    assert.equal(computeAvgPerStream(10, 0), 0);
  });

  it('整数で割り切れる場合はそのまま返す', () => {
    assert.equal(computeAvgPerStream(10, 2), 5);
  });

  it('小数第一位で四捨五入する', () => {
    // 10 / 3 = 3.333... → 3.3
    assert.equal(computeAvgPerStream(10, 3), 3.3);
  });

  it('端数処理: 0.05 単位は四捨五入される', () => {
    // 7 / 2 = 3.5
    assert.equal(computeAvgPerStream(7, 2), 3.5);
  });

  it('小数第一位より下は切り捨てられる (Math.round)', () => {
    // 11 / 3 = 3.666... → Math.round(36.66)/10 = Math.round(36.7)/10 = 37/10 = 3.7
    assert.equal(computeAvgPerStream(11, 3), 3.7);
  });

  it('total が 0 のとき 0 を返す', () => {
    assert.equal(computeAvgPerStream(0, 5), 0);
  });
});

// ─── pickDisplayKey ────────────────────────────────────────────────────────────

describe('pickDisplayKey', () => {
  it('left が非空ならそちらを返す (first wins)', () => {
    assert.equal(pickDisplayKey('Abc', 'XYZ'), 'Abc');
  });

  it('left が空なら right を返す', () => {
    assert.equal(pickDisplayKey('', 'XYZ'), 'XYZ');
  });

  it('left が null なら right を返す', () => {
    assert.equal(pickDisplayKey(null, 'XYZ'), 'XYZ');
  });

  it('両方空なら空文字列を返す', () => {
    assert.equal(pickDisplayKey('', ''), '');
  });

  it('両方 null なら空文字列を返す', () => {
    assert.equal(pickDisplayKey(null, null), '');
  });
});

// ─── pickGenre ─────────────────────────────────────────────────────────────────

describe('pickGenre', () => {
  it('left が有効ジャンルなら left を返す', () => {
    assert.equal(pickGenre('J-POP', '未分類'), 'J-POP');
  });

  it('left が "未分類" なら right を優先', () => {
    assert.equal(pickGenre('未分類', 'アニソン'), 'アニソン');
  });

  it('left が空文字なら right を返す', () => {
    assert.equal(pickGenre('', 'ボカロ'), 'ボカロ');
  });

  it('left が null なら right を返す', () => {
    assert.equal(pickGenre(null, 'K-POP'), 'K-POP');
  });

  it('right も "未分類" なら "未分類" を返す', () => {
    assert.equal(pickGenre('未分類', '未分類'), '未分類');
  });

  it('両方空なら空文字列を返す', () => {
    assert.equal(pickGenre('', ''), '');
  });

  it('left が有効ジャンル、right も有効ジャンルなら left を優先', () => {
    assert.equal(pickGenre('オリジナル', 'ディズニー'), 'オリジナル');
  });

  it('left が空、right が "未分類" なら "未分類" を返す', () => {
    assert.equal(pickGenre('', '未分類'), '未分類');
  });
});

// ─── buildChannelDataset ───────────────────────────────────────────────────────

describe('buildChannelDataset', () => {
  it('空データで空のデータセットを返す', () => {
    const channel = makeChannel();
    const raw = emptyRaw();
    const result = buildChannelDataset(channel, raw, '2026-01-15');

    assert.equal(result.songs.length, 0);
    assert.equal(result.streams.length, 0);
    assert.equal(result.stats.total, 0);
    assert.equal(result.stats.repertoire, 0);
    assert.equal(result.stats.streams, 0);
    assert.equal(result.stats.avgPerStream, 0);
    assert.deepEqual(result.orphans, []);
    assert.deepEqual(result.artists, []);
  });

  it('単一曲・単一歌枠のデータセットを正しく構築する', () => {
    const channel = makeChannel();
    const raw = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [makeSong()],
      streams: [makeStream()],
      streamSongs: [makeStreamSong()],
      songChannelStats: [makeStat()],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');

    assert.equal(result.songs.length, 1);
    assert.equal(result.streams.length, 1);
    const song = result.songs[0];
    assert.equal(song.title, 'テスト曲');
    assert.equal(song.artist, 'テストアーティスト');
    assert.equal(song.count, 3);
    assert.equal(song.key, 'test_key');
    assert.equal(song.rank, 1);
  });

  it('genre が空のとき inferGenre を呼ばず空文字を返す (データ駆動方針)', () => {
    const channel = makeChannel();
    // genre が空のタイトルに inferGenre が当たると 'J-POP' が返る既存ロジックに対し、
    // 新実装は '' を返すことを確認
    const raw = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [makeSong({ genre: '' })],
      streams: [],
      streamSongs: [],
      songChannelStats: [makeStat()],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');
    const song = result.songs[0];
    assert.equal(song.genre, '');
    assert.equal(song.genreText, '');
  });

  it('dates / streamRefs / lastSung / firstSung / daysSinceLast を実計算する', () => {
    const channel = makeChannel();
    const raw = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [makeSong()],
      streams: [
        makeStream({ id: 1, streamed_on: '2026-01-10' }),
        makeStream({ id: 2, streamed_on: '2026-01-05', url_key: 'key2', source_index: 2 }),
      ],
      streamSongs: [
        makeStreamSong({ id: 1, stream_id: 1, song_id: 1, position: 1 }),
        makeStreamSong({ id: 2, stream_id: 2, song_id: 1, position: 1 }),
      ],
      songChannelStats: [makeStat({ sing_count: 2 })],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');
    const song = result.songs[0];

    // dates: 降順ソート
    assert.deepEqual(song.dates, ['2026-01-10', '2026-01-05']);
    // lastSung: 最新日付
    assert.equal(song.lastSung, '2026-01-10');
    // firstSung: 最古日付
    assert.equal(song.firstSung, '2026-01-05');
    // daysSinceLast: 2026-01-15 から 2026-01-10 は 5 日
    assert.equal(song.daysSinceLast, 5);
    // streamRefs: 2 件
    assert.equal(song.streamRefs.length, 2);
  });

  it('streamSongs がないとき dates は空, lastSung/firstSung/daysSinceLast は null', () => {
    const channel = makeChannel();
    const raw = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [makeSong()],
      streams: [makeStream()],
      streamSongs: [],  // 空
      songChannelStats: [makeStat()],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');
    const song = result.songs[0];

    assert.deepEqual(song.dates, []);
    assert.equal(song.lastSung, null);
    assert.equal(song.firstSung, null);
    assert.equal(song.daysSinceLast, null);
  });

  it('today を変えると daysSinceLast が変わる', () => {
    const channel = makeChannel();
    const raw = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [makeSong()],
      streams: [makeStream({ streamed_on: '2026-01-10' })],
      streamSongs: [makeStreamSong()],
      songChannelStats: [makeStat()],
    };

    const resultA = buildChannelDataset(channel, raw, '2026-01-15');
    const resultB = buildChannelDataset(channel, raw, '2026-01-20');

    assert.equal(resultA.songs[0].daysSinceLast, 5);   // 15 - 10 = 5
    assert.equal(resultB.songs[0].daysSinceLast, 10);  // 20 - 10 = 10
  });

  it('streams が空のチャンネルでも曲一覧は返る', () => {
    const channel = makeChannel();
    const raw = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [makeSong()],
      streams: [],  // 歌枠なし
      streamSongs: [],
      songChannelStats: [makeStat()],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');

    assert.equal(result.songs.length, 1);
    assert.equal(result.streams.length, 0);
    assert.equal(result.stats.streams, 0);
    assert.equal(result.stats.avgPerStream, 0);
  });

  it('stats.avgPerStream を正しく計算する', () => {
    const channel = makeChannel();
    const raw = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [makeSong()],
      streams: [
        makeStream({ id: 1, url_key: 'k1' }),
        makeStream({ id: 2, url_key: 'k2', streamed_on: '2026-01-09', source_index: 2 }),
        makeStream({ id: 3, url_key: 'k3', streamed_on: '2026-01-08', source_index: 3 }),
      ],
      streamSongs: [],
      songChannelStats: [makeStat({ sing_count: 10 })],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');
    // total=10, streams=3 → 10/3=3.333... → 3.3
    assert.equal(result.stats.avgPerStream, 3.3);
  });

  it('rank: dense rank を複数曲に適用する', () => {
    const channel = makeChannel();
    const raw = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [
        makeSong({ id: 1, song_key: 'key1' }),
        makeSong({ id: 2, song_key: 'key2', title: '曲B' }),
        makeSong({ id: 3, song_key: 'key3', title: '曲C' }),
      ],
      streams: [],
      streamSongs: [],
      songChannelStats: [
        makeStat({ song_id: 1, sing_count: 5 }),
        makeStat({ song_id: 2, sing_count: 5 }),
        makeStat({ song_id: 3, sing_count: 3 }),
      ],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');
    const sorted = result.songs.sort((a, b) => b.count - a.count);

    // count 5 が 2 曲 → どちらも rank 1
    assert.equal(sorted[0].rank, 1);
    assert.equal(sorted[1].rank, 1);
    // count 3 → rank 3 (standard ranking: skip 2)
    assert.equal(sorted[2].rank, 3);
  });

  it('別チャンネルのデータはフィルタされる', () => {
    const channel = makeChannel({ id: 1, code: 'new' });
    const raw = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [makeSong()],
      streams: [
        makeStream({ id: 1, channel_id: 1 }),
        makeStream({ id: 2, channel_id: 2, url_key: 'other' }),  // 別チャンネル
      ],
      streamSongs: [
        makeStreamSong({ id: 1, stream_id: 1 }),
        makeStreamSong({ id: 2, stream_id: 2 }),  // 別チャンネルの歌枠
      ],
      songChannelStats: [
        makeStat({ song_id: 1, channel_id: 1 }),
        makeStat({ song_id: 1, channel_id: 2, sing_count: 99 }),  // 別チャンネル
      ],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');

    // channel_id=1 の歌枠のみ
    assert.equal(result.streams.length, 1);
    assert.equal(result.streams[0].channel, 'new');
    // channel_id=1 の統計のみ
    assert.equal(result.songs.length, 1);
    assert.equal(result.songs[0].count, 3);  // channel_id=2 の 99 は加算されない
  });

  it('channels フィールドは自チャンネルコードを含む', () => {
    const channel = makeChannel({ code: 'old' });
    const raw = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [makeSong()],
      streams: [],
      streamSongs: [],
      songChannelStats: [makeStat()],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');
    assert.deepEqual(result.songs[0].channels, ['old']);
  });

  it('artists は deriveArtists で集計される', () => {
    const channel = makeChannel();
    const raw = {
      ...emptyRaw(),
      artists: [
        makeArtist({ id: 1, name: 'アーティストA' }),
        makeArtist({ id: 2, name: 'アーティストB' }),
      ],
      songs: [
        makeSong({ id: 1, song_key: 'key1', artist_id: 1, title: '曲1' }),
        makeSong({ id: 2, song_key: 'key2', artist_id: 2, title: '曲2' }),
        makeSong({ id: 3, song_key: 'key3', artist_id: 1, title: '曲3' }),
      ],
      streams: [],
      streamSongs: [],
      songChannelStats: [
        makeStat({ song_id: 1, channel_id: 1, sing_count: 10 }),
        makeStat({ song_id: 2, channel_id: 1, sing_count: 3 }),
        makeStat({ song_id: 3, channel_id: 1, sing_count: 7 }),
      ],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');

    assert.equal(result.artists.length, 2);
    // アーティストA: 10+7=17, アーティストB: 3 → A が先
    assert.equal(result.artists[0].artist, 'アーティストA');
    assert.equal(result.artists[0].totalCount, 17);
    assert.equal(result.artists[1].artist, 'アーティストB');
    assert.equal(result.artists[1].totalCount, 3);
  });

  it('keyPublished は display_key が 1 件でも存在すれば true', () => {
    const channel = makeChannel();
    const raw = {
      ...emptyRaw(),
      songs: [
        makeSong({ id: 1, song_key: 'k1', display_key: 'A' }),
        makeSong({ id: 2, song_key: 'k2', display_key: '' }),
      ],
      songChannelStats: [makeStat({ song_id: 1 })],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');
    assert.equal(result.stats.keyPublished, true);
  });

  it('display_key が全て空なら keyPublished は false', () => {
    const channel = makeChannel();
    const raw = {
      ...emptyRaw(),
      songs: [makeSong({ display_key: '' })],
      songChannelStats: [makeStat()],
    };

    const result = buildChannelDataset(channel, raw, '2026-01-15');
    assert.equal(result.stats.keyPublished, false);
  });
});

// ─── mergeChannelDatasets ──────────────────────────────────────────────────────

describe('mergeChannelDatasets', () => {
  it('空配列でも空のデータセットを返す', () => {
    const result = mergeChannelDatasets([], '2026-01-15');

    assert.equal(result.songs.length, 0);
    assert.equal(result.streams.length, 0);
    assert.equal(result.stats.total, 0);
    assert.equal(result.stats.channelId, 'all');
    assert.equal(result.stats.channelLabel, '全期間');
  });

  it('単一チャンネルのデータセットをそのままマージする', () => {
    const channel = makeChannel();
    const raw = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [makeSong()],
      streams: [makeStream()],
      streamSongs: [makeStreamSong()],
      songChannelStats: [makeStat({ sing_count: 5 })],
    };
    const dataset = buildChannelDataset(channel, raw, '2026-01-15');
    const result = mergeChannelDatasets([dataset], '2026-01-15');

    assert.equal(result.songs.length, 1);
    assert.equal(result.songs[0].count, 5);
    assert.equal(result.stats.total, 5);
  });

  it('同一 song_key が複数チャンネルにあれば count を加算する', () => {
    const ch1 = makeChannel({ id: 1, code: 'new' });
    const ch2 = makeChannel({ id: 2, code: 'old' });
    const song = makeSong({ id: 1, song_key: 'shared_key' });
    const artist = makeArtist();

    const raw1 = {
      ...emptyRaw(),
      artists: [artist],
      songs: [song],
      streams: [],
      streamSongs: [],
      songChannelStats: [{ song_id: 1, channel_id: 1, sing_count: 4, source_index: 1, created_at: '', updated_at: '' }],
    };
    const raw2 = {
      ...emptyRaw(),
      artists: [artist],
      songs: [song],
      streams: [],
      streamSongs: [],
      songChannelStats: [{ song_id: 1, channel_id: 2, sing_count: 6, source_index: 1, created_at: '', updated_at: '' }],
    };

    const d1 = buildChannelDataset(ch1, raw1, '2026-01-15');
    const d2 = buildChannelDataset(ch2, raw2, '2026-01-15');
    const result = mergeChannelDatasets([d1, d2], '2026-01-15');

    assert.equal(result.songs.length, 1);
    assert.equal(result.songs[0].count, 10);  // 4 + 6
    assert.equal(result.stats.total, 10);
  });

  it('同一 song_key マージ時 channels[] を union する', () => {
    const ch1 = makeChannel({ id: 1, code: 'new' });
    const ch2 = makeChannel({ id: 2, code: 'old' });
    const song = makeSong({ id: 1, song_key: 'shared_key' });

    const raw1 = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [song],
      streams: [],
      streamSongs: [],
      songChannelStats: [{ song_id: 1, channel_id: 1, sing_count: 1, source_index: null, created_at: '', updated_at: '' }],
    };
    const raw2 = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [song],
      streams: [],
      streamSongs: [],
      songChannelStats: [{ song_id: 1, channel_id: 2, sing_count: 1, source_index: null, created_at: '', updated_at: '' }],
    };

    const d1 = buildChannelDataset(ch1, raw1, '2026-01-15');
    const d2 = buildChannelDataset(ch2, raw2, '2026-01-15');
    const result = mergeChannelDatasets([d1, d2], '2026-01-15');

    const merged = result.songs[0];
    assert.ok(merged.channels.includes('new'));
    assert.ok(merged.channels.includes('old'));
    assert.equal(merged.channels.length, 2);
  });

  it('displayKey: left wins (先勝ち)', () => {
    const ch1 = makeChannel({ id: 1, code: 'new' });
    const ch2 = makeChannel({ id: 2, code: 'old' });
    const song = makeSong({ id: 1, song_key: 'shared_key' });

    const songWithKey1 = { ...song, display_key: 'ABC' };
    const songWithKey2 = { ...song, display_key: 'XYZ' };

    const raw1 = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [songWithKey1],
      streams: [],
      streamSongs: [],
      songChannelStats: [{ song_id: 1, channel_id: 1, sing_count: 1, source_index: null, created_at: '', updated_at: '' }],
    };
    const raw2 = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [songWithKey2],
      streams: [],
      streamSongs: [],
      songChannelStats: [{ song_id: 1, channel_id: 2, sing_count: 1, source_index: null, created_at: '', updated_at: '' }],
    };

    const d1 = buildChannelDataset(ch1, raw1, '2026-01-15');
    const d2 = buildChannelDataset(ch2, raw2, '2026-01-15');
    // d1 が先 → displayKey は 'ABC'
    const result = mergeChannelDatasets([d1, d2], '2026-01-15');
    assert.equal(result.songs[0].displayKey, 'ABC');
  });

  it('genre: "未分類" 以外を優先', () => {
    const ch1 = makeChannel({ id: 1, code: 'new' });
    const ch2 = makeChannel({ id: 2, code: 'old' });
    const song = makeSong({ id: 1, song_key: 'shared_key' });

    const songUncategorized = { ...song, genre: '未分類' };
    const songWithGenre = { ...song, genre: 'アニソン' };

    const raw1 = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [songUncategorized],
      streams: [],
      streamSongs: [],
      songChannelStats: [{ song_id: 1, channel_id: 1, sing_count: 1, source_index: null, created_at: '', updated_at: '' }],
    };
    const raw2 = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [songWithGenre],
      streams: [],
      streamSongs: [],
      songChannelStats: [{ song_id: 1, channel_id: 2, sing_count: 1, source_index: null, created_at: '', updated_at: '' }],
    };

    const d1 = buildChannelDataset(ch1, raw1, '2026-01-15');
    const d2 = buildChannelDataset(ch2, raw2, '2026-01-15');
    // d1 が '未分類'、d2 が 'アニソン' → 'アニソン' を優先
    const result = mergeChannelDatasets([d1, d2], '2026-01-15');
    assert.equal(result.songs[0].genre, 'アニソン');
  });

  it('streams は全チャンネルを concat して日付降順にソートする', () => {
    const ch1 = makeChannel({ id: 1, code: 'new' });
    const ch2 = makeChannel({ id: 2, code: 'old' });

    const raw1 = {
      ...emptyRaw(),
      artists: [],
      songs: [],
      streams: [makeStream({ id: 1, channel_id: 1, streamed_on: '2026-01-10' })],
      streamSongs: [],
      songChannelStats: [],
    };
    const raw2 = {
      ...emptyRaw(),
      artists: [],
      songs: [],
      streams: [makeStream({ id: 2, channel_id: 2, streamed_on: '2026-01-15', url_key: 'k2' })],
      streamSongs: [],
      songChannelStats: [],
    };

    const d1 = buildChannelDataset(ch1, raw1, '2026-01-20');
    const d2 = buildChannelDataset(ch2, raw2, '2026-01-20');
    const result = mergeChannelDatasets([d1, d2], '2026-01-20');

    assert.equal(result.streams.length, 2);
    // 降順: 2026-01-15 が先
    assert.equal(result.streams[0].date, '2026-01-15');
    assert.equal(result.streams[1].date, '2026-01-10');
  });

  it('stats.streams は各チャンネルの stats.streams を合算する', () => {
    const ch1 = makeChannel({ id: 1, code: 'new' });
    const ch2 = makeChannel({ id: 2, code: 'old' });

    const raw1 = {
      ...emptyRaw(),
      streams: [
        makeStream({ id: 1, channel_id: 1, url_key: 'k1' }),
        makeStream({ id: 2, channel_id: 1, url_key: 'k2', streamed_on: '2026-01-09', source_index: 2 }),
      ],
      songChannelStats: [],
    };
    const raw2 = {
      ...emptyRaw(),
      streams: [makeStream({ id: 3, channel_id: 2, url_key: 'k3' })],
      songChannelStats: [],
    };

    const d1 = buildChannelDataset(ch1, raw1, '2026-01-15');
    const d2 = buildChannelDataset(ch2, raw2, '2026-01-15');
    const result = mergeChannelDatasets([d1, d2], '2026-01-15');

    assert.equal(result.stats.streams, 3);  // 2 + 1
  });

  it('全体 dense rank を付与する', () => {
    const ch1 = makeChannel({ id: 1, code: 'new' });
    const ch2 = makeChannel({ id: 2, code: 'old' });
    const song1 = makeSong({ id: 1, song_key: 'key1', title: '曲A' });
    const song2 = makeSong({ id: 2, song_key: 'key2', title: '曲B' });

    const raw1 = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [song1],
      streams: [],
      streamSongs: [],
      songChannelStats: [{ song_id: 1, channel_id: 1, sing_count: 10, source_index: null, created_at: '', updated_at: '' }],
    };
    const raw2 = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [song2],
      streams: [],
      streamSongs: [],
      songChannelStats: [{ song_id: 2, channel_id: 2, sing_count: 3, source_index: null, created_at: '', updated_at: '' }],
    };

    const d1 = buildChannelDataset(ch1, raw1, '2026-01-15');
    const d2 = buildChannelDataset(ch2, raw2, '2026-01-15');
    const result = mergeChannelDatasets([d1, d2], '2026-01-15');

    const byCount = result.songs.sort((a, b) => b.count - a.count);
    assert.equal(byCount[0].rank, 1);  // count 10
    assert.equal(byCount[1].rank, 2);  // count 3
  });

  it('マージ後 dates は両チャンネルの日付を合算して降順ソートする', () => {
    const ch1 = makeChannel({ id: 1, code: 'new' });
    const ch2 = makeChannel({ id: 2, code: 'old' });
    const song = makeSong({ id: 1, song_key: 'shared_key' });

    const raw1 = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [song],
      streams: [makeStream({ id: 1, channel_id: 1, streamed_on: '2026-01-10', url_key: 'k1' })],
      streamSongs: [makeStreamSong({ id: 1, stream_id: 1, song_id: 1 })],
      songChannelStats: [{ song_id: 1, channel_id: 1, sing_count: 1, source_index: null, created_at: '', updated_at: '' }],
    };
    const raw2 = {
      ...emptyRaw(),
      artists: [makeArtist()],
      songs: [song],
      streams: [makeStream({ id: 2, channel_id: 2, streamed_on: '2026-01-15', url_key: 'k2' })],
      streamSongs: [makeStreamSong({ id: 2, stream_id: 2, song_id: 1 })],
      songChannelStats: [{ song_id: 1, channel_id: 2, sing_count: 1, source_index: null, created_at: '', updated_at: '' }],
    };

    const d1 = buildChannelDataset(ch1, raw1, '2026-01-20');
    const d2 = buildChannelDataset(ch2, raw2, '2026-01-20');
    const result = mergeChannelDatasets([d1, d2], '2026-01-20');

    const merged = result.songs[0];
    assert.deepEqual(merged.dates, ['2026-01-15', '2026-01-10']);
    assert.equal(merged.lastSung, '2026-01-15');
    assert.equal(merged.firstSung, '2026-01-10');
    assert.equal(merged.daysSinceLast, 5);  // 2026-01-20 - 2026-01-15 = 5
  });
});
