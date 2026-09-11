// docs/data/*.json から sitemap.xml を組み立てる。
//
// SPA なので実体の HTML は 1 枚しかないが、?tab= と ?v= は canonical を出し分けて
// いる（docs/js/seo-meta.js）。手書きのままだとトップ 1 件しか載らず、449 本ある
// 歌枠が検索側から存在しないのと同じになるため、データから毎回作り直す。
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { buildSongPageEntries } from './gen-song-pages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ORIGIN = 'https://ibara-muan-songlist.pages.dev';

// seo-meta.js の TAB_META と揃える（dashboard はトップなので個別には出さない）
// 分析はダッシュボード内のセクションになったため単独URLは載せない
const TABS = ['ranking', 'songs', 'timeline', 'playlists'];

const VIDEO_ID_PATTERNS = [
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/watch\?[^#]*v=([A-Za-z0-9_-]{11})/,
  /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
];

export function videoIdFromUrl(url) {
  const text = String(url || '');
  for (const re of VIDEO_ID_PATTERNS) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return '';
}

function xmlEscape(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildSitemapEntries(streamsPayload, today, songEntries = []) {
  const entries = [
    { loc: `${ORIGIN}/`, changefreq: 'daily', priority: '1.0', lastmod: today },
  ];
  for (const tab of TABS) {
    entries.push({ loc: `${ORIGIN}/?tab=${tab}`, changefreq: 'daily', priority: '0.8', lastmod: today });
  }

  // 曲ごとの静的ページ（scripts/gen-song-pages.mjs が生成）
  if (songEntries.length) {
    entries.push({ loc: `${ORIGIN}/song/`, changefreq: 'daily', priority: '0.8', lastmod: today });
    for (const { slug, performances } of songEntries) {
      entries.push({
        loc: `${ORIGIN}/song/${encodeURI(slug)}`,
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: /^\d{4}-\d{2}-\d{2}$/.test(performances?.[0]?.date || '') ? performances[0].date : today,
      });
    }
  }

  // 歌枠は 1 本ずつが独立した内容（セトリ＋歌唱時刻）なので個別に載せる。
  // 同じ動画が複数チャンネルに現れても URL は 1 つに畳む。
  const seen = new Set();
  const streams = Object.values(streamsPayload?.channels || {}).flat();
  streams.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  for (const stream of streams) {
    const id = videoIdFromUrl(stream.url);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    entries.push({
      loc: `${ORIGIN}/?v=${id}`,
      changefreq: 'monthly',
      priority: '0.6',
      lastmod: /^\d{4}-\d{2}-\d{2}$/.test(stream.date || '') ? stream.date : today,
    });
  }
  return entries;
}

export function renderSitemap(entries) {
  const urls = entries
    .map((e) => [
      '  <url>',
      `    <loc>${xmlEscape(e.loc)}</loc>`,
      `    <lastmod>${e.lastmod}</lastmod>`,
      `    <changefreq>${e.changefreq}</changefreq>`,
      `    <priority>${e.priority}</priority>`,
      '  </url>',
    ].join('\n'))
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function generateSitemap() {
  const streams = JSON.parse(readFileSync(join(ROOT, 'docs', 'data', 'streams.json'), 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);
  const entries = buildSitemapEntries(streams, today, buildSongPageEntries());
  const out = join(ROOT, 'docs', 'sitemap.xml');
  writeFileSync(out, renderSitemap(entries));
  return entries.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = generateSitemap();
  console.log(`generated docs/sitemap.xml (${count} URLs)`);
}
