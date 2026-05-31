/**
 * @module infra/wire/d1-rest-deps
 * @description D1 REST クライアントから Repository 群を組み立てる。
 */

import { D1RestClient } from '../d1-rest/d1-rest-client.js';
import {
  D1RestChannelRepository,
  D1RestArtistRepository,
  D1RestSongRepository,
  D1RestStreamRepository,
  D1RestStreamSongRepository,
  D1RestSongChannelStatsRepository,
} from '../d1-rest/index.js';
import { SystemClock } from '../clock/system-clock.js';
import { FetchSpreadsheetGateway } from '../spreadsheet/fetch-spreadsheet-gateway.js';

/**
 * @param {{ accountId: string, databaseId: string, apiToken: string }} config
 */
export function createD1RestDeps(config) {
  const client = new D1RestClient(config);
  return {
    channels: new D1RestChannelRepository(client),
    artists: new D1RestArtistRepository(client),
    songs: new D1RestSongRepository(client),
    streams: new D1RestStreamRepository(client),
    streamSongs: new D1RestStreamSongRepository(client),
    stats: new D1RestSongChannelStatsRepository(client),
    spreadsheet: new FetchSpreadsheetGateway(),
    clock: new SystemClock(),
  };
}

/**
 * process.env から D1 REST deps を組み立てる。
 */
export function createD1RestDepsFromEnv() {
  return createD1RestDeps({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
  });
}
