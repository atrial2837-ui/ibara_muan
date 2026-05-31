import { state } from './state.js';
import { ensureSongTags, loadAll } from './data.js';
import { buildIndex } from './search.js';
import { initTheme, onThemeChange } from './theme.js';
import { onRerenderNeeded, destroyAllCharts } from './charts.js';
import { $, $$, escapeHtml, fmtDate, daysSince, isLink, formatNumber, streamKey } from './utils.js';
import { DEFAULT_CHANNEL } from './config.js';
import { readUrlState, writeUrlState } from './url-state.js';

initTheme();

const VIEW_LOADERS = {
  dashboard: () => import('./views/dashboard.js').then(m => m.renderDashboard),
  ranking:   () => import('./views/ranking.js').then(m => m.renderRanking),
  songs:     () => import('./views/songs.js').then(m => m.renderSongs),
  timeline:  () => import('./views/timeline.js').then(m => m.renderTimeline),
  analytics: () => import('./views/analytics.js').then(m => m.renderAnalytics),
};
const rendererCache = new Map();
let renderToken = 0;
let fullDataPromise = null;

function isValidTab(tab) {
  return Object.prototype.hasOwnProperty.call(VIEW_LOADERS, tab);
}

async function getRenderer(tab) {
  if (!rendererCache.has(tab)) rendererCache.set(tab, VIEW_LOADERS[tab]());
  try {
    return await rendererCache.get(tab);
  } catch (error) {
    rendererCache.delete(tab);
    throw error;
  }
}

function requiresFullData(tab) {
  return ['dashboard', 'ranking', 'songs', 'timeline', 'analytics'].includes(tab);
}

function renderInitialDashboard() {
  const panel = $('#panel-dashboard');
  if (!panel || !state.channelData) return;
  const channels = Object.values(state.channelData.channels || {})
    .map(dataset => dataset.stats || {})
    .filter(stats => stats.channelLabel || stats.channelId);
  const rows = channels.length ? channels : [state.channelData.combined?.stats || {}];
  panel.innerHTML = `
    <div class="dashboard-grid">
      ${rows.map(stats => `
        <div class="card col-6">
          <div class="card-title">${escapeHtml(stats.channelLabel || stats.channelId || '全期間')}</div>
          <div style="display:grid;gap:10px;">
            <div class="activity-row">
              <span class="a-date">歌唱</span>
              <span class="a-meta">総歌唱数</span>
              <strong>${formatNumber(stats.total || 0)}回</strong>
            </div>
            <div class="activity-row">
              <span class="a-date">曲数</span>
              <span class="a-meta">持ち曲数</span>
              <strong>${formatNumber(stats.repertoire || 0)}曲</strong>
            </div>
            <div class="activity-row">
              <span class="a-date">歌枠</span>
              <span class="a-meta">配信回数</span>
              <strong>${formatNumber(stats.streams || 0)}回</strong>
            </div>
            <div class="activity-row">
              <span class="a-date">平均</span>
              <span class="a-meta">1枠平均</span>
              <strong>${stats.avgPerStream ?? '—'}曲</strong>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderDeferredPanel(tab, options = {}) {
  if (tab === 'dashboard' && options.initial) {
    renderInitialDashboard();
    return;
  }
  const panel = $(`#panel-${tab}`);
  if (!panel) return;
  const labels = {
    dashboard: 'ダッシュボード詳細',
    ranking: 'ランキング',
    songs: '曲リスト',
    timeline: '配信タイムライン',
    analytics: 'アナリティクス',
  };
  panel.innerHTML = `
    <div class="state-card">
      <div class="msg">${escapeHtml(labels[tab] || '詳細データ')}</div>
      <div class="err-detail">読み込み中です。</div>
    </div>
  `;
}

function renderPanelLoading(tab) {
  const panel = $(`#panel-${tab}`);
  if (!panel) return;
  panel.innerHTML = `
    <div class="state-card">
      <div class="msg">詳細データを読み込んでいます</div>
    </div>
  `;
}

async function ensureFullData() {
  if (state.channelData?.fullLoaded) return;
  if (!fullDataPromise) {
    fullDataPromise = loadAll({ meta: state.channelData }).finally(() => {
      fullDataPromise = null;
    });
  }
  const fullData = await fullDataPromise;
  state.channelData = fullData;
  state.channelData.fullLoaded = true;
  const channel = getDataset(state.channel) ? state.channel : DEFAULT_CHANNEL;
  switchChannel(channel, {
    resetSearch: false,
    updateUrl: false,
    render: false,
  });
}

function scheduleFullDataPreload() {
  if (state.channelData?.fullLoaded || fullDataPromise) return;
  const preload = async () => {
    try {
      await ensureFullData();
      if (state.activeTab === 'dashboard') {
        renderTab('dashboard', { autoLoad: false });
      }
    } catch (error) {
      console.warn('[data] background preload failed', error);
    }
  };
  const runWhenIdle = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(preload, { timeout: 4000 });
    } else {
      window.setTimeout(preload, 1200);
    }
  };
  const scheduleAfterInitialPaint = () => window.setTimeout(runWhenIdle, 1800);
  if (document.readyState === 'complete') {
    scheduleAfterInitialPaint();
  } else {
    window.addEventListener('load', scheduleAfterInitialPaint, { once: true });
  }
}

async function renderTab(tab = state.activeTab, options = {}) {
  if (!state.data || !isValidTab(tab)) return;
  if (requiresFullData(tab) && !state.channelData?.fullLoaded) {
    if (options.autoLoad) {
      renderPanelLoading(tab);
      try {
        await ensureFullData();
      } catch (error) {
        console.error('[data] full load failed', error);
        const panel = $(`#panel-${tab}`);
        if (panel) {
          panel.innerHTML = `
            <div class="state-card">
              <div class="msg">詳細データの読み込みに失敗しました</div>
              <div class="err-detail">${escapeHtml(error?.message || String(error))}</div>
              <button class="btn primary" type="button" data-load-full-data="${escapeHtml(tab)}">再読み込み</button>
            </div>
          `;
          panel.querySelector('[data-load-full-data]')?.addEventListener('click', () => {
            renderTab(tab, { autoLoad: true });
          });
        }
        return;
      }
    } else {
      renderDeferredPanel(tab, { initial: options.initial });
      return;
    }
  }
  const token = ++renderToken;
  try {
    const renderer = await getRenderer(tab);
    if (token !== renderToken || tab !== state.activeTab || !state.data) return;
    if (tab === 'songs') buildIndex(state.data.songs || []);
    renderer();
  } catch (error) {
    console.error(`[${tab}] render failed`, error);
    const panel = $(`#panel-${tab}`);
    if (panel) {
      panel.innerHTML = `
        <div class="state-card">
          <div class="msg">表示に失敗しました</div>
          <div class="err-detail">${escapeHtml(error?.message || String(error))}</div>
        </div>
      `;
    }
  }
}

function activateTab(tab, options = {}) {
  if (!isValidTab(tab)) tab = 'dashboard';
  state.activeTab = tab;
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
  if (options.updateUrl !== false) writeUrlState({ tab });
  renderTab(tab, {
    autoLoad: options.autoLoad !== false,
    initial: !!options.initial,
  });
}

function getDataset(channelId) {
  if (!state.channelData) return null;
  if (channelId === 'all') return state.channelData.combined;
  return state.channelData.channels[channelId] || null;
}

function switchChannel(channelId, options = {}) {
  const ds = getDataset(channelId);
  if (!ds) return;
  state.channel = channelId;
  updatePageTitle(channelId);
  state.data = ds;
  state.timelineFilter = null;
  state.timelineFocus = null;
  state.timelineLimit = 12;
  state.songsLimit = 100;
  if (options.resetSearch !== false) {
    state.songsQuery = '';
    state.songsGenre = 'all';
  }
  destroyAllCharts();
  $$('#channel-switch [data-channel]').forEach(b => b.classList.toggle('active', b.dataset.channel === channelId));
  updateMobileMenuLabel();
  if (options.updateUrl !== false) {
    writeUrlState({
      tab: state.activeTab,
      channel: channelId,
      q: state.songsQuery,
    });
  }
  renderHero();
  if (options.render !== false) renderTab(state.activeTab, { autoLoad: options.autoLoad !== false });
}

function switchAudience(audience, options = {}) {
  state.audience = audience === 'singer' ? 'singer' : 'listener';
  state.singerMode = state.audience === 'singer';
  if (!state.singerMode) state.singerPreset = 'all';
  $$('.audience-switch [data-audience]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.audience === state.audience);
  });
  document.body.dataset.audience = state.audience;
  updateMobileMenuLabel();
  if (state.audience === 'singer') {
    state.songsLimit = 100;
    activateTab('songs', { autoLoad: options.autoLoad !== false });
  } else if (state.data) {
    renderTab(state.activeTab, {
      autoLoad: options.autoLoad !== false,
      initial: !!options.initial,
    });
  }
}

function updateMobileMenuLabel() {
  const label = $('#mobile-menu-label');
  if (!label) return;
  const channel = $('#channel-switch [data-channel].active')?.textContent?.trim() || '茨むあん';
  const audience = $('#audience-switch [data-audience].active')?.textContent?.trim() || 'リスナー';
  label.textContent = `${channel} / ${audience}`;
}

function initMobileMenu() {
  const toggle = $('#mobile-menu-toggle');
  const checkbox = $('#mobile-menu-state');
  const menu = $('#topbar-actions');
  if (!toggle || !checkbox || !menu) return;
  const setOpen = (open) => {
    checkbox.checked = open;
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  const close = () => setOpen(false);
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    requestAnimationFrame(() => setOpen(checkbox.checked));
  });
  toggle.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setOpen(!checkbox.checked);
  });
  checkbox.addEventListener('change', () => {
    setOpen(checkbox.checked);
  });
  document.addEventListener('click', (event) => {
    if (!menu.classList.contains('is-open')) return;
    if (event.target.closest('#topbar-actions') || event.target.closest('#mobile-menu-toggle') || event.target.closest('#mobile-menu-state')) return;
    close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  menu.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  updateMobileMenuLabel();
}

function initPageTopToast() {
  const button = $('#page-top-toast');
  if (!button) return;
  const image = button.querySelector('img[data-src]');
  let ticking = false;
  const threshold = 420;
  const loadImage = () => {
    if (!image || image.src) return;
    image.src = image.dataset.src || '';
  };
  const update = () => {
    ticking = false;
    const visible = window.scrollY > threshold;
    if (visible) loadImage();
    button.hidden = !visible;
    button.classList.toggle('is-visible', visible);
    button.setAttribute('aria-hidden', String(!visible));
    button.tabIndex = visible ? 0 : -1;
  };
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  button.hidden = true;
  button.setAttribute('aria-hidden', 'true');
  button.tabIndex = -1;
  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  window.addEventListener('scroll', requestUpdate, { passive: true });
  update();
}

function refreshChannelButtons() {
  if (!state.channelData) return;
  for (const btn of $$('#channel-switch [data-channel]')) {
    const ch = btn.dataset.channel;
    const available = ch === 'all'
      ? !!state.channelData.combined
      : !!(state.channelData.channels && state.channelData.channels[ch]);
    btn.disabled = !available;
    if (!available) {
      btn.title = 'データを取得できませんでした';
    } else {
      btn.removeAttribute('title');
    }
  }
}

function filterTimelineBySong({ key, title, artist }) {
  const sameFilter = state.timelineFilter && state.timelineFilter.key === key;
  if (sameFilter && state.activeTab === 'timeline') {
    state.timelineFilter = null;
  } else {
    state.timelineFilter = { key, title, artist };
  }
  state.timelineFocus = null;
  state.timelineLimit = 12;
  activateTab('timeline');
  $('#panel-timeline').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function jumpToStreamFromDetail(song, ref) {
  state.timelineFilter = { key: song.key, title: song.title, artist: song.artist };
  state.timelineFocus = streamKey(ref);
  state.timelineLimit = 9999;
  activateTab('timeline');
  $('#panel-timeline').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function searchArtistFromDetail(song) {
  searchArtistName(song.artist || '');
}

function searchArtistName(artist) {
  const name = String(artist || '').replace(/"/g, '');
  state.songsQuery = name ? `artist:"${name}"` : '';
  state.songsLimit = 100;
  writeUrlState({ tab: 'songs', q: state.songsQuery });
  activateTab('songs', { updateUrl: false });
}

function findSong(key) {
  return (state.data?.songs || []).find(song => song.key === key) || null;
}

function youtubeVideoId(url) {
  const text = String(url || '');
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?[^#]*v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return '';
}

function youtubeThumb(url) {
  const id = youtubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

function youtubeThumbFallback(url) {
  const id = youtubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '';
}

function youtubeThumbTiny(url) {
  const id = youtubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/default.jpg` : '';
}

function openSongDetail(key) {
  const song = findSong(key);
  const modal = $('#song-modal');
  const body = $('#song-modal-body');
  const title = $('#song-modal-title');
  if (!song || !modal || !body || !title) return;
  ensureSongTags(song);

  title.textContent = song.title;
  const refs = (song.streamRefs || []).slice(0, 8).map(ref => ({
    ...ref,
    thumbnail: youtubeThumb(ref.url),
    thumbnailFallback: youtubeThumbFallback(ref.url),
    thumbnailTiny: youtubeThumbTiny(ref.url),
    detailKey: streamKey(ref),
  }));
  const tags = [
    song.genre,
    ...(song.seasonTags || []),
    ...(song.moodTags || []),
    ...(song.singerTags || []),
  ].filter(Boolean);
  body.innerHTML = `
    <div class="song-detail-main">
      <div>
        <button class="song-detail-artist" type="button" data-detail-action="artist" data-songkey="${escapeHtml(song.key)}">${escapeHtml(song.artist)}</button>
        <div class="song-detail-tags">${tags.map(tag => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join('')}</div>
      </div>
      <div class="song-detail-stats">
        <div><strong>${song.count}</strong><span>歌唱回数</span></div>
        <div><strong>${song.displayKey || '—'}</strong><span>キー</span></div>
        <div><strong>${song.daysSinceLast ?? '—'}</strong><span>日前</span></div>
      </div>
    </div>
    <div class="song-detail-actions">
      <button class="btn primary" type="button" data-detail-action="timeline" data-songkey="${escapeHtml(song.key)}">歌枠を見る</button>
      <button class="btn ghost" type="button" data-detail-action="close">閉じる</button>
    </div>
    <div class="song-detail-history">
      <h3>歌った歌枠</h3>
      ${refs.length ? refs.map(ref => `
        <div class="song-detail-stream">
          ${ref.thumbnail && ref.url
            ? `<a class="song-detail-thumb-link" href="${escapeHtml(ref.url)}" target="_blank" rel="noopener" aria-label="YouTubeで歌枠を開く"><img class="song-detail-thumb" src="${escapeHtml(ref.thumbnail)}" data-fallback="${escapeHtml(ref.thumbnailFallback)}" data-tiny="${escapeHtml(ref.thumbnailTiny)}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>`
            : '<div class="song-detail-thumb placeholder"></div>'}
          <button class="song-detail-frame" type="button" data-detail-action="stream" data-songkey="${escapeHtml(song.key)}" data-streamkey="${escapeHtml(ref.detailKey)}">
            <span>${fmtDate(ref.date)}</span>
            <strong>${escapeHtml(ref.title || '配信')}</strong>
          </button>
        </div>
      `).join('') : '<p class="song-detail-empty">履歴未確認</p>'}
    </div>
  `;
  modal.hidden = false;
  $('#song-modal-close')?.focus();
}

function initSongModal() {
  const modal = $('#song-modal');
  const closeBtn = $('#song-modal-close');
  if (!modal || !closeBtn) return;
  const close = () => { modal.hidden = true; };
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
    const action = event.target.closest('[data-detail-action]');
    if (!action) return;
    event.stopPropagation();
    if (action.dataset.detailAction === 'close') close();
    if (action.dataset.detailAction === 'timeline') {
      const song = findSong(action.dataset.songkey);
      close();
      if (song) filterTimelineBySong(song);
    }
    if (action.dataset.detailAction === 'stream') {
      const song = findSong(action.dataset.songkey);
      const ref = song?.streamRefs?.find(item => streamKey(item) === action.dataset.streamkey);
      close();
      if (song && ref) jumpToStreamFromDetail(song, ref);
    }
    if (action.dataset.detailAction === 'artist') {
      const song = findSong(action.dataset.songkey);
      close();
      if (song) searchArtistFromDetail(song);
    }
  });
  modal.addEventListener('error', (event) => {
    const img = event.target.closest?.('.song-detail-thumb');
    if (!img) return;
    const next = img.dataset.fallback || img.dataset.tiny || '';
    if (next && img.src !== next) {
      img.src = next;
      if (img.dataset.fallback === next) {
        delete img.dataset.fallback;
      } else {
        delete img.dataset.tiny;
      }
      return;
    }
    img.closest('.song-detail-thumb-link')?.classList.add('thumb-missing');
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) close();
  });
}

function renderHero() {
  const { stats, streams = [] } = state.data;
  const latest = streams[0]?.date || null;
  const dSinceLatest = daysSince(latest);
  const dataGeneratedDate = stats.dataGeneratedDate || state.channelData?.dataGeneratedDate || null;
  const dSinceUpdate = daysSince(dataGeneratedDate);
  const chLabel = stats.channelLabel || stats.channelId || '';
  const chBadge = chLabel ? `<span class="badge accent" style="margin-right:8px;">${escapeHtml(chLabel)}</span>` : '';

  $('#updated-info').innerHTML =
    chBadge +
    `データ更新日：<strong>${fmtDate(dataGeneratedDate) || '—'}</strong>` +
    (dSinceUpdate != null ? ` <span class="badge">${dSinceUpdate}日前</span>` : '');

  $('#stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">総歌唱数</div>
      <div class="stat-value">${formatNumber(stats.total)}<span class="stat-unit">回</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">持ち曲数</div>
      <div class="stat-value">${formatNumber(stats.repertoire)}<span class="stat-unit">曲</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">歌枠回数</div>
      <div class="stat-value">${formatNumber(stats.streams)}<span class="stat-unit">回</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">1枠平均</div>
      <div class="stat-value">${stats.avgPerStream}<span class="stat-unit">曲</span></div>
    </div>
    <div class="stat-card accent">
      <div class="stat-label">最新歌枠から</div>
      <div class="stat-value">${dSinceLatest != null ? dSinceLatest : '—'}<span class="stat-unit">日</span></div>
    </div>
    <div class="stat-card gold">
      <div class="stat-label">活動期間</div>
      <div class="stat-value">${activeDays(state.data)}<span class="stat-unit">日</span></div>
    </div>
  `;
}

function activeDays(data) {
  if (!data.streams?.length) return '—';
  const first = data.streams[data.streams.length - 1].date;
  const last = data.streams[0].date;
  return Math.floor((last - first) / 86400000) + 1;
}

function showLoading() { $('#loading').hidden = false; $('#error').hidden = true; }
function hideLoading() { $('#loading').hidden = true; }
function showError(err) {
  $('#loading').hidden = true;
  $('#error').hidden = false;
  $('#err-detail').textContent = err && err.message ? err.message : String(err);
}

function updatePageTitle(mode) {
  const el = document.getElementById('page-title');
  if (!el) return;

  el.innerHTML = '<img class="hero-title-icon" src="assets/hero-rose.svg" alt="" width="32" height="32" fetchpriority="high" decoding="sync">茨むあん 歌唱データベース';
  document.title = '茨むあん 歌唱データベース';
}

function initHelpModal() {
  const modal = $('#help-modal');
  const openBtn = $('#help-btn');
  const closeBtn = $('#help-close');
  if (!modal || !openBtn || !closeBtn) return;

  const open = () => {
    modal.hidden = false;
    closeBtn.focus();
  };
  const close = () => {
    modal.hidden = true;
    openBtn.focus();
  };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) close();
  });
}

function initWelcomeTip() {
  const tip = $('#welcome-tip');
  const close = $('#welcome-close');
  if (!tip || !close) return;
  if (window.matchMedia('(max-width: 760px)').matches) return;
  if (localStorage.getItem('ibara-muan-welcome-tip-dismissed') === '1') return;
  const show = () => { tip.hidden = false; };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(show, { timeout: 5000 });
  } else {
    window.setTimeout(show, 2500);
  }
  close.addEventListener('click', () => {
    tip.hidden = true;
    localStorage.setItem('ibara-muan-welcome-tip-dismissed', '1');
  });
}

async function init() {
  showLoading();
  try {
    const channelData = await loadAll();
    state.channelData = channelData;
    const url = readUrlState();
    state.songsQuery = url.q;
    let initialChannel = url.channel || state.channel || DEFAULT_CHANNEL;
    if (!getDataset(initialChannel)) initialChannel = DEFAULT_CHANNEL;
    if (!getDataset(initialChannel)) {
      const fallback = Object.keys(channelData.channels)[0];
      if (fallback) initialChannel = fallback;
    }
    if (!getDataset(initialChannel)) throw new Error('No channel data could be loaded');
    refreshChannelButtons();
    hideLoading();
    const initialTab = isValidTab(url.tab) ? url.tab : state.activeTab;
    const initialAutoLoad = initialTab !== 'dashboard';
    switchChannel(initialChannel, {
      resetSearch: false,
      updateUrl: false,
      autoLoad: initialAutoLoad,
    });
    activateTab(initialTab, {
      updateUrl: false,
      autoLoad: initialAutoLoad,
      initial: true,
    });
    switchAudience(state.audience, {
      autoLoad: initialAutoLoad,
      initial: true,
    });
    for (const ch of Object.values(channelData.channels)) {
      if (ch.orphans?.length) {
        console.warn(`[${ch.stats.channelLabel}] セトリ→リスト未マッチ: ${ch.orphans.length}件`, ch.orphans);
      }
    }
  } catch (e) {
    console.error(e);
    showError(e);
  }
}

function applyUrlState() {
  if (!state.channelData) return;
  const url = readUrlState();
  state.songsQuery = url.q;
  if (url.channel !== state.channel && getDataset(url.channel)) {
    switchChannel(url.channel, { resetSearch: false, updateUrl: false });
  }
  activateTab(url.tab, { updateUrl: false });
}

// Tab buttons
$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

// Channel switch
$$('.ch-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!btn.dataset.channel) return;
    if (btn.disabled) return;
    switchChannel(btn.dataset.channel);
  });
});

window.addEventListener('popstate', applyUrlState);

// Audience switch
$$('[data-audience]').forEach(btn => {
  btn.addEventListener('click', () => switchAudience(btn.dataset.audience));
});

// Global click → filter timeline by song
document.body.addEventListener('click', (e) => {
  const artist = e.target.closest('[data-artist-search]');
  if (artist) {
    e.preventDefault();
    e.stopPropagation();
    searchArtistName(artist.dataset.artistSearch || artist.textContent || '');
    return;
  }
  if (isLink(e.target)) return;
  const target = e.target.closest('[data-songkey]');
  if (!target) return;
  openSongDetail(target.dataset.songkey);
});

$('#retry-btn').addEventListener('click', init);
$('#reload-btn').addEventListener('click', init);
initHelpModal();
initSongModal();
initMobileMenu();
initPageTopToast();
initWelcomeTip();

// Re-render charts on theme change
onRerenderNeeded(() => {
  if (!state.data) return;
  destroyAllCharts();
  if (state.activeTab === 'dashboard' || state.activeTab === 'analytics') renderTab();
});

function startApp() {
  window.requestAnimationFrame(() => {
    window.setTimeout(init, 0);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp, { once: true });
} else {
  startApp();
}
