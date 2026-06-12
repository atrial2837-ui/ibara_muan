/**
 * @module infra/wire/d1-worker-deps
 * @description D1 Worker バインディングから Repository 群を組み立てる。
 */

import {
  D1WorkerClient,
  D1ChannelRepository,
  D1ArtistRepository,
  D1SongRepository,
  D1StreamRepository,
  D1StreamSongRepository,
  D1SongChannelStatsRepository,
  D1TimestampRepository,
} from '../d1-worker/index.js';
import { SystemClock } from '../clock/system-clock.js';
import { FetchSpreadsheetGateway } from '../spreadsheet/fetch-spreadsheet-gateway.js';

/**
 * @param {object} env - Cloudflare Pages Functions env (DB バインディング必須)
 */
export function createD1WorkerDeps(env) {
  if (!env?.DB) {
    throw new Error('D1 binding DB is missing');
  }

  const client = new D1WorkerClient(env.DB);
  const clock = new SystemClock();
  return {
    channels: new D1ChannelRepository(client),
    artists: new D1ArtistRepository(client),
    songs: new D1SongRepository(client),
    streams: new D1StreamRepository(client),
    streamSongs: new D1StreamSongRepository(client),
    stats: new D1SongChannelStatsRepository(client),
    timestamps: new D1TimestampRepository(client),
    spreadsheet: new FetchSpreadsheetGateway(),
    clock,
  };
}
