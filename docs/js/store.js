/**
 * @module store
 * @description URLをSingle Source of Truthとするアプリケーションストア。
 *
 * 状態の所有権:
 *   - URL直列化可能な状態 → URL (tab, channel, q)
 *   - API由来のデータ     → メモリ (channelData, data)
 *   - UI状態              → メモリ (audience, singerMode等)
 *
 * URLとメモリを双方向同期:
 *   - URL変更 → メメモリ更新 → emit
 *   - メモリ変更 → URL更新(必要時) → emit
 */

// ─── URL直列化可能な状態 (SSoT = URL) ────────────────────────────────────────

const VALID_TABS = new Set(['dashboard', 'ranking', 'songs', 'timeline', 'analytics', 'playlists']);
const FAVORITES_KEY = 'ibara-favorites-v1';
const VALID_CHANNELS = new Set(['main', 'all']);
const VIDEO_ID_RE = /^[\w-]{11}$/;

/**
 * @typedef {object} UrlState
 * @property {'dashboard'|'ranking'|'songs'|'timeline'|'analytics'} tab
 * @property {'new'|'old'|'all'} channel
 * @property {string} q
 */

/**
 * @typedef {object} InMemoryState
 * @property {object|null} channelData - API/静的データから取得したチャンネルデータ
 * @property {object|null} data - 現在選択中のチャンネルのデータセット
 * @property {'listener'|'singer'} audience
 * @property {number} timelineLimit
 * @property {object|null} timelineFilter
 * @property {object|null} timelineFocus
 * @property {'date-desc'} timelineSort
 * @property {string} songsQuery
 * @property {'count-desc'|'count-asc'|'recent'|'oldest'|'title'|'artist'} songsSort
 * @property {number} songsLimit
 * @property {'all'|string} songsFilter
 * @property {string} songsGenre
 * @property {string} songsSeason
 * @property {'comfortable'|'compact'} songsView
 * @property {boolean} singerMode
 * @property {'all'|'keyed'|'classic'|'stale'|'rare'} singerPreset
 * @property {object} setlist
 * @property {boolean} setlistExpanded
 * @property {number} rankingLimit
 * @property {Set<string>} favorites
 * @property {boolean} favoritesFilter
 */

let listeners = new Set();

function emit(event) {
  for (const fn of listeners) fn(event);
}

export function onStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ─── URLからの読み書き ───────────────────────────────────────────────────────

export function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get('tab');
  const rawChannel = params.get('ch');
  const rawV = params.get('v') || '';
  return {
    tab: VALID_TABS.has(rawTab) ? rawTab : 'dashboard',
    channel: VALID_CHANNELS.has(rawChannel) ? rawChannel : 'main',
    q: params.get('q') || '',
    v: VIDEO_ID_RE.test(rawV) ? rawV : '',
    t: Math.max(0, parseInt(params.get('t') || '0', 10) || 0),
  };
}

export function writeUrlState(next = {}, options = {}) {
  const merged = { ...readUrlState(), ...next };
  const params = new URLSearchParams();
  if (merged.tab !== 'dashboard') params.set('tab', merged.tab);
  if (merged.channel !== 'new') params.set('ch', merged.channel);
  if (merged.q) params.set('q', merged.q);
  if (merged.v) {
    params.set('v', merged.v);
    if (merged.t > 0) params.set('t', String(Math.floor(merged.t)));
  }
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  const method = options.replace ? 'replaceState' : 'pushState';
  window.history[method](null, '', url);
  return merged;
}

// ─── デフォルト値 ────────────────────────────────────────────────────────────

const _initialUrl = readUrlState();

const DEFAULT_IN_MEMORY = {
  // URL由来の状態。set() のガード (!(key in memState)) を通すため
  // 必ず初期キーを定義しておく（未定義だと set('activeTab') が無視される）
  activeTab: _initialUrl.tab,
  channel: _initialUrl.channel,
  audience: 'listener',
  timelineLimit: 12,
  timelineFilter: null,
  timelineFocus: null,
  timelineSort: 'date-desc',
  songsQuery: '',
  songsSort: 'count-desc',
  songsLimit: 100,
  songsFilter: 'all',
  songsGenre: 'all',
  songsSeason: 'all',
  songsView: 'comfortable',
  singerMode: false,
  singerPreset: 'all',
  setlist: { theme: '', copyFormat: 'simple', items: [] },
  setlistExpanded: false,
  rankingLimit: 50,
  rankingPeriod: 'all',
  rankingMonth: '',
  favorites: loadFavorites(),
  favoritesFilter: false,
  fullLoaded: false,
  channelData: null,
  data: null,
};

// ─── ストアインスタンス ──────────────────────────────────────────────────────

let urlState = readUrlState();
let memState = { ...DEFAULT_IN_MEMORY };

function syncUrlToMem() {
  const u = readUrlState();
  let changed = false;
  if (u.tab !== urlState.tab) { memState.activeTab = u.tab; changed = true; }
  if (u.channel !== urlState.channel) { memState.channel = u.channel; changed = true; }
  if (u.q !== urlState.q) { memState.songsQuery = u.q; changed = true; }
  urlState = u;
  return changed;
}

function syncMemToUrl(fields) {
  const patch = {};
  if (fields.includes('tab')) patch.tab = memState.activeTab;
  if (fields.includes('channel')) patch.channel = memState.channel;
  if (fields.includes('q')) patch.q = memState.songsQuery;
  if (Object.keys(patch).length > 0) {
    writeUrlState(patch, { replace: true });
    urlState = { ...urlState, ...patch };
  }
}

export function get(key) {
  return memState[key];
}

export function set(key, value, options = {}) {
  if (!(key in memState)) return;
  const prev = get(key);
  memState[key] = value;

  if (prev !== value) {
    emit({ key, prev, next: value });
    if (options.updateUrl !== false) {
      const urlFields = [];
      if (key === 'activeTab') urlFields.push('tab');
      if (key === 'channel') urlFields.push('channel');
      if (key === 'songsQuery') urlFields.push('q');
      if (urlFields.length > 0) syncMemToUrl(urlFields);
    }
  }
}

// ─── 初期化 ──────────────────────────────────────────────────────────────────

export function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (_) {
    return new Set();
  }
}

export function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch (e) {
    console.warn('Failed to save favorites:', e);
  }
}

export function toggleFavorite(key) {
  const favorites = loadFavorites();
  if (favorites.has(key)) {
    favorites.delete(key);
  } else {
    favorites.add(key);
  }
  saveFavorites(favorites);
  memState.favorites = favorites;
  emit({ key: 'favorites', prev: null, next: favorites });
  return favorites;
}

export function isFavorite(key) {
  return memState.favorites.has(key);
}

export function initStore() {
  if (syncUrlToMem()) {
    emit({ key: 'url-sync', prev: null, next: urlState });
  }
  window.addEventListener('popstate', () => {
    if (syncUrlToMem()) {
      emit({ key: 'url-sync', prev: null, next: urlState });
    }
  });
}

export function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const state = {
  get activeTab() { return get('activeTab'); },
  set activeTab(v) { set('activeTab', v); },

  get channel() { return get('channel'); },
  set channel(v) { set('channel', v); },

  get songsQuery() { return get('songsQuery'); },
  set songsQuery(v) { set('songsQuery', v); },

  get channelData() { return get('channelData'); },
  set channelData(v) { set('channelData', v); },

  get data() { return get('data'); },
  set data(v) { set('data', v); },

  get audience() { return get('audience'); },
  set audience(v) { set('audience', v); },

  get singerMode() { return get('singerMode'); },
  set singerMode(v) { set('singerMode', v); },

  get singerPreset() { return get('singerPreset'); },
  set singerPreset(v) { set('singerPreset', v); },

  get timelineLimit() { return get('timelineLimit'); },
  set timelineLimit(v) { set('timelineLimit', v); },

  get timelineFilter() { return get('timelineFilter'); },
  set timelineFilter(v) { set('timelineFilter', v); },

  get timelineFocus() { return get('timelineFocus'); },
  set timelineFocus(v) { set('timelineFocus', v); },

  get timelineSort() { return get('timelineSort'); },
  set timelineSort(v) { set('timelineSort', v); },

  get songsSort() { return get('songsSort'); },
  set songsSort(v) { set('songsSort', v); },

  get songsLimit() { return get('songsLimit'); },
  set songsLimit(v) { set('songsLimit', v); },

  get songsFilter() { return get('songsFilter'); },
  set songsFilter(v) { set('songsFilter', v); },

  get songsGenre() { return get('songsGenre'); },
  set songsGenre(v) { set('songsGenre', v); },

  get songsSeason() { return get('songsSeason'); },
  set songsSeason(v) { set('songsSeason', v); },

  get songsView() { return get('songsView'); },
  set songsView(v) { set('songsView', v); },

  get setlist() { return get('setlist'); },
  set setlist(v) { set('setlist', v); },

  get setlistExpanded() { return get('setlistExpanded'); },
  set setlistExpanded(v) { set('setlistExpanded', v); },

  get rankingLimit() { return get('rankingLimit'); },
  set rankingLimit(v) { set('rankingLimit', v); },

  get rankingPeriod() { return get('rankingPeriod'); },
  set rankingPeriod(v) { set('rankingPeriod', v); },

  get rankingMonth() { return get('rankingMonth'); },
  set rankingMonth(v) { set('rankingMonth', v); },

  get fullLoaded() { return get('fullLoaded'); },
  set fullLoaded(v) { set('fullLoaded', v); },

  get favorites() { return get('favorites'); },
  get favoritesFilter() { return get('favoritesFilter'); },
  set favoritesFilter(v) { set('favoritesFilter', v); },
};
