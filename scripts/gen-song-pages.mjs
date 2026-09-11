// 曲ごとの静的HTMLを生成する。
//
// 本体は SPA なので、曲の情報は JS が JSON を読んで初めて画面に出る。
// 検索エンジンにとっては「曲名で見せられるページが1枚も無い」状態だったため、
// 曲ごとに素の HTML を書き出して、JS を実行しなくても中身が読める入口を作る。
//
// 生成物はアプリのバンドルに依存させない（CSSインライン・JSなし）。
// 単独で軽く、ビルドが壊れてもこの入口だけは生き残る。
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs', 'song');
const ORIGIN = 'https://ibara-muan-songlist.pages.dev';
const SITE_NAME = '茨むあん 歌唱データベース';
const MAX_SLUG_LEN = 60;

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ファイル名にも URL にも使える形にする。日本語はそのまま残す（日本語URLは検索側も扱える）。
export function songSlug(title, artist) {
  const base = `${title || ''}-${artist || ''}`
    .toLowerCase()
    .replace(/[\\/:*?"<>|#%&{}$!'`+=@~^[\]();,.]/g, ' ')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (base || 'song').slice(0, MAX_SLUG_LEN).replace(/-$/, '');
}

// 同じスラッグになった曲はキーのハッシュで区別する。
// 連番だとデータが増減したときに既存URLがずれるので使わない。
export function assignSlugs(songs) {
  const taken = new Set();
  const map = new Map();
  for (const song of [...songs].sort((a, b) => a.key.localeCompare(b.key))) {
    let slug = songSlug(song.title, song.artist);
    if (taken.has(slug)) {
      slug = `${slug}-${createHash('sha1').update(song.key).digest('hex').slice(0, 6)}`;
    }
    taken.add(slug);
    map.set(song.key, slug);
  }
  return map;
}

// 同じ曲が複数チャンネルにある場合は、歌唱回数を足して1曲にまとめる。
export function mergeSongs(songsPayload) {
  const merged = new Map();
  for (const list of Object.values(songsPayload?.channels || {})) {
    for (const song of list) {
      if (!song?.key) continue;
      const prev = merged.get(song.key);
      if (prev) {
        prev.count += Number(song.count) || 0;
        prev.genre = prev.genre || song.genre;
        prev.displayKey = prev.displayKey || song.displayKey;
      } else {
        merged.set(song.key, {
          key: song.key,
          title: song.title,
          artist: song.artist,
          genre: song.genre || '',
          displayKey: song.displayKey || '',
          count: Number(song.count) || 0,
        });
      }
    }
  }
  return [...merged.values()];
}

// 曲キー → その曲を歌った歌枠の一覧（新しい順）
export function collectPerformances(streamsPayload) {
  const byKey = new Map();
  for (const list of Object.values(streamsPayload?.channels || {})) {
    for (const stream of list) {
      for (const item of stream.songs || []) {
        if (!item?.key) continue;
        if (!byKey.has(item.key)) byKey.set(item.key, []);
        byKey.get(item.key).push({
          date: stream.date || '',
          title: stream.title || '',
          url: stream.url || '',
          channel: stream.channel || '',
          t: item.t == null ? null : Number(item.t),
        });
      }
    }
  }
  for (const list of byKey.values()) {
    list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }
  return byKey;
}

export function formatSeconds(total) {
  const n = Math.max(0, Math.floor(Number(total) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  const pad = (v) => String(v).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function youtubeUrlAt(url, seconds) {
  const base = String(url || '').split('&')[0].split('?')[0];
  if (!base) return '';
  return seconds > 0 ? `${base}?t=${Math.floor(seconds)}` : base;
}

export function videoIdFromUrl(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:live\/|shorts\/|embed\/|watch\?(?:[^#]*&)?v=))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}

const PAGE_CSS = `
:root{color-scheme:light dark;--bg:#f7f4ec;--surface:#fffdf8;--ink:#191713;--mute:#746b5e;--border:#ded1b1;--link:#936715}
@media(prefers-color-scheme:dark){:root{--bg:#11100e;--surface:#1b1915;--ink:#f4efe2;--mute:#a89b84;--border:#4c4129;--link:#f0d27a}}
*{box-sizing:border-box}
body{margin:0;padding:24px 16px 56px;background:var(--bg);color:var(--ink);font-family:"Hiragino Sans","Yu Gothic","Meiryo",system-ui,sans-serif;line-height:1.7}
main{max-width:760px;margin:0 auto}
a{color:var(--link)}
nav.crumbs{font-size:13px;color:var(--mute);margin-bottom:14px}
h1{font-size:24px;margin:0 0 6px}
p.byline{margin:0 0 14px;color:var(--mute);font-size:15px}
p.summary{margin:0 0 8px;font-size:14px;line-height:1.9}
ul.facts{display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0 0 22px;list-style:none}
ul.facts li{background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:4px 12px;font-size:13px}
h2{font-size:17px;margin:26px 0 10px}
ol.plays{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
ol.plays li{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 14px}
.date{font-variant-numeric:tabular-nums;font-weight:700;font-size:14px}
.stitle{display:block;font-size:14px;color:var(--mute);margin:2px 0 6px;word-break:break-word}
.links{display:flex;flex-wrap:wrap;gap:12px;font-size:13px}
footer{margin-top:34px;padding-top:16px;border-top:1px solid var(--border);font-size:12px;color:var(--mute)}
ul.songindex{columns:2 220px;gap:18px;padding:0;margin:0;list-style:none;font-size:14px}
ul.songindex li{break-inside:avoid;padding:3px 0}
`.trim();

function layout({ title, description, canonical, jsonLd, body, noindex = false, script = '' }) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${ORIGIN}/assets/site-icon-512.png">
<meta name="twitter:card" content="summary">
<link rel="icon" type="image/svg+xml" href="/assets/site-icon.svg">
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 1)}
</script>
<style>${PAGE_CSS}</style>
${script ? `<script>${script}</script>` : ''}
</head>
<body>
<main>
${body}
<footer>
<p>個人が趣味で運営しているファンサイトです。茨むあんさん本人とは関係ありません。楽曲名・アーティスト名などの権利は各権利者に帰属します。</p>
<p><a href="/">${escapeHtml(SITE_NAME)} トップへ</a></p>
</footer>
</main>
</body>
</html>
`;
}

export function buildSongPage(song, performances, slug) {
  // 正規URLは拡張子なしに統一する。物理ファイルは .html のままだが、
  // Cloudflare Pages は拡張子なしでも配信するため 404 にならない。
  // sitemap・曲一覧リンクも拡張子なしで揃えること。
  const canonical = `${ORIGIN}/song/${slug}`;
  const title = `${song.title} / ${song.artist} - ${SITE_NAME}`;
  const latest = performances[0]?.date || '';
  const description = `茨むあんさんが「${song.title}」（${song.artist}）を歌った歌枠の一覧。歌唱回数${song.count}回${latest ? `、最新は${latest}の配信` : ''}。曲の開始時刻から再生できます。`;

  const facts = [
    song.genre && `ジャンル: ${song.genre}`,
    song.displayKey && `キー: ${song.displayKey}`,
    `歌唱回数: ${song.count}回`,
  ].filter(Boolean);

  // 検索向けの独自文章。データ一覧だけでなく「この曲についての説明」にして
  // 単なる集計ページとの差別化を図る。performances は新しい順。
  const firstSung = performances.length ? (performances[performances.length - 1]?.date || '') : '';
  const summary = performances.length
    ? `「${song.title}」は${song.artist}の楽曲で、茨むあんさんはこれまで${song.count}回歌唱しています。`
      + (firstSung && firstSung !== latest
        ? `初めて歌われたのは${firstSung}で、最新の歌唱は${latest}です。`
        : (latest ? `歌唱は${latest}の記録があります。` : ''))
      + (song.genre ? `ジャンルは${song.genre}です。` : '')
    : `「${song.title}」は${song.artist}の楽曲です。歌唱記録の追加を待っています。`;

  const plays = performances.map((p) => {
    const at = p.t != null && p.t > 0 ? p.t : 0;
    const videoId = videoIdFromUrl(p.url);
    const youtube = youtubeUrlAt(p.url, at);
    const inSite = videoId ? `/?v=${videoId}${at ? `&amp;t=${at}` : ''}` : '/?tab=timeline';
    return `  <li>
    <span class="date">${escapeHtml(p.date)}</span>${at ? ` <span class="mute">${escapeHtml(formatSeconds(at))}〜</span>` : ''}
    <span class="stitle">${escapeHtml(p.title)}</span>
    <span class="links">
      ${youtube ? `<a href="${escapeHtml(youtube)}" rel="noopener nofollow" target="_blank">YouTubeで${at ? 'この曲から' : ''}見る</a>` : ''}
      <a href="${inSite}">この歌枠のセトリ</a>
    </span>
  </li>`;
  }).join('\n');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${song.title} / ${song.artist}`,
    description,
    url: canonical,
    inLanguage: 'ja',
    isPartOf: { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, name: SITE_NAME, url: `${ORIGIN}/` },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: '曲一覧', item: `${ORIGIN}/song/` },
        { '@type': 'ListItem', position: 3, name: song.title },
      ],
    },
  };

  const body = `<nav class="crumbs"><a href="/">${escapeHtml(SITE_NAME)}</a> ＞ <a href="/song/">曲一覧</a> ＞ ${escapeHtml(song.title)}</nav>
<h1>${escapeHtml(song.title)}</h1>
<p class="byline">${escapeHtml(song.artist)}</p>
<ul class="facts">${facts.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
<p class="summary">${escapeHtml(summary)}</p>
<h2>歌った歌枠（${performances.length}件）</h2>
${performances.length ? `<ol class="plays">\n${plays}\n</ol>` : '<p>歌枠の記録がまだありません。</p>'}
<h2>サイトで探す</h2>
<p><a href="/?tab=songs&amp;q=${encodeURIComponent(song.title)}">「${escapeHtml(song.title)}」を全曲リストで見る</a></p>`;

  return layout({ title, description, canonical, jsonLd, body });
}

// 一部のブラウザ（Vivaldi など）は、アドレスバーに貼られた日本語URLの
// UTF-8 バイト列を Latin-1 として解釈したまま送ることがある。
// 「グミ」→「ã\x82°ã\x83\x9F」のような決まった化け方なので、404 ページ側で
// バイト列に戻して UTF-8 として読み直せば元のパスを復元できる。
//
// 復元できないとき（もともと正しいパス、単なる打ち間違い）は空文字を返す。
// 復元後の文字列は 0xFF を超える文字を含むため、二度目は必ず空になり無限ループしない。
export function repairMojibake(text) {
  const s = String(text || '');
  if (!s || [...s].some(c => c.charCodeAt(0) > 0xFF)) return '';
  try {
    const bytes = Uint8Array.from([...s], c => c.charCodeAt(0));
    const out = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return out === s ? '' : out;
  } catch (_) {
    return '';
  }
}

const REPAIR_SCRIPT = `
(function(){
  try{
    var p = decodeURIComponent(location.pathname);
    for (var i = 0; i < p.length; i++) if (p.charCodeAt(i) > 255) return;
    var b = new Uint8Array(p.length);
    for (var j = 0; j < p.length; j++) b[j] = p.charCodeAt(j);
    var fixed = new TextDecoder('utf-8', { fatal: true }).decode(b);
    if (fixed && fixed !== p) location.replace(encodeURI(fixed) + location.search + location.hash);
  }catch(e){}
})();
`.trim();

// Cloudflare Pages は 404.html が無いと、存在しないパスに対して 200 で
// index.html（SPA）を返す。URL が途中で壊れても「読み込み中」の画面が出るだけで
// 気づけないうえ、検索側にはソフト404が大量に見えるため、実体を置く。
export function buildNotFoundPage() {
  const canonical = `${ORIGIN}/404.html`;
  const title = `ページが見つかりません - ${SITE_NAME}`;
  const description = 'お探しのページは見つかりませんでした。';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    url: canonical,
    inLanguage: 'ja',
  };
  const body = `<h1>ページが見つかりません</h1>
<p class="byline">URL が途中で切れていたり、文字が化けている可能性があります。</p>
<h2>ここから探せます</h2>
<ul class="facts">
  <li><a href="/">トップ（ダッシュボード）</a></li>
  <li><a href="/song/">曲一覧（索引）</a></li>
  <li><a href="/?tab=songs">全曲リストで検索</a></li>
  <li><a href="/?tab=timeline">配信タイムライン</a></li>
</ul>`;
  return layout({ title, description, canonical, jsonLd, body, noindex: true, script: REPAIR_SCRIPT });
}

export function buildSongIndexPage(entries) {
  const canonical = `${ORIGIN}/song/`;
  const title = `曲一覧（${entries.length}曲） - ${SITE_NAME}`;
  const description = `茨むあんさんの歌枠で歌われた${entries.length}曲の一覧。曲ごとに歌唱回数と、歌った歌枠・開始時刻を確認できます。`;
  const items = [...entries]
    .sort((a, b) => (b.song.count - a.song.count) || a.song.title.localeCompare(b.song.title, 'ja'))
    .map(({ song, slug }) => `  <li><a href="/song/${escapeHtml(slug)}">${escapeHtml(song.title)}</a> <small>/ ${escapeHtml(song.artist)}（${song.count}回）</small></li>`)
    .join('\n');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '曲一覧',
    description,
    url: canonical,
    inLanguage: 'ja',
    isPartOf: { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, name: SITE_NAME, url: `${ORIGIN}/` },
  };

  const body = `<nav class="crumbs"><a href="/">${escapeHtml(SITE_NAME)}</a> ＞ 曲一覧</nav>
<h1>曲一覧</h1>
<p class="byline">歌唱回数の多い順に${entries.length}曲。</p>
<ul class="songindex">
${items}
</ul>`;

  return layout({ title, description, canonical, jsonLd, body });
}

// 曲キー → スラッグ。sitemap 生成からも同じ対応を使う。
export function buildSongPageEntries() {
  const songsPayload = JSON.parse(readFileSync(join(ROOT, 'docs', 'data', 'songs.json'), 'utf-8'));
  const streamsPayload = JSON.parse(readFileSync(join(ROOT, 'docs', 'data', 'streams.json'), 'utf-8'));
  const songs = mergeSongs(songsPayload);
  const slugs = assignSlugs(songs);
  const plays = collectPerformances(streamsPayload);
  return songs.map((song) => ({
    song,
    slug: slugs.get(song.key),
    performances: plays.get(song.key) || [],
  }));
}

export function generateSongPages() {
  const entries = buildSongPageEntries();
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const wanted = new Set(['index.html', ...entries.map(e => `${e.slug}.html`)]);
  for (const name of readdirSync(OUT_DIR)) {
    // データから消えた曲のページを残すと 404 にもならない孤児ページになる
    if (name.endsWith('.html') && !wanted.has(name)) unlinkSync(join(OUT_DIR, name));
  }

  for (const entry of entries) {
    writeFileSync(join(OUT_DIR, `${entry.slug}.html`), buildSongPage(entry.song, entry.performances, entry.slug));
  }
  writeFileSync(join(OUT_DIR, 'index.html'), buildSongIndexPage(entries));
  writeFileSync(join(ROOT, 'docs', '404.html'), buildNotFoundPage());
  return entries.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = generateSongPages();
  console.log(`generated docs/song/ (${count} song pages + index)`);
}
