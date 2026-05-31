/**
 * @module adapter/presenter/dataset-presenter
 * @description buildDataset UseCase の戻り値を /api/data レスポンス互換の JSON に整形する。
 *
 * 既存実装との対応:
 *   - functions/api/data.js:244 (onRequestGet が返す JSON)
 *   - admin-server/server.js:740 (buildStaticSiteData の戻り値)
 *
 * Phase 5 で functions/api/data.js の onRequestGet をこの Presenter に置き換える予定。
 *
 * @副作用 なし (純粋関数のみ)
 */

// ─── 型定義 ──────────────────────────────────────────────────────────────────

/**
 * @typedef {import('../../domain/analytics/channel-stats.js').ChannelDataset} ChannelDataset
 * @typedef {import('../../domain/analytics/channel-stats.js').MergedDataset} MergedDataset
 * @typedef {import('../../domain/analytics/channel-stats.js').ChannelStats} ChannelStats
 * @typedef {import('../../domain/analytics/channel-stats.js').EnrichedSong} EnrichedSong
 * @typedef {import('../../domain/analytics/channel-stats.js').EnrichedStream} EnrichedStream
 */

/**
 * @typedef {object} ApiDataResponse
 * @property {Record<string, ChannelDataset>} channels  - code → ChannelDataset
 * @property {MergedDataset}                  combined  - 全チャンネル合算
 */

// ─── ヘルパー: SongRecord の整形 ──────────────────────────────────────────────

/**
 * EnrichedSong を API レスポンス向けの SongRecord に整形する。
 *
 * 表示ルール (既存実装 functions/api/data.js:128-151 から):
 *   - keyText:   displayKey そのまま (空なら '')
 *   - genreText: genre そのまま (空なら '')
 *
 * 動的 API 版: songs の streamRef に title/artist は含まない
 * (StreamSong レベルで title/artist が既にある buildDataset の EnrichedStream.songs には
 *  { key, raw } のみ格納されているため、SongRecord 側の streamRefs は統計参照オブジェクト)
 *
 * @param {EnrichedSong} song
 * @returns {object}
 */
function formatSongRecord(song) {
  return {
    sourceIndex: song.sourceIndex,
    title: song.title,
    artist: song.artist,
    count: song.count,
    key: song.key,
    displayKey: song.displayKey,
    keyText: song.keyText,
    genre: song.genre,
    genreText: song.genreText,
    channels: song.channels,
    dates: song.dates,
    streamRefs: song.streamRefs,
    lastSung: song.lastSung,
    firstSung: song.firstSung,
    daysSinceLast: song.daysSinceLast,
    rank: song.rank,
  };
}

/**
 * EnrichedStream を API レスポンス向けの StreamRecord に整形する。
 *
 * 動的 API 版 (functions/api/data.js:98-124) では songs 内に title/artist を含む。
 * Phase 3C の buildChannelDataset では songs = [{ key, raw }] のみで構築されているため、
 * Presenter でも { key, raw } のみを出力する。
 *
 * @param {EnrichedStream} stream
 * @returns {object}
 */
function formatStreamRecord(stream) {
  return {
    index: stream.index,
    channel: stream.channel,
    dateRaw: stream.dateRaw,
    date: stream.date,
    title: stream.title,
    url: stream.url,
    songCount: stream.songCount,
    songs: stream.songs,
    monthKey: stream.monthKey,
    year: stream.year,
    month: stream.month,
    dayOfWeek: stream.dayOfWeek,
  };
}

/**
 * ChannelStats をそのまま返す。
 * stats フィールドはすでに buildChannelDataset / mergeChannelDatasets で正しく計算済み。
 *
 * @param {ChannelStats} stats
 * @returns {ChannelStats}
 */
function formatStats(stats) {
  return {
    title: stats.title,
    updateText: stats.updateText,
    updateDate: stats.updateDate,
    total: stats.total,
    repertoire: stats.repertoire,
    streams: stats.streams,
    avgPerStream: stats.avgPerStream,
    channelId: stats.channelId,
    channelLabel: stats.channelLabel,
    keyPublished: stats.keyPublished,
  };
}

/**
 * ChannelDataset / MergedDataset を API レスポンス向けに整形する。
 *
 * @param {ChannelDataset | MergedDataset} dataset
 * @returns {object}
 */
function formatDataset(dataset) {
  return {
    stats: formatStats(dataset.stats),
    songs: dataset.songs.map(formatSongRecord),
    streams: dataset.streams.map(formatStreamRecord),
    orphans: [],
    artists: dataset.artists,
  };
}

// ─── 公開 API ─────────────────────────────────────────────────────────────────

/**
 * buildDataset の戻り値を /api/data レスポンス JSON に整形する。
 *
 * 既存 functions/api/data.js:244 と完全互換のフォーマット:
 *   { channels: { [code]: ChannelDataset }, combined: MergedDataset }
 *
 * dataset.channels[code] と dataset.combined の各フィールドを、
 * 既存実装の出力と一致するよう変換する。
 *
 * 互換ポイント:
 *   - stats.updateText:   `更新日：YYYY/MM/DD` (data.js:157)
 *   - stats.channelId:    channel.code (data.js:163)
 *   - stats.channelLabel: channel.name (data.js:164)
 *   - stats.keyPublished: songs のいずれかに display_key があるか (data.js:165)
 *   - songs[].keyText:    displayKey そのまま (data.js:139)
 *   - songs[].genreText:  genre そのまま (data.js:140)
 *   - orphans:            常に [] (data.js:169)
 *
 * @param {{ channels: Record<string, ChannelDataset>, combined: MergedDataset }} dataset
 * @returns {ApiDataResponse}
 */
export function formatApiDataResponse(dataset) {
  /** @type {Record<string, object>} */
  const channels = {};
  for (const [code, channelDataset] of Object.entries(dataset.channels)) {
    channels[code] = formatDataset(channelDataset);
  }

  return {
    channels,
    combined: formatDataset(dataset.combined),
  };
}
