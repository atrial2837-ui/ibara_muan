/**
 * @module domain/analytics/channel-stats
 * @description チャンネル別データセット構築・マージの純粋関数群。
 *
 * 既存実装との対応:
 *   - buildChannelDataset ← functions/api/data.js:80 (buildDataset)
 *                          ← admin-server/server.js:600 (buildSiteDataset)
 *   - mergeChannelDatasets ← functions/api/data.js:172 (mergeChannels)
 *                           ← admin-server/server.js:692 (mergeSiteChannels)
 *
 * 既存実装との主な差分:
 *   1. inferGenre を呼ばない (データ駆動: song.genre || '' を返す)
 *      根拠: SoT 10 §3-3 / SoT 20 — データ駆動化方針
 *   2. dates / streamRefs / firstSung / lastSung / daysSinceLast を実計算
 *      根拠: SoT 03 §8-3 — 既存実装の常に null/空は「バグ」と明記済み
 *   3. today を引数化 — 内部で new Date() を呼ばない
 *      根拠: SoT 20 §1 原則 2 (Domain は runtime 非依存)
 *
 * @副作用 なし (純粋関数のみ)
 */

import { normalize } from '../shared/text.js';
import { monthKey, daysSince } from '../shared/date.js';
import { withDenseRank } from './rank.js';
import { deriveArtists } from './artist-stats.js';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

/**
 * @typedef {import('../port/repositories/channel-repository.js').Channel} Channel
 * @typedef {import('../port/repositories/artist-repository.js').Artist} Artist
 * @typedef {import('../port/repositories/song-repository.js').Song} Song
 * @typedef {import('../port/repositories/stream-repository.js').Stream} Stream
 * @typedef {import('../port/repositories/stream-song-repository.js').StreamSong} StreamSong
 * @typedef {import('../port/repositories/song-channel-stats-repository.js').SongChannelStat} SongChannelStat
 * @typedef {import('../shared/date.js').DateIso} DateIso
 */

/**
 * @typedef {object} RawTables
 * @property {ReadonlyArray<Channel>} channels
 * @property {ReadonlyArray<Artist>} artists
 * @property {ReadonlyArray<Song>} songs
 * @property {ReadonlyArray<Stream>} streams
 * @property {ReadonlyArray<StreamSong>} streamSongs
 * @property {ReadonlyArray<SongChannelStat>} songChannelStats
 */

/**
 * セトリ内の曲参照。
 * @typedef {object} StreamSongRef
 * @property {string} key     - song_key
 * @property {string} raw     - raw_text
 */

/**
 * 公開 API / 静的データ向けの歌枠オブジェクト。
 * @typedef {object} EnrichedStream
 * @property {number}          index
 * @property {string}          channel
 * @property {string}          dateRaw
 * @property {string}          date
 * @property {string}          title
 * @property {string}          url
 * @property {number}          songCount
 * @property {StreamSongRef[]} songs
 * @property {string}          monthKey
 * @property {number|null}     year
 * @property {number|null}     month
 * @property {number|null}     dayOfWeek
 */

/**
 * 公開 API / 静的データ向けの曲オブジェクト。
 * @typedef {object} EnrichedSong
 * @property {number}       sourceIndex
 * @property {string}       title
 * @property {string}       artist
 * @property {number}       count
 * @property {string}       key
 * @property {string}       displayKey
 * @property {string}       keyText
 * @property {string}       genre
 * @property {string}       genreText
 * @property {string[]}     channels
 * @property {string[]}     dates
 * @property {object[]}     streamRefs
 * @property {string|null}  lastSung
 * @property {string|null}  firstSung
 * @property {number|null}  daysSinceLast
 * @property {number}       rank
 */

/**
 * チャンネル別統計サマリ。
 * @typedef {object} ChannelStats
 * @property {string}       title
 * @property {string}       updateText
 * @property {string|null}  updateDate
 * @property {number}       total
 * @property {number}       repertoire
 * @property {number}       streams
 * @property {number}       avgPerStream
 * @property {string}       channelId
 * @property {string}       channelLabel
 * @property {boolean}      keyPublished
 */

/**
 * チャンネル別データセット。
 * @typedef {object} ChannelDataset
 * @property {ChannelStats}     stats
 * @property {EnrichedSong[]}   songs
 * @property {EnrichedStream[]} streams
 * @property {unknown[]}        orphans
 * @property {import('./artist-stats.js').ArtistRecord[]} artists
 */

/**
 * マージ済みデータセット (combined)。
 * @typedef {ChannelDataset} MergedDataset
 */

// ─── ユーティリティ ───────────────────────────────────────────────────────────

/**
 * 曜日番号 (0=日 ... 6=土) を返す。無効日付は null。
 *
 * @param {string|null|undefined} dateIso - YYYY-MM-DD
 * @returns {number|null}
 */
function parseDayOfWeek(dateIso) {
  if (!dateIso) return null;
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.getDay();
}

// ─── 公開 API ─────────────────────────────────────────────────────────────────

/**
 * displayKey の優先ルール: 左優先 (first wins)。
 *
 * @param {string|null|undefined} left
 * @param {string|null|undefined} right
 * @returns {string}
 */
export function pickDisplayKey(left, right) {
  return left || right || '';
}

/**
 * genre の優先ルール: '未分類' 以外を優先。
 * '' も '未分類' 扱い (データ駆動化方針: Phase 1.5)。
 *
 * @param {string|null|undefined} left
 * @param {string|null|undefined} right
 * @returns {string}
 */
export function pickGenre(left, right) {
  if (left && left !== '未分類') return left;
  if (right && right !== '未分類') return right;
  return left || right || '';
}

/**
 * 1 回あたり平均歌唱数を計算する (小数第一位で四捨五入)。
 *
 * @param {number} total       - 総歌唱数
 * @param {number} streamCount - 歌枠数
 * @returns {number}
 */
export function computeAvgPerStream(total, streamCount) {
  if (streamCount === 0) return 0;
  return Math.round((total / streamCount) * 10) / 10;
}

/**
 * 1 チャンネル分のデータセットを構築する純粋関数。
 *
 * 既存実装 (data.js:buildDataset / admin-server:buildSiteDataset) を pure 化。
 * 差分:
 *   - inferGenre を呼ばない → song.genre || ''
 *   - dates / streamRefs / firstSung / lastSung / daysSinceLast を実計算
 *   - today を引数で受け取る (new Date() を内部で呼ばない)
 *
 * @param {Channel}  channel
 * @param {RawTables} raw
 * @param {DateIso}  today  - 'YYYY-MM-DD' (Clock から注入)
 * @returns {ChannelDataset}
 */
export function buildChannelDataset(channel, raw, today) {
  // ── インデックスマップ ─────────────────────────────────────────────────────
  /** @type {Map<number, Artist>} */
  const artistsById = new Map(raw.artists.map((a) => [a.id, a]));
  /** @type {Map<number, Song>} */
  const songsById = new Map(raw.songs.map((s) => [s.id, s]));

  // ── stream_songs を stream_id でグループ化 (position 昇順) ───────────────
  /** @type {Map<number, StreamSong[]>} */
  const streamSongsByStreamId = new Map();
  for (const ss of raw.streamSongs) {
    if (!streamSongsByStreamId.has(ss.stream_id)) {
      streamSongsByStreamId.set(ss.stream_id, []);
    }
    streamSongsByStreamId.get(ss.stream_id).push(ss);
  }
  for (const rows of streamSongsByStreamId.values()) {
    rows.sort((a, b) => a.position - b.position);
  }

  // ── 当チャンネルの歌枠を構築 (日付降順) ──────────────────────────────────
  /** @type {EnrichedStream[]} */
  const streams = raw.streams
    .filter((s) => s.channel_id === channel.id)
    .map((stream) => {
      const date = stream.streamed_on;
      const ssRows = streamSongsByStreamId.get(stream.id) || [];
      const songRefs = ssRows.map((row) => {
        const song = row.song_id != null ? songsById.get(row.song_id) : null;
        return {
          key: song?.song_key || row.song_key_snapshot,
          raw: row.raw_text || '',
        };
      });
      return {
        index: stream.source_index || 0,
        channel: channel.code,
        dateRaw: date ? date.replaceAll('-', '/') : '',
        date,
        title: normalize(stream.title),
        url: stream.url || '',
        songCount: stream.song_count || songRefs.length,
        songs: songRefs,
        monthKey: monthKey(date),
        year: date ? Number(date.slice(0, 4)) : null,
        month: date ? Number(date.slice(5, 7)) : null,
        dayOfWeek: parseDayOfWeek(date),
      };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  // ── song_key → 歌枠日付リストのマップを構築 ─────────────────────────────
  // stream_songs の song_key_snapshot を使ってマッピング
  // (song_id が null の場合でも song_key_snapshot を使う)
  /** @type {Map<string, { dates: string[], streamRefs: object[] }>} */
  const songKeyDates = new Map();

  for (const stream of raw.streams) {
    if (stream.channel_id !== channel.id) continue;
    const ssRows = streamSongsByStreamId.get(stream.id) || [];
    for (const row of ssRows) {
      const song = row.song_id != null ? songsById.get(row.song_id) : null;
      const key = song?.song_key || row.song_key_snapshot;
      if (!key) continue;

      if (!songKeyDates.has(key)) {
        songKeyDates.set(key, { dates: [], streamRefs: [] });
      }
      const entry = songKeyDates.get(key);
      const date = stream.streamed_on;
      if (date && !entry.dates.includes(date)) {
        entry.dates.push(date);
      }
      // streamRef: streamを参照する軽量オブジェクト
      entry.streamRefs.push({
        streamId: stream.id,
        date,
        index: stream.source_index || 0,
        position: row.position,
      });
    }
  }

  // dates を日付降順でソート
  for (const entry of songKeyDates.values()) {
    entry.dates.sort((a, b) => String(b).localeCompare(String(a)));
  }

  // ── 当チャンネルの曲一覧を構築 ───────────────────────────────────────────
  const statsBySong = new Map(
    raw.songChannelStats
      .filter((stat) => stat.channel_id === channel.id)
      .map((stat) => [stat.song_id, stat]),
  );

  const songs = Array.from(statsBySong.values()).map((stat) => {
    const song = songsById.get(stat.song_id);
    const artist = song?.artist_id != null ? artistsById.get(song.artist_id) : null;
    const displayKey = normalize(song?.display_key || '');
    // inferGenre を呼ばない: データ駆動方針 (SoT 10 §3-3)
    const genre = normalize(song?.genre || '');
    const songKey = song?.song_key || '';

    // dates / streamRefs / firstSung / lastSung / daysSinceLast を実計算
    const dateEntry = songKeyDates.get(songKey);
    const dates = dateEntry?.dates || [];
    const streamRefs = dateEntry?.streamRefs || [];

    // dates は降順なので [0] が最新、末尾が最古
    const lastSung = dates[0] || null;
    const firstSung = dates.length > 0 ? dates[dates.length - 1] : null;
    const daysSinceLast = lastSung != null ? daysSince(lastSung, today) : null;

    return {
      sourceIndex: stat.source_index || 0,
      title: normalize(song?.title),
      artist: normalize(artist?.name),
      count: stat.sing_count || 0,
      key: songKey,
      displayKey,
      keyText: displayKey,
      genre,
      genreText: genre,
      channels: [channel.code],
      dates,
      streamRefs,
      lastSung,
      firstSung,
      daysSinceLast,
      rank: 0,
    };
  });

  // ── ランク付与 ────────────────────────────────────────────────────────────
  const rankedSongs = withDenseRank(songs);

  // ── 統計集計 ──────────────────────────────────────────────────────────────
  const total = rankedSongs.reduce((sum, s) => sum + s.count, 0);
  const newestStream = streams[0]?.date || null;

  /** @type {ChannelStats} */
  const stats = {
    title: channel.name,
    updateText: newestStream ? `更新日：${newestStream.replaceAll('-', '/')}` : '',
    updateDate: newestStream,
    total,
    repertoire: rankedSongs.length,
    streams: streams.length,
    avgPerStream: computeAvgPerStream(total, streams.length),
    channelId: channel.code,
    channelLabel: channel.name,
    keyPublished: raw.songs.some((s) => normalize(s.display_key || '')),
  };

  return {
    stats,
    songs: rankedSongs,
    streams,
    orphans: [],
    artists: deriveArtists(rankedSongs),
  };
}

/**
 * 複数チャンネルのデータセットをマージする純粋関数。
 *
 * 既存実装 (data.js:mergeChannels / admin-server:mergeSiteChannels) を pure 化。
 * 同一 song_key について count を加算、displayKey / genre は優先ルールで合成。
 *
 * @param {ChannelDataset[]} datasets
 * @param {DateIso}          today     - 'YYYY-MM-DD' (Clock から注入)
 * @returns {MergedDataset}
 */
export function mergeChannelDatasets(datasets, today) {
  /** @type {Map<string, EnrichedSong & { dates: string[], streamRefs: object[] }>} */
  const songMap = new Map();
  /** @type {EnrichedStream[]} */
  const streams = [];

  for (const dataset of datasets) {
    for (const song of dataset.songs) {
      const existing = songMap.get(song.key);
      if (existing) {
        existing.count += song.count;
        existing.channels = Array.from(new Set([...existing.channels, ...song.channels]));
        // displayKey: left wins (pickDisplayKey)
        existing.displayKey = pickDisplayKey(existing.displayKey, song.displayKey);
        existing.keyText = existing.displayKey;
        // genre: '未分類' 以外を優先 (pickGenre)
        existing.genre = pickGenre(existing.genre, song.genre);
        existing.genreText = existing.genre;
        // dates: マージして降順ソート (重複除去)
        const mergedDates = Array.from(new Set([...existing.dates, ...song.dates]));
        mergedDates.sort((a, b) => String(b).localeCompare(String(a)));
        existing.dates = mergedDates;
        // streamRefs: 結合
        existing.streamRefs = [...existing.streamRefs, ...song.streamRefs];
        // lastSung / firstSung / daysSinceLast を再計算
        existing.lastSung = mergedDates[0] || null;
        existing.firstSung = mergedDates.length > 0 ? mergedDates[mergedDates.length - 1] : null;
        existing.daysSinceLast = existing.lastSung != null
          ? daysSince(existing.lastSung, today)
          : null;
      } else {
        songMap.set(song.key, {
          ...song,
          channels: [...song.channels],
          dates: [...song.dates],
          streamRefs: [...song.streamRefs],
        });
      }
    }
    streams.push(...dataset.streams);
  }

  streams.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const songs = withDenseRank(Array.from(songMap.values()));

  const total = datasets.reduce((sum, d) => sum + d.stats.total, 0);
  const streamCount = datasets.reduce((sum, d) => sum + d.stats.streams, 0);
  const newestStream = streams[0]?.date || null;
  const single = datasets.length === 1 ? datasets[0].stats : null;

  return {
    stats: {
      title: single?.channelLabel || '全期間',
      updateText: newestStream ? `更新日：${newestStream.replaceAll('-', '/')}` : '',
      updateDate: newestStream,
      total,
      repertoire: songs.length,
      streams: streamCount,
      avgPerStream: computeAvgPerStream(total, streams.length),
      channelId: single?.channelId || 'all',
      channelLabel: single?.channelLabel || '全期間',
      keyPublished: datasets.some((d) => d.stats.keyPublished),
    },
    songs,
    streams,
    orphans: [],
    artists: deriveArtists(songs),
  };
}
