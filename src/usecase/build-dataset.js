/**
 * @module usecase/build-dataset
 * @description 全チャンネルのデータセットを構築する UseCase。
 *
 * 既存実装との対応:
 *   - functions/api/data.js:220 (onRequestGet 内のデータ取得 + buildDataset + mergeChannels)
 *   - admin-server/server.js:740 (buildStaticSiteData)
 *   - tools/generate_static_data.mjs (同等)
 *
 * 変更点:
 *   - 6 テーブルを Promise.all で並列取得
 *   - buildChannelDataset / mergeChannelDatasets に委譲 (Pure 関数)
 *   - today は Clock から取得 (new Date() を直接呼ばない)
 *
 * @副作用 Repository の read のみ (write なし)
 */

import { buildChannelDataset, mergeChannelDatasets } from '../domain/analytics/channel-stats.js';

/**
 * @typedef {import('../domain/port/repositories/channel-repository.js').ChannelRepository} ChannelRepository
 * @typedef {import('../domain/port/repositories/artist-repository.js').ArtistRepository} ArtistRepository
 * @typedef {import('../domain/port/repositories/song-repository.js').SongRepository} SongRepository
 * @typedef {import('../domain/port/repositories/stream-repository.js').StreamRepository} StreamRepository
 * @typedef {import('../domain/port/repositories/stream-song-repository.js').StreamSongRepository} StreamSongRepository
 * @typedef {import('../domain/port/repositories/song-channel-stats-repository.js').SongChannelStatsRepository} SongChannelStatsRepository
 * @typedef {import('../domain/port/clock.js').Clock} Clock
 * @typedef {import('../domain/analytics/channel-stats.js').ChannelDataset} ChannelDataset
 * @typedef {import('../domain/analytics/channel-stats.js').MergedDataset} MergedDataset
 */

/**
 * @typedef {object} BuildDatasetDeps
 * @property {ChannelRepository}           channels
 * @property {ArtistRepository}            artists
 * @property {SongRepository}              songs
 * @property {StreamRepository}            streams
 * @property {StreamSongRepository}        streamSongs
 * @property {SongChannelStatsRepository}  stats
 * @property {Clock}                       clock
 */

/**
 * @typedef {object} BuildDatasetResult
 * @property {Record<string, ChannelDataset>} channels  - code → ChannelDataset
 * @property {MergedDataset}                  combined  - 全チャンネル合算
 */

/**
 * 全チャンネルのデータセットを構築して返す。
 *
 * 1. 6 テーブルを Promise.all で並列取得
 * 2. RawTables を組み立て
 * 3. clock から today を取得
 * 4. チャンネルごとに buildChannelDataset を呼ぶ
 * 5. mergeChannelDatasets で combined を生成
 *
 * @param {BuildDatasetDeps} deps
 * @returns {Promise<BuildDatasetResult>}
 */
export async function buildDataset(deps) {
  const [channels, artists, songs, streams, streamSongs, songChannelStats] = await Promise.all([
    deps.channels.findAll(),
    deps.artists.findAll(),
    deps.songs.findAll(),
    deps.streams.findAll(),
    deps.streamSongs.findAll(),
    deps.stats.findAll(),
  ]);

  /** @type {import('../domain/analytics/channel-stats.js').RawTables} */
  const raw = { channels, artists, songs, streams, streamSongs, songChannelStats };

  // today を Clock から取得し YYYY-MM-DD 形式に変換
  const today = deps.clock.now().toISOString().slice(0, 10);

  /** @type {Record<string, ChannelDataset>} */
  const channelDatasets = {};
  for (const channel of channels) {
    channelDatasets[channel.code] = buildChannelDataset(channel, raw, today);
  }

  const combined = mergeChannelDatasets(Object.values(channelDatasets), today);

  return { channels: channelDatasets, combined };
}
