// 検索エンジン向けのページメタ（title / description / canonical）を組み立てる。
// SPA なので URL が変わっても HTML は同じものが返る。canonical を出し分けないと
// ?v=... の歌枠ページも ?tab=... も全部トップと同一視されて 1 ページ扱いになる。
// DOM には触らない純粋関数だけを置く（適用側は main.js）。

export const SITE_ORIGIN = 'https://ibara-muan-songlist.pages.dev';
export const SITE_NAME = '茨むあん 歌唱データベース';

const HOME_TITLE = '茨むあん 歌唱データベース｜歌った曲リスト・ランキング・検索';
const HOME_DESC = '茨むあんさんの歌枠で歌われた楽曲を、曲名・アーティスト・ランキング・配信タイムラインから探せる歌唱データベースです。';

const TAB_META = {
  dashboard: { label: '', title: HOME_TITLE, desc: HOME_DESC },
  ranking: { label: 'ランキング', desc: '歌唱回数の多い順に並べた楽曲ランキング。よく歌う曲や十八番がひと目でわかります。' },
  songs: { label: '全曲リスト', desc: '収録している全楽曲を、曲名・アーティスト・ジャンル・キーで検索・絞り込みできます。' },
  timeline: { label: '配信タイムライン', desc: '歌枠を日付順に並べ、各配信のセットリストと曲ごとの歌唱時刻を確認できます。' },
  playlists: { label: 'プレイリスト', desc: '歌ってみた・オリジナル曲のMV一覧と、自分で作るマイリスト。' },
};
// 分析はダッシュボード内のセクション。旧URL(?tab=analytics)は
// readUrlState で dashboard に読み替えるため、ここに残さなくても canonical が崩れない。

const CHANNEL_LABEL = { main: '', all: '' };

// 分析はダッシュボード内のセクション。旧URLが直接来ても正規URLはトップに寄せる。
const LEGACY_TABS = new Set(['analytics']);
const normalizeTab = (tab) => (LEGACY_TABS.has(tab) ? 'dashboard' : tab);

// 歌枠タイトルは装飾記号やハッシュタグが多く、そのままだと検索結果で切れる。
// ただし「#69」のような回数は情報なので、先頭のタグだけを落として本文は残す。
export function cleanStreamTitle(raw) {
  return String(raw || '')
    .replace(/【[^】]*】/g, ' ')
    .replace(/[⌇|｜]/g, ' ')
    .replace(/^(?:\s*[#＃][^\s#＃]+)+/, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 配信日は文字列のこともあれば Date に復元済みのこともある。どちらでも YYYY-MM-DD にする。
export function formatDate(value) {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}`;
  }
  const text = String(value);
  const m = text.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : text;
}

export function truncate(text, max) {
  const s = String(text || '');
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1))}…`;
}

export function buildCanonical(state = {}) {
  const params = new URLSearchParams();
  // 歌枠を開いているときは、その歌枠そのものを正規URLにする（タブは付けない）。
  if (state.v) {
    params.set('v', state.v);
  } else {
    const tab = normalizeTab(state.tab);
    if (tab && tab !== 'dashboard') params.set('tab', tab);
  }
  // ch は内容が変わるので残す。q(検索語)と t(再生位置)は無限に増えるので canonical には含めない。
  if (state.channel && state.channel !== 'main') params.set('ch', state.channel);
  const search = params.toString();
  return search ? `${SITE_ORIGIN}/?${search}` : `${SITE_ORIGIN}/`;
}

export function buildPageMeta(state = {}, context = {}) {
  const canonical = buildCanonical(state);
  const stream = state.v ? context.stream : null;

  if (stream) {
    const title = cleanStreamTitle(stream.title);
    const count = Number(stream.songCount) || (stream.songs ? stream.songs.length : 0);
    const date = formatDate(stream.date);
    return {
      canonical,
      title: `${truncate(title, 42)} のセトリ - ${SITE_NAME}`,
      description: `${date ? `${date}の` : ''}歌枠「${truncate(title, 40)}」のセットリスト${count ? `（全${count}曲）` : ''}。曲ごとの歌唱開始時刻つきで確認できます。`,
    };
  }

  const rawTab = normalizeTab(state.tab);
  const tab = TAB_META[rawTab] ? rawTab : 'dashboard';
  const meta = TAB_META[tab];
  const ch = CHANNEL_LABEL[state.channel] ?? '';
  const chSuffix = ch ? `（${ch}）` : '';

  if (tab === 'dashboard') {
    return {
      canonical,
      title: chSuffix ? `茨むあん ${ch} 歌唱データベース` : meta.title,
      description: meta.desc,
    };
  }
  return {
    canonical,
    title: `${meta.label}${chSuffix} - ${SITE_NAME}`,
    description: meta.desc,
  };
}

// サイトマップ生成と共有するための、タブの一覧。
export function sitemapTabs() {
  return Object.keys(TAB_META);
}
