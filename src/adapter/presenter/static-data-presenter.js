/**
 * @module adapter/presenter/static-data-presenter
 * @description generateStaticData UseCase の戻り値を docs/data/{meta,songs,streams}.json
 * と同じ構造に整形する。
 *
 * 既存実装との対応:
 *   - admin-server/server.js:758-798 (generateStaticData)
 *   - tools/generate_static_data.mjs:252-280 (main)
 *
 * 既存実装との差分:
 *   - 静的版の streams[].songs は { key } のみ (raw/title/artist を含まない)
 *     根拠: admin-server/server.js:619-625 (buildSiteDataset)
 *            tools/generate_static_data.mjs:113-118 (buildDataset)
 *
 * @副作用 なし (純粋関数のみ)
 */

// ─── 型定義 ──────────────────────────────────────────────────────────────────

/**
 * @typedef {import('../../domain/analytics/channel-stats.js').EnrichedStream} EnrichedStream
 * @typedef {import('../../domain/analytics/channel-stats.js').EnrichedSong} EnrichedSong
 * @typedef {import('../../domain/analytics/channel-stats.js').ChannelStats} ChannelStats
 */

/**
 * @typedef {object} StaticDataFiles
 * @property {object} meta    - { generatedAt, channels: { [code]: ChannelStats }, combined: ChannelStats }
 * @property {object} songs   - { generatedAt, channels: { [code]: SongRecord[] } }
 * @property {object} streams - { generatedAt, channels: { [code]: StreamRecord[] } }
 */

// ─── ヘルパー ────────────────────────────────────────────────────────────────

/**
 * 静的版 StreamRecord を整形する。
 *
 * songs フィールドは { key } のみを含む (raw/title/artist は除く)。
 * 根拠: admin-server/server.js:619-625 / tools/generate_static_data.mjs:113-118
 *
 * @param {EnrichedStream} stream
 * @returns {object}
 */
function formatStaticStreamRecord(stream) {
  return {
    index: stream.index,
    channel: stream.channel,
    dateRaw: stream.dateRaw,
    date: stream.date,
    title: stream.title,
    url: stream.url,
    songCount: stream.songCount,
    songs: stream.songs.map(({ key }) => ({ key })),
    monthKey: stream.monthKey,
    year: stream.year,
    month: stream.month,
    dayOfWeek: stream.dayOfWeek,
  };
}

/**
 * 静的版 SongRecord を整形する。
 *
 * クライアント側で streams から復元できる履歴フィールドは含めない。
 *
 * @param {EnrichedSong} song
 * @returns {object}
 */
function formatStaticSongRecord(song) {
  return {
    title: song.title,
    artist: song.artist,
    count: song.count,
    key: song.key,
    displayKey: song.displayKey,
    genre: song.genre,
  };
}

// ─── 公開 API ─────────────────────────────────────────────────────────────────

/**
 * generateStaticData の出力を docs/data/{meta,songs,streams}.json と同じ構造に整形する。
 *
 * generateStaticData は既に 3 ファイル分の構造を返しているが、
 * 静的版では StreamRecord.songs を { key } のみに絞り込む必要がある。
 *
 * 既存実装 (admin-server/server.js:758-798) と同じ構造:
 *   meta.json:    { generatedAt, channels: { [code]: ChannelStats }, combined: ChannelStats }
 *   songs.json:   { generatedAt, channels: { [code]: SongRecord[] } }
 *   streams.json: { generatedAt, channels: { [code]: StreamRecord[] } }
 *
 * @param {{ meta: object, songs: object, streams: object }} staticData
 *   - generateStaticData UseCase の戻り値
 * @returns {StaticDataFiles}
 */
export function formatStaticDataFiles(staticData) {
  // meta: stats フィールドのみを含む → そのまま返す
  // (generateStaticData がすでに stats のみを抽出している)
  const meta = {
    generatedAt: staticData.meta.generatedAt,
    channels: staticData.meta.channels,
    combined: staticData.meta.combined,
  };

  // songs: 各チャンネルの SongRecord[] を整形
  const songs = {
    generatedAt: staticData.songs.generatedAt,
    channels: Object.fromEntries(
      Object.entries(staticData.songs.channels).map(([code, songList]) => [
        code,
        songList.map(formatStaticSongRecord),
      ]),
    ),
  };

  // streams: 各チャンネルの StreamRecord[] を整形 (songs フィールドを { key, raw } のみに)
  const streams = {
    generatedAt: staticData.streams.generatedAt,
    channels: Object.fromEntries(
      Object.entries(staticData.streams.channels).map(([code, streamList]) => [
        code,
        streamList.map(formatStaticStreamRecord),
      ]),
    ),
  };

  return { meta, songs, streams };
}
