/**
 * @module infra/d1-rest
 * @description D1 REST API (Node.js admin-server 用) Repository 実装のバレル。
 *
 * 使い方:
 * ```js
 * import { D1RestClient, D1RestSongRepository, ... } from './src/infra/d1-rest/index.js';
 *
 * const client = new D1RestClient({
 *   accountId : process.env.CLOUDFLARE_ACCOUNT_ID,
 *   databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID,
 *   apiToken  : process.env.CLOUDFLARE_API_TOKEN,
 * });
 * const songs = new D1RestSongRepository(client);
 * ```
 */

export { D1RestClient } from './d1-rest-client.js';
export { D1RestSongRepository } from './d1-song-repository.js';
export { D1RestArtistRepository } from './d1-artist-repository.js';
export { D1RestStreamRepository } from './d1-stream-repository.js';
export { D1RestStreamSongRepository } from './d1-stream-song-repository.js';
export { D1RestSongChannelStatsRepository } from './d1-song-channel-stats-repository.js';
export { D1RestChannelRepository } from './d1-channel-repository.js';
