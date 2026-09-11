const VALID_TABS = new Set(['dashboard', 'ranking', 'songs', 'timeline', 'playlists']);
// 旧タブ(analytics)はダッシュボード内のセクションへ吸収済み。URL互換のため読み替えだけ残す。
const LEGACY_TABS = new Set(['analytics']);
const VALID_CHANNELS = new Set(['main', 'all']);
const VIDEO_ID_RE = /^[\w-]{11}$/;
const DEFAULTS = {
  tab: 'dashboard',
  channel: 'main',
  q: '',
  v: '',
  t: 0,
};

export function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get('tab');
  const tab = LEGACY_TABS.has(rawTab) ? 'dashboard' : rawTab;
  const rawChannel = params.get('ch');
  const rawV = params.get('v') || '';
  return {
    tab: VALID_TABS.has(tab) ? tab : DEFAULTS.tab,
    channel: VALID_CHANNELS.has(rawChannel) ? rawChannel : DEFAULTS.channel,
    q: params.get('q') || DEFAULTS.q,
    v: VIDEO_ID_RE.test(rawV) ? rawV : DEFAULTS.v,
    t: Math.max(0, parseInt(params.get('t') || '0', 10) || 0),
  };
}

export function writeUrlState(next = {}, options = {}) {
  const merged = { ...readUrlState(), ...next };
  // 旧タブはURL欄にも出さない（読み替えと対称にする）
  if (LEGACY_TABS.has(merged.tab)) merged.tab = DEFAULTS.tab;
  const params = new URLSearchParams();
  if (merged.tab !== DEFAULTS.tab) params.set('tab', merged.tab);
  if (merged.channel !== DEFAULTS.channel) params.set('ch', merged.channel);
  if (merged.q) params.set('q', merged.q);
  if (merged.v) {
    params.set('v', merged.v);
    if (merged.t > 0) params.set('t', String(Math.floor(merged.t)));
  }
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  const method = options.replace ? 'replaceState' : 'pushState';
  window.history[method](null, '', url);
  // title/description/canonical の更新は呼び出し側が多いので、ここから一度だけ知らせる。
  window.dispatchEvent(new CustomEvent('urlstatechange', { detail: merged }));
  return merged;
}
