const VALID_TABS = new Set(['dashboard', 'ranking', 'songs', 'timeline', 'analytics', 'playlists']);
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
  const rawChannel = params.get('ch');
  const rawV = params.get('v') || '';
  return {
    tab: VALID_TABS.has(rawTab) ? rawTab : DEFAULTS.tab,
    channel: VALID_CHANNELS.has(rawChannel) ? rawChannel : DEFAULTS.channel,
    q: params.get('q') || DEFAULTS.q,
    v: VIDEO_ID_RE.test(rawV) ? rawV : DEFAULTS.v,
    t: Math.max(0, parseInt(params.get('t') || '0', 10) || 0),
  };
}

export function writeUrlState(next = {}, options = {}) {
  const merged = { ...readUrlState(), ...next };
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
  return merged;
}
