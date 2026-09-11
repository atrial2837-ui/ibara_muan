/**
 * @file tools/collect_new_videos.mjs
 * @description YouTubeチャンネルRSSから新着歌枠候補を収集する。
 *
 * - 対象: タイトルに「歌枠」を含むもののみ(@ibaramuan のチャンネル既定)
 * - RSSはAPIキー不要。D1/静的JSONと突合して未登録だけ残す
 * - 出力: candidates.json(枠情報) + videos.txt(scanner/scan_utawaku用URL一覧)
 *
 * 使い方:
 *   node tools/collect_new_videos.mjs [--channel-id UC...] [--title-filter 歌枠]
 *     [--source json|d1] [--out-dir tmp/auto-update] [--since YYYY-MM-DD] [--limit N]
 *
 * D1突合(--source d1)には CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_DATABASE_ID /
 * CLOUDFLARE_API_TOKEN が必要。--source json は docs/data/streams.json と突合する。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_CHANNEL_ID = 'UC9zLKU6WiRdcKtAh-6o_zmA'; // Muan ch.茨むあん(@ibaramuan)
const DEFAULT_TITLE_FILTER = '歌枠';

function parseArgs(argv) {
  const args = {
    channelId: DEFAULT_CHANNEL_ID,
    titleFilter: DEFAULT_TITLE_FILTER,
    source: 'json',
    via: 'auto',
    apiKey: process.env.YOUTUBE_API_KEY ?? '',
    outDir: 'tmp/auto-update',
    since: '',
    limit: 0,
    feedUrl: '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--channel-id') args.channelId = next();
    else if (a === '--title-filter') args.titleFilter = next();
    else if (a === '--source') args.source = next();
    else if (a === '--via') args.via = next();
    else if (a === '--api-key') args.apiKey = next();
    else if (a === '--out-dir') args.outDir = next();
    else if (a === '--since') args.since = next();
    else if (a === '--limit') args.limit = Number(next()) || 0;
    else if (a === '--feed-url') args.feedUrl = next();
    else if (a === '-h' || a === '--help') {
      console.log('Usage: node tools/collect_new_videos.mjs [options]');
      process.exit(0);
    }
  }
  return args;
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** RSSの <entry> 群から { videoId, title, publishedAt } を抜く */
function parseFeed(xml) {
  const entries = [];
  const blocks = String(xml).match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  for (const block of blocks) {
    const id = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
    const title = decodeEntities(block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '');
    const publishedAt = block.match(/<published>([^<]+)<\/published>/)?.[1]?.trim();
    if (id && title) entries.push({ videoId: id, title, publishedAt: publishedAt ?? '' });
  }
  return entries;
}

/** UTC publishedAt → JST YYYY-MM-DD */
function toStreamedOn(publishedAt) {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return '';
  return new Date(t + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function extractVideoId(url) {
  return String(url ?? '').match(/[A-Za-z0-9_-]{11}/)?.[0] ?? null;
}

/** docs/data/streams.json から既知の動画ID集合を作る */
function knownIdsFromJson() {
  const known = new Set();
  const file = path.join(ROOT, 'docs', 'data', 'streams.json');
  if (!fs.existsSync(file)) return known;
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const channels = data?.channels ?? {};
  for (const streams of Object.values(channels)) {
    for (const s of streams ?? []) {
      const id = extractVideoId(s?.url);
      if (id) known.add(id);
    }
  }
  return known;
}

/** D1の streams.url から既知の動画ID集合を作る */
async function knownIdsFromD1() {
  const { createD1RestDepsFromEnv } = await import('../src/infra/wire/d1-rest-deps.js');
  const deps = createD1RestDepsFromEnv();
  // D1RestClient は infra 内部。query 経由でURL一覧を取る簡易実装
  const client = deps.streams.client;
  const rows = await client.query('SELECT url FROM streams');
  const known = new Set();
  for (const row of rows) {
    const id = extractVideoId(row?.url);
    if (id) known.add(id);
  }
  return known;
}

/** RSS(XML)から { videoId, title, publishedAt } を取得 */
async function fetchViaRss(args) {
  const feedUrl =
    args.feedUrl || `https://www.youtube.com/feeds/videos.xml?channel_id=${args.channelId}`;
  console.error(`Fetching feed: ${feedUrl}`);
  const res = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'ibara_muan-auto-update/1.0',
      Accept: 'application/atom+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
  return parseFeed(await res.text());
}

/**
 * YouTube Data APIから { videoId, title, publishedAt } を取得。
 * RSSがブロックされる環境(Actions等)のフォールバック。
 * channels.list(1unit) + playlistItems(ページ毎1unit)でuploadsを取得する。
 */
async function fetchViaApi(args) {
  const api = async (endpoint, params) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    const res = await fetch(url, { headers: { 'X-goog-api-key': args.apiKey } });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const reason = payload?.error?.errors?.[0]?.reason ?? `http_${res.status}`;
      throw new Error(`YouTube API error (${endpoint}): ${reason}`);
    }
    return payload;
  };

  console.error(`Fetching uploads via API: channel ${args.channelId}`);
  const ch = await api('channels', {
    part: 'contentDetails', id: args.channelId, key: args.apiKey,
  });
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error('uploads playlist not found for channel');

  const entries = [];
  let pageToken = '';
  while (entries.length < 100) {
    const pl = await api('playlistItems', {
      part: 'snippet,contentDetails', playlistId: uploads, maxResults: 50,
      key: args.apiKey, ...(pageToken ? { pageToken } : {}),
    });
    for (const item of pl.items ?? []) {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title ?? '';
      const publishedAt = item.snippet?.publishedAt ?? '';
      if (videoId && title && !title.startsWith('Private video') && !title.startsWith('Deleted video')) {
        entries.push({ videoId, title, publishedAt });
      }
    }
    pageToken = pl.nextPageToken ?? '';
    if (!pageToken) break;
  }
  return entries;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let entries = [];
  let via = args.via;
  if (args.via === 'rss' || args.via === 'auto') {
    try {
      entries = await fetchViaRss(args);
      via = 'rss';
    } catch (err) {
      if (args.via === 'rss') throw err;
      console.error(`RSS failed (${err.message}). Falling back to YouTube API.`);
    }
  }
  if (!entries.length && via !== 'rss') {
    if (!args.apiKey) {
      throw new Error('RSS取得に失敗し、フォールバック用の YOUTUBE_API_KEY もありません');
    }
    entries = await fetchViaApi(args);
    via = 'api';
  }
  console.error(`Feed entries (${via}): ${entries.length}`);

  let filtered = entries.filter((e) => e.title.includes(args.titleFilter));
  if (args.since) filtered = filtered.filter((e) => (e.publishedAt ?? '') >= args.since);
  filtered.sort((a, b) => String(a.publishedAt).localeCompare(String(b.publishedAt)));
  if (args.limit > 0) filtered = filtered.slice(-args.limit);

  const known = args.source === 'd1' ? await knownIdsFromD1() : knownIdsFromJson();
  console.error(`Known video ids (${args.source}): ${known.size}`);

  const fresh = filtered.filter((e) => !known.has(e.videoId));
  const candidates = fresh.map((e) => ({
    videoId: e.videoId,
    title: e.title,
    url: `https://www.youtube.com/watch?v=${e.videoId}`,
    publishedAt: e.publishedAt,
    streamedOn: toStreamedOn(e.publishedAt),
  }));

  const outDir = path.resolve(ROOT, args.outDir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'candidates.json'),
    JSON.stringify(candidates, null, 2),
    'utf-8',
  );
  fs.writeFileSync(
    path.join(outDir, 'videos.txt'),
    `${candidates.map((c) => c.url).join('\n')}${candidates.length ? '\n' : ''}`,
    'utf-8',
  );

  console.log(JSON.stringify({
    via,
    feedEntries: entries.length,
    utawakuEntries: filtered.length,
    known: known.size,
    fresh: candidates.length,
    outDir: args.outDir,
  }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
