/**
 * @module infra/d1-worker
 * @description Cloudflare D1 Worker Binding 用 Repository 実装群のバレルエクスポート。
 *
 * 使用例:
 * ```js
 * import {
 *   D1WorkerClient,
 *   D1SongRepository,
 *   D1ArtistRepository,
 *   D1StreamRepository,
 *   D1StreamSongRepository,
 *   D1SongChannelStatsRepository,
 *   D1ChannelRepository,
 * } from './src/infra/d1-worker/index.js';
 *
 * // Pages Functions ハンドラ内で
 * const client = new D1WorkerClient(env.DB);
 * const songs  = new D1SongRepository(client);
 * ```
 */

export { D1WorkerClient } from './d1-worker-client.js';
export { D1SongRepository } from './d1-song-repository.js';
export { D1ArtistRepository } from './d1-artist-repository.js';
export { D1StreamRepository } from './d1-stream-repository.js';
export { D1StreamSongRepository } from './d1-stream-song-repository.js';
export { D1SongChannelStatsRepository } from './d1-song-channel-stats-repository.js';
export { D1ChannelRepository } from './d1-channel-repository.js';
export { D1TimestampRepository } from './d1-timestamp-repository.js';
