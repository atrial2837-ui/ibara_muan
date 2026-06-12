import { state, initStore, toggleFavorite, isFavorite } from './store.js';
import { ensureSongTags, loadAll, loadInitial } from './data.js';
import { buildIndex } from './search.js';
import { initTheme, onThemeChange, cycleTheme } from './theme.js';
import { onRerenderNeeded, destroyAllCharts } from './charts.js';
import { $, $$, escapeHtml, fmtDate, daysSince, isLink, formatNumber, streamKey } from './utils.js';
import { DEFAULT_CHANNEL } from './config.js';
import { readUrlState, writeUrlState } from './url-state.js';
import { initSearchPalette, openSearchPalette, closeSearchPalette, isSearchPaletteOpen } from './views/search-palette.js';

initTheme();
initStore();

const VIEW_LOADERS = {
  dashboard: () => import('./views/dashboard.js').then(m => m.renderDashboard),
  ranking:   () => import('./views/ranking.js').then(m => m.renderRanking),
  songs:     () => import('./views/songs.js').then(m => m.renderSongs),
  timeline:  () => import('./views/timeline.js').then(m => m.renderTimeline),
  analytics: () => import('./views/analytics.js').then(m => m.renderAnalytics),
  playlists: () => import('./views/playlists.js').then(m => m.renderPlaylists),
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

// ストリームデータが必要なタブ（dashboard/timeline/analytics）
// ranking/songs は songs.json だけで描画できる
function needsStreams(tab) {
  return ['dashboard', 'timeline', 'analytics'].includes(tab);
}

function renderDeferredPanel(tab, options = {}) {
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

// songs.json が届いた時点で ranking/songs を早期描画
function applyPartialData(partial) {
  if (state.channelData?.fullLoaded) return;
  state.channelData = partial; // partialLoaded: true, fullLoaded: false
  // state.data を常に最新の channelData に合わせる（タブ問わず）
  const ch = getDataset(state.channel) ? state.channel : DEFAULT_CHANNEL;
  const newData = getDataset(ch);
  if (newData) state.data = newData;
  // streams 不要なタブのみ即時描画（dashboard 等は full 待ち）
  if (!needsStreams(state.activeTab) && state.data) {
    renderTab(state.activeTab, { autoLoad: false });
  }
}

// streams.json まで揃ったときに全タブを更新
function applyFullData(fullData) {
  state.channelData = fullData;
  state.channelData.fullLoaded = true;
  const ch = getDataset(state.channel) ? state.channel : DEFAULT_CHANNEL;
  switchChannel(ch, { resetSearch: false, updateUrl: false, render: false });
  renderTab(state.activeTab, { autoLoad: false });
}

function startFullDataLoad() {
  fullDataPromise = loadAll({
    meta: state.channelData,
    onSongsReady: applyPartialData,
  }).then(applyFullData).finally(() => { fullDataPromise = null; });
  return fullDataPromise;
}

async function ensureFullData() {
  if (state.channelData?.fullLoaded) return;
  if (!fullDataPromise) startFullDataLoad();
  await fullDataPromise;
}

async function renderTab(tab = state.activeTab, options = {}) {
  // playlists は localStorage のみで動作するため state.data 不要
  if (tab !== 'playlists' && (!state.data || !isValidTab(tab))) return;
  if (!isValidTab(tab)) return;
  const hasPartial = state.channelData?.partialLoaded || state.channelData?.fullLoaded;
  const hasFull    = state.channelData?.fullLoaded;
  // playlists は常にすぐ描画（データ待ち不要）
  const waitNeeded = tab === 'playlists' ? false : (needsStreams(tab) ? !hasFull : !hasPartial);

  if (waitNeeded) {
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

  // ブラウザ操作などで埋め込みモードのままタブ切替が来た場合、ミニプレイヤーへ引き継ぐ
  const streamViewer = $('#stream-viewer');
  if (tab !== 'player' && streamViewer && !streamViewer.hidden && !_svFullscreen
      && !_svIsDocked(streamViewer)) {
    _epPrevTab = tab;
    _pendingTabOptions = options;
    closeStreamViewer();
    return;
  }

  state.activeTab = tab;
  syncActiveTabUi(tab);
  if (options.updateUrl !== false) writeUrlState({ tab });
  renderTab(tab, {
    autoLoad: options.autoLoad !== false,
    initial: !!options.initial,
  });
}

function syncActiveTabUi(tab) {
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
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
  if (options.render !== false) {
    renderTab(state.activeTab, {
      autoLoad: options.autoLoad !== false,
      initial: !!options.initial,
    });
  }
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
  const channel = $('#channel-switch [data-channel].active')?.textContent?.trim() || '新ch';
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
  const close = () => {
    setOpen(false);
    toggle.focus();
  };
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

/** 曲モーダルの「頭出し」: タイムスタンプ（ローカル→コミュニティ）を探して
 *  その歌唱位置からストリームビューワーで再生する */
async function _openSongPerformance(song, refKey) {
  const all = state.channelData?.combined?.streams || state.data?.streams || [];
  const stream = all.find(s => streamKey(s) === refKey);
  if (!stream) return;
  const songIdx = (stream.songs || []).findIndex(sg => _normForMatch(sg.title) === _normForMatch(song.title));
  let resume = 0;
  if (songIdx >= 0) {
    // ローカル保存のタイムスタンプ
    try {
      const ts = _svLoadTs(stream);
      if (ts[songIdx] != null) resume = ts[songIdx];
    } catch (_) {}
    // コミュニティタイムスタンプ（承認済み）
    if (!resume && stream.channel != null && stream.index != null) {
      try {
        const res = await fetch(`/api/timestamps/${encodeURIComponent(stream.channel)}/${stream.index}`);
        if (res.ok) {
          const data = await res.json();
          const hit = (data.items || []).find(i => i.songIndex === songIdx);
          if (hit) resume = hit.timeSeconds;
        }
      } catch (_) {}
    }
  }
  openStreamViewer(stream, resume > 3 ? Math.max(0, Math.floor(resume) - 2) : 0);
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

// ─── ミニプレイヤー 進捗バー ──────────────────────────────────────────────────

function _miniStopProgress() {
  if (_miniProgressInterval) { clearInterval(_miniProgressInterval); _miniProgressInterval = null; }
}

function _miniStartProgress() {
  _miniStopProgress();
  _miniProgressInterval = setInterval(() => {
    _syncMiniPos(); // ミニ化中の座標ずれを常時補正（非ミニ化時は no-op）
    if (!_miniPlayer) return;
    try {
      const dur = _miniPlayer.getDuration?.() || 0;
      const cur = _miniPlayer.getCurrentTime?.() || 0;
      if (_svLastStream) _saveWatchEntryThrottled(_svLastStream, cur); // 視聴履歴
      const pct = dur > 0 ? Math.min((cur / dur) * 100, 100) : 0;
      const fill = $('#yt-mini-progress-fill');
      if (fill) fill.style.width = `${pct}%`;
      const st = _miniPlayer.getPlayerState?.();
      const isPlaying = st === window.YT?.PlayerState?.PLAYING;
      const playBtn = $('#yt-mini-play');
      if (playBtn) playBtn.setAttribute('data-playing', isPlaying ? '1' : '0');
    } catch (_) {}
  }, 400);
}

function _miniDestroyPlayer() {
  _miniStopProgress();
  if (_miniPlayer) { try { _miniPlayer.destroy(); } catch (_) {} _miniPlayer = null; }
  const container = $('#yt-player-container');
  if (container) container.innerHTML = '';
}

// ─── ミニプレイヤー 復帰 ─────────────────────────────────────────────────────

function _miniResumeAt() {
  if (_miniPlayer?.getCurrentTime) {
    try { return _miniPlayer.getCurrentTime(); } catch (_) {}
  }
  return Math.max(0, _svMiniStartAt + (Date.now() - _svMiniStartWallTime) / 1000);
}

function _svIsDocked(viewer = $('#stream-viewer')) {
  return !!viewer && (
    viewer.classList.contains('sv-minified') ||
    viewer.classList.contains('sv-music-minified')
  );
}

// ─── ストリームビューワーのミニ化 ────────────────────────────────────────────
// iframe を作り直すと読み込み+バッファで数秒のラグが出るため、プレイヤーは
// 破棄せず CSS でミニパネルの動画エリア位置に固定表示する（全画面と同じ
// DOM 非移動テクニック）。音声・映像ともに一切途切れない。

/** ミニ化中の動画ラップをミニパネルの動画エリアに重ねる（座標同期） */
function _syncMiniPos() {
  const viewer = $('#stream-viewer');
  if (!_svIsDocked(viewer)) return;
  const wrap = $('#sv-player-wrap');
  const target = viewer.classList.contains('sv-music-minified')
    ? document.querySelector('#music-bar .mbar-video-wrap')
    : document.querySelector('#yt-player-panel .yt-mini-video-wrap');
  if (!wrap || !target) return;
  const r = target.getBoundingClientRect();
  wrap.style.left = `${r.left}px`;
  wrap.style.top = `${r.top}px`;
  wrap.style.width = `${r.width}px`;
  wrap.style.height = `${r.height}px`;
}

/** ビューワー → ミニ化（プレイヤーをそのままミニ側コントロールに引き継ぐ） */
function _svMinify() {
  const viewer = $('#stream-viewer');
  const stream = viewer?._currentStream;
  if (!viewer || !stream || !_svPlayer) return false;
  initYouTubePlayer();
  const panel = $('#yt-player-panel');
  if (!panel) return false;

  _svLastStream = stream;
  try { _svMiniStartAt = Math.floor(_svPlayer.getCurrentTime?.() ?? 0); } catch (_) { _svMiniStartAt = 0; }
  _svMiniStartWallTime = Date.now();

  const titleEl = $('#yt-mini-title');
  if (titleEl) titleEl.textContent = stream.title || '';
  const hintEl = $('#yt-mini-hint');
  if (hintEl) hintEl.textContent = '▲ タップして配信ビューワーへ戻る';
  panel.classList.add('has-stream');
  panel.hidden = false;

  // プレイヤーインスタンスごと引き継ぐ（iframe は DOM 移動しない＝リロードなし）
  _miniPlayer = _svPlayer;
  _svPlayer = null;

  viewer.classList.add('sv-minified');
  document.body.classList.add('has-sv-mini');
  document.body.style.overflow = '';

  hidePlayerPanel();
  _svUpdateUrl();
  // タブ切替直後のリフローやアニメーションで座標がずれるため多段同期
  _syncMiniPos();
  requestAnimationFrame(_syncMiniPos);
  setTimeout(_syncMiniPos, 120);
  setTimeout(_syncMiniPos, 400);
  window.addEventListener('resize', _syncMiniPos);
  _miniStartProgress();
  try {
    const st = _miniPlayer.getPlayerState?.();
    $('#yt-mini-play')?.setAttribute('data-playing', st === window.YT?.PlayerState?.PLAYING ? '1' : '0');
  } catch (_) {}
  _applyVol($('#yt-mini-vol-slider'), $('#yt-mini-vol-btn'), null, _storedVol());
  return true;
}

/** ミニ化 → ビューワー復帰（こちらもリロードなし） */
function _svUnminify() {
  const viewer = $('#stream-viewer');
  if (!viewer?.classList.contains('sv-minified')) return false;
  window.removeEventListener('resize', _syncMiniPos);
  _miniStopProgress();
  viewer.classList.remove('sv-minified');
  document.body.classList.remove('has-sv-mini');
  const wrap = $('#sv-player-wrap');
  if (wrap) wrap.style.cssText = '';
  _svPlayer = _miniPlayer;
  _miniPlayer = null;
  const panel = $('#yt-player-panel');
  if (panel) panel.hidden = true;
  showPlayerPanel();
  _svUpdateUrl();
  setTimeout(() => { $('#sv-close')?.focus({ preventScroll: true }); }, 50);
  return true;
}

function _svRestoreFromMusicBar() {
  const viewer = $('#stream-viewer');
  if (!viewer?.classList.contains('sv-music-minified')) return false;
  window.removeEventListener('resize', _syncMiniPos);
  _miniStopProgress();
  viewer.classList.remove('sv-music-minified');
  document.body.classList.remove('has-sv-music');
  const wrap = $('#sv-player-wrap');
  if (wrap) wrap.style.cssText = '';
  _svPlayer = _miniPlayer;
  _miniPlayer = null;
  showPlayerPanel();
  _svUpdateUrl();
  setTimeout(() => { $('#sv-close')?.focus({ preventScroll: true }); }, 50);
  return true;
}

function _svDiscardMusicBar() {
  const viewer = $('#stream-viewer');
  if (!viewer?.classList.contains('sv-music-minified')) return false;
  window.removeEventListener('resize', _syncMiniPos);
  _miniStopProgress();
  _svStopEndedWatch();
  ++_svGen;
  viewer.classList.remove('sv-music-minified');
  document.body.classList.remove('has-sv-music');
  viewer.hidden = true;
  viewer._currentStream = null;
  const wrap = $('#sv-player-wrap');
  if (wrap) { wrap.style.cssText = ''; wrap.innerHTML = ''; }
  _miniDestroyPlayer();
  _svLastStream = null;
  _svUpdateUrl();
  return true;
}

/** ビューワー → 音楽プレイヤーバーへ移動（現在位置を引き継ぐ） */
function _svMoveToMusicBar() {
  const viewer = $('#stream-viewer');
  const stream = viewer?._currentStream;
  if (!viewer || viewer.hidden || !stream?.url) return;
  const t = _svCurrentTime(readUrlState().t);
  const musicTrack = {
    ...stream,
    title: stream.title || (stream.isMv ? '動画' : '歌枠'),
    type: stream.isMv ? (stream.type || 'original') : 'stream',
    sub: stream.isMv
      ? (stream.originalArtist || stream.character || stream.sub || '')
      : `${fmtDate(stream.date)} 第${stream.index}枠`,
    _stream: stream,
  };

  if (!_svPlayer) {
    import('./music-player.js')
      .then(m => m.playMusicBarVideo?.(musicTrack, t))
      .catch(() => {});
    return;
  }

  try { _svMiniStartAt = Math.floor(_svPlayer.getCurrentTime?.() ?? t); } catch (_) { _svMiniStartAt = t; }
  _svMiniStartWallTime = Date.now();
  _miniPlayer = _svPlayer;
  _svPlayer = null;
  _svLastStream = null;
  _svFullscreen = false;
  viewer.classList.remove('sv-fullscreen', 'sv-minified');
  viewer.classList.add('sv-music-minified');
  document.body.classList.remove('has-sv-fullscreen', 'has-sv-mini');
  document.body.classList.add('has-sv-music');
  document.body.style.overflow = '';
  viewer.hidden = false;
  const panel = $('#yt-player-panel');
  if (panel) panel.hidden = true;
  hidePlayerPanel();
  _svUpdateUrl();
  _syncMiniPos();
  requestAnimationFrame(_syncMiniPos);
  setTimeout(_syncMiniPos, 120);
  setTimeout(_syncMiniPos, 400);
  window.addEventListener('resize', _syncMiniPos);
  _miniStartProgress();

  import('./music-player.js')
    .then(m => {
      m.adoptExternalPlayer?.(musicTrack, _miniPlayer, {
        restore: _svRestoreFromMusicBar,
        close: _svDiscardMusicBar,
      });
      _syncMiniPos();
      requestAnimationFrame(_syncMiniPos);
      setTimeout(_syncMiniPos, 120);
      setTimeout(_syncMiniPos, 400);
    })
    .catch(() => {});
}

/** ミニ化状態を完全破棄（別動画を開く・ミニを閉じる時） */
function _svDiscardMini() {
  const viewer = $('#stream-viewer');
  if (viewer?.classList.contains('sv-music-minified')) return _svDiscardMusicBar();
  if (!viewer?.classList.contains('sv-minified')) return false;
  window.removeEventListener('resize', _syncMiniPos);
  _svStopEndedWatch();
  ++_svGen;
  viewer.classList.remove('sv-minified');
  document.body.classList.remove('has-sv-mini');
  viewer.hidden = true;
  viewer._currentStream = null;
  const wrap = $('#sv-player-wrap');
  if (wrap) { wrap.style.cssText = ''; wrap.innerHTML = ''; }
  _miniDestroyPlayer();
  const panel = $('#yt-player-panel');
  if (panel) panel.hidden = true;
  _svLastStream = null;
  _svUpdateUrl();
  return true;
}

// ─── 視聴履歴（続きから見る） ────────────────────────────────────────────────

const WATCH_HISTORY_KEY = 'ibara-muan-watch-history-v1';
let _lastWatchSave = 0;

export function getWatchHistory() {
  try { return JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]'); } catch (_) { return []; }
}

function _saveWatchEntry(stream, t) {
  if (!stream?.url || t < 10) return; // 10秒未満は記録しない
  try {
    const list = getWatchHistory().filter(e => e.url !== stream.url);
    list.unshift({
      url: stream.url,
      title: stream.title || '',
      t: Math.max(0, Math.floor(t)),
      isMv: !!stream.isMv,
      channel: stream.channel ?? null,
      index: stream.index ?? null,
      date: stream.date ?? null,
      updatedAt: Date.now(),
    });
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(list.slice(0, 10)));
  } catch (_) {}
}

function _saveWatchEntryThrottled(stream, t) {
  const now = Date.now();
  if (now - _lastWatchSave < 5000) return;
  _lastWatchSave = now;
  _saveWatchEntry(stream, t);
}

// ─── ビューワーの URL 同期・共有 ─────────────────────────────────────────────

let _svUrlTimer = null; // 視聴中に再生位置を URL へ定期反映するタイマー

function _svCurrentTime(fallback = 0) {
  const players = [_svPlayer, _miniPlayer];
  for (const player of players) {
    try {
      const value = player?.getCurrentTime?.();
      if (Number.isFinite(value)) return Math.max(0, Math.floor(value));
    } catch (_) {}
  }
  return Math.max(0, Math.floor(Number(fallback) || 0));
}

function _svBuildShareUrl(id, t = 0, options = {}) {
  if (!id) return '';
  const current = readUrlState();
  const params = new URLSearchParams();
  const channel = current.channel || state.channel;
  if (channel && channel !== 'new') params.set('ch', channel);
  params.set('v', id);
  if (options.includeTime !== false && t > 5) params.set('t', String(Math.floor(t)));
  return `${location.origin}${location.pathname}?${params}`;
}

/** ビューワーの表示状態を URL の ?v= / ?t= に反映する。
 *  視聴中は 5 秒ごとに再生位置も更新するため、リロードしても続きから再生できる */
function _svUpdateUrl() {
  const viewer = $('#stream-viewer');
  const open = viewer && !viewer.hidden && !_svIsDocked(viewer);
  const id = open && viewer._currentStream?.url ? youtubeVideoId(viewer._currentStream.url) : '';
  const t = id ? _svCurrentTime(readUrlState().t) : 0;
  writeUrlState({ v: id || '', t: t > 5 ? t : 0 }, { replace: true });
  if (id) _saveWatchEntry(viewer._currentStream, t); // 視聴履歴（続きから見る）
  if (id && !_svUrlTimer) _svUrlTimer = setInterval(_svUpdateUrl, 5000);
  if (!id && _svUrlTimer) { clearInterval(_svUrlTimer); _svUrlTimer = null; }
}

/** 現在の動画・再生位置の共有 URL を生成 */
function _svShareUrl() {
  const viewer = $('#stream-viewer');
  const stream = viewer?._currentStream;
  if (!stream?.url) return null;
  const id = youtubeVideoId(stream.url);
  if (!id) return null;
  const t = _svCurrentTime(readUrlState().t);
  return { url: _svBuildShareUrl(id, t), title: stream.title || '' };
}

// ─── 共有モーダル ────────────────────────────────────────────────────────────

function _svInitShareModal() {
  if ($('#sv-share-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'sv-share-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="sv-share-backdrop"></div>
    <div class="sv-share-dialog" role="dialog" aria-modal="true" aria-label="動画を共有">
      <div class="sv-share-head">
        <span class="sv-share-head-icon">♡</span>
        <span class="sv-share-head-title">この歌枠をおすそわけ</span>
        <button class="sv-share-close" id="sv-share-close" type="button" aria-label="閉じる">✕</button>
      </div>
      <div class="sv-share-charm" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="sv-share-video">
        <span class="sv-share-video-icon">♪</span>
        <span class="sv-share-video-title" id="sv-share-video-title"></span>
      </div>
      <label class="sv-share-ts" id="sv-share-ts-row">
        <input type="checkbox" id="sv-share-ts-check">
        <span class="sv-share-ts-toggle" aria-hidden="true"></span>
        <span class="sv-share-ts-text"><strong id="sv-share-ts-label">0:00</strong> から聴いてもらう</span>
      </label>
      <div class="sv-share-url-row">
        <input class="sv-share-url" id="sv-share-url" type="text" readonly aria-label="共有リンク">
        <button class="sv-share-copy" id="sv-share-copy" type="button">リンクをコピー</button>
      </div>
      <div class="sv-share-sns">
        <a class="sv-share-sns-btn sv-share-x" id="sv-share-x" href="#" target="_blank" rel="noopener">Xにのせる</a>
        <a class="sv-share-sns-btn sv-share-line" id="sv-share-line" href="#" target="_blank" rel="noopener">LINEで送る</a>
        <button class="sv-share-sns-btn sv-share-native" id="sv-share-native" type="button" hidden>ほかにも共有</button>
      </div>
      <div class="sv-share-foot">好きなところから、そっと届けられます</div>
    </div>`;
  document.body.appendChild(modal);

  const close = () => { modal.hidden = true; };
  modal.querySelector('.sv-share-backdrop').addEventListener('click', close);
  $('#sv-share-close').addEventListener('click', close);
  // Esc は capture で先取りし、ビューワー側の Esc 処理（閉じる）を抑止する
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }, { capture: true });

  const rebuild = () => {
    const st = modal._shareState;
    if (!st) return;
    const useT = $('#sv-share-ts-check')?.checked && st.t > 0;
    const url = _svBuildShareUrl(st.id, st.t, { includeTime: useT });
    const input = $('#sv-share-url');
    if (input) input.value = url;
    const text = st.title ? `${st.title}` : '茨むあん 歌唱データベース';
    const x = $('#sv-share-x');
    if (x) x.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    const line = $('#sv-share-line');
    if (line) line.href = `https://line.me/R/share?text=${encodeURIComponent(`${text}\n${url}`)}`;
    return url;
  };
  $('#sv-share-ts-check').addEventListener('change', rebuild);
  modal._rebuild = rebuild;

  $('#sv-share-url').addEventListener('focus', (e) => e.target.select());

  $('#sv-share-copy').addEventListener('click', async () => {
    const url = $('#sv-share-url')?.value;
    if (!url) return;
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; }
    catch (_) {
      try {
        const input = $('#sv-share-url');
        input.select();
        ok = document.execCommand('copy');
      } catch (_) {}
    }
    const btn = $('#sv-share-copy');
    if (btn) {
      btn.textContent = ok ? 'コピーできました' : 'コピーできません';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'リンクをコピー'; btn.classList.remove('copied'); }, 1600);
    }
  });

  const nativeBtn = $('#sv-share-native');
  if (navigator.share && nativeBtn) {
    nativeBtn.hidden = false;
    nativeBtn.addEventListener('click', async () => {
      const st = modal._shareState;
      const url = $('#sv-share-url')?.value;
      if (!url) return;
      try { await navigator.share({ title: st?.title || '', url }); } catch (_) {}
    });
  }
}

/** 共有モーダルを開く */
function _svOpenShareModal() {
  const viewer = $('#stream-viewer');
  const stream = viewer?._currentStream;
  if (!stream?.url) return;
  const id = youtubeVideoId(stream.url);
  if (!id) return;
  _svInitShareModal();
  const modal = $('#sv-share-modal');
  const t = _svCurrentTime(readUrlState().t);
  modal._shareState = { id, t, title: stream.title || '' };

  const titleEl = $('#sv-share-video-title');
  if (titleEl) titleEl.textContent = stream.title || '(タイトルなし)';
  const tsRow = $('#sv-share-ts-row');
  const tsCheck = $('#sv-share-ts-check');
  const tsLabel = $('#sv-share-ts-label');
  if (tsRow) tsRow.hidden = t <= 5;
  if (tsCheck) tsCheck.checked = t > 5;
  if (tsLabel) tsLabel.textContent = _fmtTs(t);

  modal._rebuild?.();
  modal.hidden = false;
}

// モジュール読み込み時に共有プレイリストパラメータを退避（URL 正規化で消える前に）
const _sharedPlParam = new URLSearchParams(location.search).get('pl');

/** URL の ?pl= から共有プレイリストを取り込む */
async function _maybeImportSharedPlaylist() {
  if (!_sharedPlParam) return;
  let payload = null;
  try {
    const b64 = _sharedPlParam.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch (_) { return; }
  if (!payload || typeof payload.n !== 'string' || !Array.isArray(payload.s)) return;
  const name = payload.n.slice(0, 60) || '共有プレイリスト';
  const items = payload.s.filter(k => typeof k === 'string' && k.length < 100).slice(0, 300);
  if (!items.length) return;
  if (!confirm(`共有されたプレイリスト「${name}」（${items.length}件）を取り込みますか？`)) {
    writeUrlState({}, { replace: true }); // pl パラメータを除去
    return;
  }
  try {
    const m = await import('./views/playlists.js');
    const pl = m.createPlaylist(name);
    for (const k of items) m.addStreamToPlaylist(pl.id, k);
    writeUrlState({ tab: 'playlists' }, { replace: true });
    activateTab('playlists', { updateUrl: false });
  } catch (_) {}
}

/** URL の ?v= から配信/MV を探して開く（初回ロード時のディープリンク） */
async function _maybeOpenSharedVideo() {
  const url = readUrlState();
  if (!url.v) return false;
  const v = url.v;
  const t = url.t;

  // 配信データから探す（全チャンネル横断）
  try { await ensureFullData(); } catch (_) {}
  const dsets = [];
  if (state.channelData?.combined) dsets.push(state.channelData.combined);
  Object.values(state.channelData?.channels || {}).forEach(d => { if (d) dsets.push(d); });
  for (const ds of dsets) {
    const found = (ds.streams || []).find(s => youtubeVideoId(s.url) === v);
    if (found) { openStreamViewer(found, t); return true; }
  }

  // MV（music.json）から探す
  try {
    const res = await fetch('data/music.json');
    const music = await res.json();
    const mv = (music?.videos || []).find(m => youtubeVideoId(m.url) === v);
    if (mv) { openStreamViewer({ url: mv.url, title: mv.title, isMv: true }, t); return true; }
  } catch (_) {}

  // データに無い動画でも MV モードで再生
  openStreamViewer({ url: `https://www.youtube.com/watch?v=${v}`, title: '', isMv: true }, t);
  return true;
}

// ─── YouTube IFrame API ───────────────────────────────────────────────────────

function playYouTubeInline(url, startAt = 0, streamTitle = '') {
  const id = youtubeVideoId(url);
  if (!id) return;
  if (window.matchMedia('(max-width: 600px)').matches) {
    window.open(String(url || ''), '_blank', 'noopener');
    return;
  }

  // 埋め込みモードでビューワーが開いていたら、ミニプレイヤーへの引き継ぎなしで閉じる
  {
    const svViewer = $('#stream-viewer');
    if (svViewer && !svViewer.hidden && !_svFullscreen) {
      if (_svIsDocked(svViewer)) {
        _svDiscardMini();
      } else {
        ++_svGen;
        svViewer.hidden = true;
        svViewer._currentStream = null;
        _svPlayer = null;
        const wrap = $('#sv-player-wrap');
        if (wrap) wrap.innerHTML = '';
        document.body.style.overflow = '';
        _svLastStream = null;
        _pendingTabOptions = {};
        hidePlayerPanel();
        _svUpdateUrl();
      }
    }
  }

  _loadYtApi();
  initYouTubePlayer();
  const container = $('#yt-player-container');
  const panel = $('#yt-player-panel');
  if (!container || !panel) return;

  // 前のミニプレイヤーを破棄
  _miniDestroyPlayer();

  // UI 更新
  const titleEl = $('#yt-mini-title');
  if (titleEl) titleEl.textContent = streamTitle || 'インライン再生';
  const hintEl = $('#yt-mini-hint');
  if (hintEl) hintEl.textContent = _svLastStream ? '▲ タップして配信ビューワーへ戻る' : '';
  panel.classList.toggle('has-stream', !!_svLastStream);
  panel.hidden = false;

  // YT.Player を生成（API 準備完了後）
  _onYtReady(() => {
    const playerDiv = document.createElement('div');
    container.appendChild(playerDiv);
    try {
      _miniPlayer = new window.YT.Player(playerDiv, {
        videoId: id,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          ...(startAt > 0 ? { start: Math.floor(startAt) } : {}),
        },
        events: {
          onReady: (event) => {
            const v = _storedVol();
            try { event.target.setVolume(v); } catch (_) {}
            _applyVol($('#yt-mini-vol-slider'), $('#yt-mini-vol-btn'), null, v);
            if (startAt > 5) { try { event.target.seekTo(startAt, true); } catch (_) {} }
            _miniStartProgress();
          },
          onStateChange: (event) => {
            const isPlaying = event.data === window.YT.PlayerState.PLAYING;
            const playBtn = $('#yt-mini-play');
            if (playBtn) playBtn.setAttribute('data-playing', isPlaying ? '1' : '0');
          },
        },
      });
    } catch (_) {
      // フォールバック: iframe
      const startParam = startAt > 0 ? `&start=${Math.floor(startAt)}` : '';
      container.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1${startParam}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`;
    }
  });
}

function initYouTubePlayer() {
  if ($('#yt-player-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'yt-player-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="yt-mini-video-wrap">
      <div id="yt-player-container"></div>
    </div>
    <div class="yt-mini-progress-wrap">
      <div class="yt-mini-progress-bar" id="yt-mini-progress-bar" title="クリックでシーク">
        <div class="yt-mini-progress-fill" id="yt-mini-progress-fill"></div>
      </div>
    </div>
    <div class="yt-mini-bar">
      <button class="yt-mini-play-btn" id="yt-mini-play" type="button" data-playing="0" aria-label="再生/停止"></button>
      <button class="yt-mini-info yt-mini-restore" id="yt-mini-restore" type="button" aria-label="配信ビューワーへ戻る">
        <span class="yt-mini-stream-title" id="yt-mini-title">インライン再生</span>
        <span class="yt-mini-hint" id="yt-mini-hint"></span>
      </button>
      <div class="yt-mini-vol-wrap">
        <button class="vol-btn" id="yt-mini-vol-btn" type="button" aria-label="音量">🔊</button>
        <input class="vol-slider" id="yt-mini-vol-slider" type="range" min="0" max="100" value="100" aria-label="音量">
      </div>
      <button id="yt-player-close" type="button" class="yt-mini-close-btn" aria-label="閉じる">✕</button>
    </div>
  `;
  document.body.appendChild(panel);

  // 閉じる
  $('#yt-player-close').addEventListener('click', () => {
    panel.hidden = true;
    if (_svDiscardMini()) return;
    _miniDestroyPlayer();
    _svLastStream = null;
  });

  // 再生 / 停止トグル
  $('#yt-mini-play').addEventListener('click', () => {
    if (!_miniPlayer) return;
    try {
      const st = _miniPlayer.getPlayerState?.();
      if (st === window.YT?.PlayerState?.PLAYING) { _miniPlayer.pauseVideo(); }
      else { _miniPlayer.playVideo(); }
    } catch (_) {}
  });

  // タイトルバークリック → 配信ビューワーへ戻る
  $('#yt-mini-restore').addEventListener('click', () => {
    if (_svUnminify()) return; // ミニ化中 → そのまま復帰（リロードなし）
    if (!_svLastStream) return;
    openStreamViewer(_svLastStream, _miniResumeAt());
  });

  // プログレスバークリック → シーク
  $('#yt-mini-progress-bar').addEventListener('click', (e) => {
    if (!_miniPlayer) return;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    try {
      const dur = _miniPlayer.getDuration?.() || 0;
      if (dur > 0) _miniPlayer.seekTo(pct * dur, true);
    } catch (_) {}
  });

  // 音量
  const miniVolSlider = $('#yt-mini-vol-slider');
  const miniVolBtn    = $('#yt-mini-vol-btn');
  if (miniVolSlider) {
    const v0 = _storedVol();
    miniVolSlider.value = v0;
    miniVolSlider.style.setProperty('--pct', `${v0}%`);
    if (miniVolBtn) miniVolBtn.textContent = _volIcon(v0);
    miniVolSlider.addEventListener('input', e => {
      const v = parseInt(e.target.value);
      e.target.style.setProperty('--pct', `${v}%`);
      _saveVol(v);
      if (miniVolBtn) miniVolBtn.textContent = _volIcon(v);
      if (_miniPlayer) try { _miniPlayer.setVolume(v); } catch (_) {}
    });
  }
  if (miniVolBtn) {
    let _preMute = 80;
    miniVolBtn.addEventListener('click', () => {
      if (!miniVolSlider) return;
      const cur = parseInt(miniVolSlider.value);
      const newV = cur > 0 ? 0 : (_preMute || 80);
      if (cur > 0) _preMute = cur;
      _applyVol(miniVolSlider, miniVolBtn, _miniPlayer, newV);
    });
  }
}

// ─── YouTube IFrame API ───────────────────────────────────────────────────────

let _ytApiReady = false;
const _ytApiQueue = [];

window.onYouTubeIframeAPIReady = () => {
  _ytApiReady = true;
  _ytApiQueue.splice(0).forEach(fn => fn());
  // 音楽プレイヤーモジュールに YT API 準備完了を通知
  import('./music-player.js').then(m => m.notifyYtReady()).catch(() => {});
};

function _loadYtApi() {
  if (document.getElementById('yt-iframe-api-script')) return;
  const s = document.createElement('script');
  s.id = 'yt-iframe-api-script';
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(s);
}

function _onYtReady(fn) {
  if (_ytApiReady && window.YT?.Player) { fn(); return; }
  _ytApiQueue.push(fn);
}

// ─── Stream Viewer ────────────────────────────────────────────────────────────

const _storedVol = () => Math.max(0, Math.min(100, parseInt(localStorage.getItem('ibaraVol') ?? '100') || 100));
const _saveVol   = v  => localStorage.setItem('ibaraVol', String(v));
const _volIcon   = v  => v === 0 ? '🔇' : v < 50 ? '🔉' : '🔊';

function _applyVol(slider, btn, player, v) {
  if (slider) { slider.value = v; slider.style.setProperty('--pct', `${v}%`); }
  if (btn) btn.textContent = _volIcon(v);
  if (player) try { player.setVolume(v); } catch (_) {}
}

let _svPlayer = null;
let _svGen = 0;
let _svLastStream = null;     // stream currently loaded in mini player
let _svMiniStartAt = 0;       // seconds into video when mini player started
let _svMiniStartWallTime = 0; // Date.now() when mini player started
let _svFullscreen = false;    // stream viewer が全画面モードか
let _epPrevTab = 'timeline';  // 埋め込みプレイヤーを開く前のタブ
let _pendingTabOptions = {};  // activateTab → closeStreamViewer → hidePlayerPanel に引き継ぐ options
/** @type {Object<number, Array<{timeSeconds: number, note: string|null}>>} */
let _svCommunityTs = {};      // songIndex → 承認済みコミュニティタイムスタンプ
let _svAutoPlay = false;      // 連続再生フラグ
let _svRepeat = false;        // ビューワーのリピート再生フラグ
let _miniPlayer = null;           // ミニプレイヤーの YT.Player インスタンス
let _miniProgressInterval = null; // 進捗バー更新タイマー
let _svEndedWatchInterval = null;

/** 埋め込みプレイヤーパネルを表示（タブバーの active はリセット） */
function showPlayerPanel() {
  _epPrevTab = state.activeTab || 'timeline';
  state.activeTab = 'player';
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-player'));
}

/** 前のタブに戻る */
function hidePlayerPanel() {
  const opts = _pendingTabOptions;
  _pendingTabOptions = {};
  activateTab(_epPrevTab || 'timeline', opts);
}

/** 埋め込み → 全画面に切り替え
 *  DOM を移動すると iframe がリロードされ再生位置がリセットされるため、
 *  DOM は動かさず body クラスで .container の stacking context を解除して
 *  position:fixed が root レベルで機能するようにする */
function enterStreamFullscreen() {
  _svFullscreen = true;
  const viewer = $('#stream-viewer');
  if (!viewer) return;
  viewer.classList.add('sv-fullscreen');
  document.body.classList.add('has-sv-fullscreen');
  document.body.style.overflow = 'hidden';
  const closeBtn = $('#sv-close');
  if (closeBtn) closeBtn.title = '通常表示に戻る（Esc）';
  const fsBtn = $('#sv-fullscreen-btn');
  if (fsBtn) fsBtn.setAttribute('aria-pressed', 'true');
}

function _fmtTs(sec) {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${m}:${String(ss).padStart(2, '0')}`;
}

function _svTsKey(stream) {
  return `ibara-ts-${stream.channel || ''}-${stream.index || ''}`;
}

function _svLoadTs(stream) {
  try { return JSON.parse(localStorage.getItem(_svTsKey(stream)) || 'null') || {}; }
  catch (_) { return {}; }
}

function _svSaveTs(stream, ts) {
  try { localStorage.setItem(_svTsKey(stream), JSON.stringify(ts)); }
  catch (_) { /* quota */ }
}

function _svSongRow(song, i, ts) {
  const time = ts[i];
  const badge = time != null
    ? `<button class="sv-ts-badge" data-idx="${i}" data-action="seek" title="${escapeHtml(_fmtTs(time))} に移動">${escapeHtml(_fmtTs(time))}</button><button class="sv-ts-del" data-idx="${i}" data-action="del-ts" aria-label="タイムスタンプ削除">✕</button>`
    : '';
  // コミュニティタイムスタンプ（承認済み）
  const ctsItems = _svCommunityTs[i] || [];
  const ctsBadges = ctsItems.map(ct =>
    `<button class="sv-cts-badge" data-idx="${i}" data-action="cts-seek" data-cts-seconds="${ct.timeSeconds}" title="みんなのタイムスタンプ: ${escapeHtml(_fmtTs(ct.timeSeconds))}">${escapeHtml(_fmtTs(ct.timeSeconds))}</button>`
  ).join('');
  const proposeBtn = `<button class="sv-cts-propose" data-idx="${i}" data-action="cts-propose" type="button">+ 提案</button>`;
  const ctsRow = `<div class="sv-cts-row">${ctsBadges}${proposeBtn}</div>`;
  return `<div class="sv-song" data-idx="${i}">
    <span class="sv-song-num">${i + 1}</span>
    <div class="sv-song-info">
      <span class="sv-song-title">${escapeHtml(song.title)}</span>
      <span class="sv-song-artist">${escapeHtml(song.artist)}</span>
    </div>
    <div class="sv-song-actions">${badge}<button class="sv-ts-set" data-idx="${i}" data-action="set-ts" title="現在の再生時刻をタイムスタンプに記録">⏱ メモ</button></div>
    ${ctsRow}
  </div>`;
}

/**
 * 特定の配信枠の承認済みコミュニティタイムスタンプを取得し _svCommunityTs に格納する。
 * 取得後に sv-setlist を再描画する。
 *
 * @param {object} stream
 */
async function _svLoadCommunityTs(stream) {
  _svCommunityTs = {};
  if (!stream?.channel || stream?.index == null) return;
  try {
    const url = `/api/timestamps/${encodeURIComponent(stream.channel)}/${stream.index}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    for (const item of (data.items || [])) {
      if (!_svCommunityTs[item.songIndex]) _svCommunityTs[item.songIndex] = [];
      _svCommunityTs[item.songIndex].push({ timeSeconds: item.timeSeconds, note: item.note ?? null });
    }
  } catch (_) { /* ネットワークエラーは無視 */ }
  // 再描画（stream-viewer が同じ配信のままの場合のみ）
  const el = $('#stream-viewer');
  if (!el || el._currentStream !== stream) return;
  const setlistEl = $('#sv-setlist');
  if (setlistEl) _svRefreshSetlist(setlistEl, stream.songs, _svLoadTs(stream));
  _svUpdateBulkBtn(stream);
}

/**
 * コミュニティタイムスタンプを提案するモーダルを表示する。
 *
 * @param {object} stream
 * @param {number} songIdx
 * @param {string} songTitle
 */
function _svShowProposeModal(stream, songIdx, songTitle) {
  // 既存モーダルがあれば除去
  $('#sv-cts-modal')?.remove();

  const currentTime = _svPlayer?.getCurrentTime?.() ?? 0;
  const defaultTime = _fmtTs(Math.floor(currentTime));

  const modal = document.createElement('div');
  modal.id = 'sv-cts-modal';
  modal.className = 'sv-cts-modal-overlay';
  modal.innerHTML = `
    <div class="sv-cts-modal-box" role="dialog" aria-modal="true" aria-label="タイムスタンプを提案">
      <div class="sv-cts-modal-head">
        <span class="sv-cts-modal-title">タイムスタンプを提案</span>
        <button class="sv-cts-modal-close" type="button" aria-label="閉じる">✕</button>
      </div>
      <p class="sv-cts-modal-song">${escapeHtml(songTitle)}</p>
      <label class="sv-cts-modal-label">
        タイムスタンプ（MM:SS または H:MM:SS）
        <input class="sv-cts-modal-input" id="sv-cts-ts-input" type="text" value="${escapeHtml(defaultTime)}" placeholder="0:00" autocomplete="off">
      </label>
      <label class="sv-cts-modal-label">
        コメント（任意・200文字以内）
        <input class="sv-cts-modal-input" id="sv-cts-note-input" type="text" maxlength="200" placeholder="">
      </label>
      <p class="sv-cts-modal-hint">提案は管理者の審査後に公開されます。</p>
      <div class="sv-cts-modal-btns">
        <button class="sv-cts-modal-submit" id="sv-cts-submit" type="button">提案する</button>
        <button class="sv-cts-modal-cancel" type="button">キャンセル</button>
      </div>
      <p class="sv-cts-modal-status" id="sv-cts-status" hidden></p>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.sv-cts-modal-close').addEventListener('click', close);
  modal.querySelector('.sv-cts-modal-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  modal.querySelector('#sv-cts-submit').addEventListener('click', async () => {
    const tsStr = modal.querySelector('#sv-cts-ts-input').value.trim();
    const note  = modal.querySelector('#sv-cts-note-input').value.trim() || null;
    const parsedSec = _parseTs(tsStr);
    const statusEl = modal.querySelector('#sv-cts-status');
    if (parsedSec === null) {
      statusEl.textContent = 'タイムスタンプの形式が正しくありません（例: 1:23 または 1:23:45）';
      statusEl.className = 'sv-cts-modal-status error';
      statusEl.hidden = false;
      return;
    }
    const submitBtn = modal.querySelector('#sv-cts-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中…';
    try {
      const res = await fetch(`/api/timestamps/${encodeURIComponent(stream.channel)}/${stream.index}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songIndex:     songIdx,
          timeSeconds:   parsedSec,
          submitterNote: note,
        }),
      });
      if (res.ok) {
        statusEl.textContent = '提案を送信しました！審査後に公開されます。';
        statusEl.className = 'sv-cts-modal-status success';
        statusEl.hidden = false;
        submitBtn.hidden = true;
        modal.querySelector('.sv-cts-modal-cancel').textContent = '閉じる';
      } else {
        const body = await res.json().catch(() => ({}));
        statusEl.textContent = `送信に失敗しました: ${body.error || res.statusText}`;
        statusEl.className = 'sv-cts-modal-status error';
        statusEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = '提案する';
      }
    } catch (err) {
      statusEl.textContent = `送信に失敗しました: ${err.message}`;
      statusEl.className = 'sv-cts-modal-status error';
      statusEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = '提案する';
    }
  });

  // フォーカス
  setTimeout(() => modal.querySelector('#sv-cts-ts-input')?.focus(), 50);
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
}

// ─── Bulk community timestamp proposal ───────────────────────────────────────

/** セトリ登録ボタンのテキスト・表示状態を更新する */
function _svUpdateBulkBtn(stream) {
  const btn = $('#sv-cts-bulk-btn');
  if (!btn || !stream?.songs?.length) return;
  const registeredCount = Object.keys(_svCommunityTs).length;
  const allRegistered   = registeredCount >= stream.songs.length;
  btn.textContent = allRegistered ? '修正申請' : 'セトリ登録';
  btn.hidden = false;
}

/** 全曲まとめてタイムスタンプを申請するモーダルを表示する */
function _svShowBulkProposeModal(stream) {
  $('#sv-bulk-modal')?.remove();

  const localTs = _svLoadTs(stream); // 一括入力で保存済みのタイムスタンプ
  const registeredCount = Object.keys(_svCommunityTs).length;
  const allRegistered   = registeredCount >= stream.songs.length;
  const isRevise = allRegistered;

  const rows = stream.songs.map((song, idx) => {
    const localVal = localTs[idx] != null ? _fmtTs(localTs[idx]) : '';
    const communityVal = _svCommunityTs[idx]?.[0]?.timeSeconds != null
      ? _fmtTs(_svCommunityTs[idx][0].timeSeconds) : '';
    const prefill = localVal || communityVal;
    return `
      <div class="sv-bulk-row" data-idx="${idx}">
        <span class="sv-bulk-num">${idx + 1}</span>
        <span class="sv-bulk-title" title="${escapeHtml(song.title)}">${escapeHtml(song.title)}</span>
        <input class="sv-bulk-ts-input" type="text" value="${escapeHtml(prefill)}"
          placeholder="0:00" autocomplete="off" data-bulk-ts-idx="${idx}">
        <button class="sv-bulk-ts-now" type="button" title="現在時刻を入力" data-bulk-now="${idx}">⏱</button>
      </div>`;
  }).join('');

  const modal = document.createElement('div');
  modal.id = 'sv-bulk-modal';
  modal.className = 'sv-cts-modal-overlay';
  modal.innerHTML = `
    <div class="sv-cts-modal-box sv-bulk-modal-box" role="dialog" aria-modal="true"
      aria-label="${isRevise ? '修正申請' : 'セトリ登録'}">
      <div class="sv-cts-modal-head">
        <span class="sv-cts-modal-title">${isRevise ? '修正申請' : 'セトリ登録'}</span>
        <button class="sv-cts-modal-close" type="button" aria-label="閉じる">✕</button>
      </div>
      <details class="sv-paste-area">
        <summary class="sv-paste-summary">配信コメントから一括入力</summary>
        <textarea class="sv-paste-textarea" placeholder="配信のタイムスタンプコメントを貼り付け&#10;例: 23:16　微かなカオリ / Perfume　27:58"></textarea>
        <div class="sv-paste-btns">
          <button class="sv-paste-apply btn ghost" type="button">解析して入力</button>
          <span class="sv-paste-result" hidden></span>
        </div>
      </details>
      <p class="sv-bulk-hint">タイムスタンプを入力して一括申請できます。空欄の曲はスキップされます。</p>
      <div class="sv-bulk-rows">${rows}</div>
      <label class="sv-cts-modal-label" style="margin-top:10px">
        共通コメント（任意・200文字以内）
        <input class="sv-cts-modal-input" id="sv-bulk-note" type="text" maxlength="200" placeholder="">
      </label>
      <p class="sv-cts-modal-hint">提案は管理者の審査後に公開されます。</p>
      <div class="sv-cts-modal-btns">
        <button class="sv-cts-modal-submit" id="sv-bulk-submit" type="button">一括申請する</button>
        <button class="sv-cts-modal-cancel" type="button">キャンセル</button>
      </div>
      <p class="sv-cts-modal-status" id="sv-bulk-status" hidden></p>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.sv-cts-modal-close').addEventListener('click', close);
  modal.querySelector('.sv-cts-modal-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  // 配信コメント貼り付け → タイムスタンプ一括入力
  modal.querySelector('.sv-paste-apply').addEventListener('click', () => {
    const text = modal.querySelector('.sv-paste-textarea')?.value || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let matched = 0;
    for (const line of lines) {
      const parsed = _parseTsCommentLine(line);
      if (!parsed) continue;
      const idx = _matchSongIdx(parsed.title, parsed.artist, stream.songs);
      if (idx >= 0) {
        const input = modal.querySelector(`[data-bulk-ts-idx="${idx}"]`);
        if (input) { input.value = parsed.start; matched++; }
      }
    }
    const result = modal.querySelector('.sv-paste-result');
    if (result) {
      result.textContent = matched > 0
        ? `${lines.length}行を解析 → ${matched}曲に入力しました`
        : '一致する曲が見つかりませんでした';
      result.hidden = false;
    }
  });

  // ⏱ ボタン：現在時刻を入力欄にセット
  modal.querySelector('.sv-bulk-rows').addEventListener('click', e => {
    const btn = e.target.closest('[data-bulk-now]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.bulkNow, 10);
    const time = _svPlayer?.getCurrentTime?.();
    if (time != null) {
      const input = modal.querySelector(`[data-bulk-ts-idx="${idx}"]`);
      if (input) input.value = _fmtTs(Math.floor(time));
    }
  });

  modal.querySelector('#sv-bulk-submit').addEventListener('click', async () => {
    const note = modal.querySelector('#sv-bulk-note').value.trim() || null;
    const statusEl = modal.querySelector('#sv-bulk-status');
    const submitBtn = modal.querySelector('#sv-bulk-submit');

    // 入力値を収集
    const entries = [];
    modal.querySelectorAll('[data-bulk-ts-idx]').forEach(input => {
      const idx = parseInt(input.dataset.bulkTsIdx, 10);
      const sec = _parseTs(input.value.trim());
      if (sec !== null) entries.push({ songIndex: idx, timeSeconds: sec });
    });

    if (!entries.length) {
      statusEl.textContent = 'タイムスタンプが1つも入力されていません';
      statusEl.className = 'sv-cts-modal-status error';
      statusEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = `申請中… (0/${entries.length})`;
    statusEl.hidden = true;

    let succeeded = 0;
    let failed = 0;
    await Promise.all(entries.map(async entry => {
      try {
        const res = await fetch(
          `/api/timestamps/${encodeURIComponent(stream.channel)}/${stream.index}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songIndex: entry.songIndex, timeSeconds: entry.timeSeconds, submitterNote: note }),
          }
        );
        if (res.ok) succeeded++; else failed++;
      } catch (_) { failed++; }
      submitBtn.textContent = `申請中… (${succeeded + failed}/${entries.length})`;
    }));

    if (failed === 0) {
      statusEl.textContent = `${succeeded}曲分のタイムスタンプを申請しました！審査後に公開されます。`;
      statusEl.className = 'sv-cts-modal-status success';
      submitBtn.hidden = true;
      modal.querySelector('.sv-cts-modal-cancel').textContent = '閉じる';
    } else {
      statusEl.textContent = `${succeeded}件成功 / ${failed}件失敗。失敗分を再試行してください。`;
      statusEl.className = 'sv-cts-modal-status error';
      submitBtn.disabled = false;
      submitBtn.textContent = '一括申請する';
    }
    statusEl.hidden = false;
  });

  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
}

// ─── Below-Player: Playlist helpers ──────────────────────────────────────────

function _getPlaylists() {
  try { return JSON.parse(localStorage.getItem('ibara-playlists') || 'null') || []; }
  catch (_) { return []; }
}

function _savePlaylists(pls) {
  try { localStorage.setItem('ibara-playlists', JSON.stringify(pls)); } catch (_) {}
}

function _addStreamToPlaylist(playlistId, skey) {
  const pls = _getPlaylists();
  const pl = pls.find(p => String(p.id) === String(playlistId));
  if (!pl) return false;
  if (!pl.streams) pl.streams = [];
  if (!pl.streams.includes(skey)) { pl.streams.push(skey); _savePlaylists(pls); }
  return true;
}

/** 連続再生: 現在より1つ古い配信（配列の次のインデックス）を開く */
function _svPlayNext() {
  const streams = state.data?.streams || [];
  const viewer = $('#stream-viewer');
  const stream = viewer?._currentStream;
  if (!stream) return;
  const idx = streams.findIndex(s => s.channel === stream.channel && s.index === stream.index);
  if (idx < 0 || idx >= streams.length - 1) return;
  openStreamViewer(streams[idx + 1]);
}

async function _svPlayNextMv(stream) {
  const videos = await _mvFetchVideos();
  const curId = youtubeVideoId(stream?.url);
  if (!curId || !videos.length) return;
  const idx = videos.findIndex(v => youtubeVideoId(v.url) === curId);
  if (idx < 0 || idx >= videos.length - 1) return;
  const next = videos[idx + 1];
  openStreamViewer({ ...next, isMv: true });
}

function _svHandleEnded(viewer) {
  if (!viewer || _svIsDocked(viewer)) return;
  const player = _svPlayer || _miniPlayer;
  if (_svRepeat && player) {
    try { player.seekTo(0, true); player.playVideo(); } catch (_) {}
    return;
  }
  if (!_svAutoPlay) return;
  const stream = viewer._currentStream;
  if (stream?.isMv) _svPlayNextMv(stream);
  else _svPlayNext();
}

function _svStopEndedWatch() {
  if (_svEndedWatchInterval) {
    clearInterval(_svEndedWatchInterval);
    _svEndedWatchInterval = null;
  }
}

function _svStartEndedWatch(gen, viewer) {
  _svStopEndedWatch();
  let seenEnded = false;
  _svEndedWatchInterval = setInterval(() => {
    if (gen !== _svGen || viewer.hidden || !_svPlayer) {
      _svStopEndedWatch();
      return;
    }
    try {
      const st = _svPlayer.getPlayerState?.();
      if (st === window.YT?.PlayerState?.ENDED) {
        if (!seenEnded) _svHandleEnded(viewer);
        seenEnded = true;
      } else if (st === window.YT?.PlayerState?.PLAYING) {
        seenEnded = false;
      }
    } catch (_) {}
  }, 700);
}

/** プレイヤー下のナビカードHTMLを返す */
function _svNavCard(s, dir) {
  if (!s) {
    const label = dir === 'newer' ? '最新配信' : '最初の配信';
    return `<div class="sv-bp-nav-card sv-bp-nav-empty">${escapeHtml(label)}</div>`;
  }
  const thumb = youtubeThumb(s.url);
  const label = dir === 'newer' ? '新しい配信 →' : '← 古い配信';
  return `<button class="sv-bp-nav-card" type="button" data-bp-action="open-stream" data-bp-channel="${escapeHtml(s.channel)}" data-bp-index="${s.index}">
    <div class="sv-bp-nav-dir">${escapeHtml(label)}</div>
    ${thumb ? `<img class="sv-bp-nav-thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<div class="sv-bp-nav-thumb sv-bp-nav-thumb--empty"></div>'}
    <div class="sv-bp-nav-info">
      <div class="sv-bp-nav-title">${escapeHtml(s.title || '配信')}</div>
      <div class="sv-bp-nav-meta">${fmtDate(s.date)}　${s.songs.length}曲</div>
    </div>
  </button>`;
}

/**
 * プレイヤー下エリアを描画する。
 * 前後ナビ / 連続再生トグル / 配信統計 / 関連配信 / プレイリスト追加
 *
 * @param {object} stream
 */
function _svRenderBelowPlayer(stream) {
  const el = $('#sv-below-player');
  if (!el) return;

  const streams = state.data?.streams || [];
  const idx = streams.findIndex(s => s.channel === stream.channel && s.index === stream.index);

  // streams[0] = 最新, streams[n] = 最古
  // "古い" = idx+1, "新しい" = idx-1
  const olderStream = idx >= 0 && idx < streams.length - 1 ? streams[idx + 1] : null;
  const newerStream = idx > 0 ? streams[idx - 1] : null;

  // 関連配信: 曲かぶりが多い順
  const songTitles = new Set(stream.songs.map(s => s.title));
  const related = streams
    .filter((_, i) => i !== idx)
    .map(s => {
      const shared = s.songs.filter(sg => songTitles.has(sg.title));
      return { stream: s, overlap: shared.length, sharedSongs: shared.slice(0, 3).map(sg => sg.title) };
    })
    .filter(r => r.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 8);

  // プレイリスト
  const playlists = _getPlaylists();
  const skey = streamKey(stream);

  el.innerHTML = `
    <div class="sv-bp-wrap">

      <!-- 連続再生 + 前後ナビ -->
      <div class="sv-bp-section sv-bp-section--nav">
        <div class="sv-bp-autoplay-bar">
          <label class="sv-bp-ap-label" for="sv-ap-check">
            <span class="sv-bp-ap-switch${_svAutoPlay ? ' sv-bp-ap-switch--on' : ''}">
              <input type="checkbox" id="sv-ap-check" class="sv-bp-ap-check"${_svAutoPlay ? ' checked' : ''}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            連続再生
          </label>
          <label class="sv-bp-ap-label" for="sv-repeat-check">
            <span class="sv-bp-ap-switch${_svRepeat ? ' sv-bp-ap-switch--on' : ''}">
              <input type="checkbox" id="sv-repeat-check" class="sv-bp-ap-check"${_svRepeat ? ' checked' : ''}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            リピート
          </label>
          ${olderStream
            ? `<span class="sv-bp-ap-hint">次：${escapeHtml(olderStream.title || '次の配信')}</span>`
            : `<span class="sv-bp-ap-hint sv-bp-ap-hint--end">（最後の配信）</span>`}
        </div>
        <div class="sv-bp-nav-cards">
          ${_svNavCard(olderStream, 'older')}
          ${_svNavCard(newerStream, 'newer')}
        </div>
      </div>

      <!-- 配信統計 -->
      <div class="sv-bp-section">
        <div class="sv-bp-sh">配信情報</div>
        <div class="sv-bp-stats">
          <div class="sv-bp-stat">
            <span class="sv-bp-stat-val">${stream.songs.length}</span>
            <span class="sv-bp-stat-label">曲数</span>
          </div>
          <div class="sv-bp-stat">
            <span class="sv-bp-stat-val">第${stream.index}枠</span>
            <span class="sv-bp-stat-label">配信番号</span>
          </div>
          <div class="sv-bp-stat">
            <span class="sv-bp-stat-val">${fmtDate(stream.date)}</span>
            <span class="sv-bp-stat-label">配信日</span>
          </div>
        </div>
      </div>

      <!-- 関連配信 -->
      ${related.length ? `
      <div class="sv-bp-section">
        <div class="sv-bp-sh">関連配信 <span class="sv-bp-sh-sub">（同じ曲を歌った回）</span></div>
        <div class="sv-bp-related-list">
          ${related.map(r => {
            const rthumb = youtubeThumb(r.stream.url);
            return `<button class="sv-bp-rel-card" type="button" data-bp-action="open-stream" data-bp-channel="${escapeHtml(r.stream.channel)}" data-bp-index="${r.stream.index}">
              ${rthumb ? `<img class="sv-bp-rel-thumb" src="${escapeHtml(rthumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<div class="sv-bp-rel-thumb sv-bp-rel-thumb--empty"></div>'}
              <div class="sv-bp-rel-info">
                <div class="sv-bp-rel-title">${escapeHtml(r.stream.title || '配信')}</div>
                <div class="sv-bp-rel-meta">${fmtDate(r.stream.date)}</div>
                <div class="sv-bp-rel-songs">${r.sharedSongs.map(t => escapeHtml(t)).join('、')}</div>
              </div>
              <div class="sv-bp-rel-badge">${r.overlap}曲</div>
            </button>`;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- プレイリストへ追加 -->
      ${playlists.length ? `
      <div class="sv-bp-section">
        <div class="sv-bp-sh">プレイリストへ追加</div>
        <div class="sv-bp-pl-list" id="sv-bp-pl-list">
          ${playlists.map(pl => {
            const added = (pl.streams || []).includes(skey);
            return `<button class="sv-bp-pl-btn${added ? ' sv-bp-pl-btn--added' : ''}" type="button"
              data-bp-action="add-pl" data-bp-pl-id="${escapeHtml(String(pl.id))}"${added ? ' disabled' : ''}>
              <span class="sv-bp-pl-name">${escapeHtml(pl.name || 'プレイリスト')}</span>
              <span class="sv-bp-pl-status">${added ? '✓ 登録済み' : '＋ 追加'}</span>
            </button>`;
          }).join('')}
        </div>
      </div>
      ` : ''}

    </div>
  `;

  // イベント委譲（el.onXxx で上書きして重複防止）
  el.onchange = (e) => {
    const apCheck = e.target.closest('#sv-ap-check');
    const repeatCheck = e.target.closest('#sv-repeat-check');
    if (apCheck) {
      _svAutoPlay = apCheck.checked;
      const sw = apCheck.closest('.sv-bp-ap-switch');
      if (sw) sw.classList.toggle('sv-bp-ap-switch--on', _svAutoPlay);
    }
    if (repeatCheck) {
      _svRepeat = repeatCheck.checked;
      const sw = repeatCheck.closest('.sv-bp-ap-switch');
      if (sw) sw.classList.toggle('sv-bp-ap-switch--on', _svRepeat);
    }
  };

  el.onclick = (e) => {
    const btn = e.target.closest('[data-bp-action]');
    if (!btn) return;
    const action = btn.dataset.bpAction;

    if (action === 'open-stream') {
      const ch = btn.dataset.bpChannel;
      const targetIdx = parseInt(btn.dataset.bpIndex, 10);
      const target = (state.data?.streams || []).find(s => s.channel === ch && s.index === targetIdx);
      if (target) openStreamViewer(target);
    } else if (action === 'add-pl') {
      const plId = btn.dataset.bpPlId;
      if (_addStreamToPlaylist(plId, skey)) {
        btn.classList.add('sv-bp-pl-btn--added');
        btn.disabled = true;
        const statusEl = btn.querySelector('.sv-bp-pl-status');
        if (statusEl) statusEl.textContent = '✓ 登録済み';
      }
    }
  };
}

// ─── MV モード: プレイヤー下コンテンツ ──────────────────────────────────────

let _mvVideosCache = null; // music.json の動画リストキャッシュ

async function _mvFetchVideos() {
  if (_mvVideosCache) return _mvVideosCache;
  try {
    const res = await fetch('data/music.json');
    _mvVideosCache = (await res.json())?.videos || [];
  } catch (_) {
    _mvVideosCache = [];
  }
  return _mvVideosCache;
}

/** MV タイトルから曲名部分を推定（「MV⌇曲名/歌い手」「【歌ってみた】曲名 / …」等） */
function _mvSongTitleGuess(title) {
  let t = String(title || '');
  t = t.replace(/【[^】]*】/g, ' ');               // 【歌ってみた】等の角括弧
  t = t.replace(/^\s*MV[⌇|｜♪♬:：\-\s]*/i, ' ');  // 先頭の MV⌇
  t = t.split(/[\/／|｜]/)[0];                     // 区切り以降（歌い手名など）を捨てる
  t = t.replace(/歌ってみた|covered?\s*(by.*)?$/gi, ' ');
  return t.trim();
}

/** MV モードのプレイヤー下: 関連歌枠 + ほかの動画 */
async function _svRenderBelowPlayerMv(stream) {
  const el = $('#sv-below-player');
  if (!el) return;

  try { await ensureFullData(); } catch (_) {}
  const videos = await _mvFetchVideos();
  // 描画前に別の動画へ切り替わっていたら何もしない
  if ($('#stream-viewer')?._currentStream !== stream) return;

  // ── 関連歌枠: タイトルから曲名を推定して歌枠を検索 ──
  const streams = state.channelData?.combined?.streams || state.data?.streams || [];
  const guess = _normForMatch(_mvSongTitleGuess(stream.title));
  const related = [];
  if (guess.length > 1) {
    for (const s of streams) {
      const hit = (s.songs || []).find(sg => {
        const n = _normForMatch(sg.title);
        return n === guess || (n.length > 1 && (n.includes(guess) || guess.includes(n)));
      });
      if (hit) related.push({ stream: s, songTitle: hit.title });
    }
  }
  const relatedShown = related.slice(0, 8);

  // ── ほかの動画: 同タイプ優先で最大12件 ──
  const typeLabels = { original: 'オリジナル', office: '公式', character: 'キャラソン', cover: 'カバー' };
  const cur = videos.find(v => v.url === stream.url);
  const others = videos
    .filter(v => v.url !== stream.url)
    .sort((a, b) => {
      const sameA = cur && a.type === cur.type ? 1 : 0;
      const sameB = cur && b.type === cur.type ? 1 : 0;
      if (sameA !== sameB) return sameB - sameA;
      return (b.publishedAt || '').localeCompare(a.publishedAt || '');
    })
    .slice(0, 12);
  const curIdx = videos.findIndex(v => youtubeVideoId(v.url) === youtubeVideoId(stream.url));
  const nextVideo = curIdx >= 0 && curIdx < videos.length - 1 ? videos[curIdx + 1] : null;

  el.innerHTML = `
    <div class="sv-bp-wrap">
      <div class="sv-bp-section sv-bp-section--nav">
        <div class="sv-bp-autoplay-bar">
          <label class="sv-bp-ap-label" for="sv-ap-check">
            <span class="sv-bp-ap-switch${_svAutoPlay ? ' sv-bp-ap-switch--on' : ''}">
              <input type="checkbox" id="sv-ap-check" class="sv-bp-ap-check"${_svAutoPlay ? ' checked' : ''}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            連続再生
          </label>
          <label class="sv-bp-ap-label" for="sv-repeat-check">
            <span class="sv-bp-ap-switch${_svRepeat ? ' sv-bp-ap-switch--on' : ''}">
              <input type="checkbox" id="sv-repeat-check" class="sv-bp-ap-check"${_svRepeat ? ' checked' : ''}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            リピート
          </label>
          ${nextVideo
            ? `<span class="sv-bp-ap-hint">次：${escapeHtml(nextVideo.title || '次の動画')}</span>`
            : `<span class="sv-bp-ap-hint sv-bp-ap-hint--end">（最後の動画）</span>`}
        </div>
      </div>
      ${relatedShown.length ? `
      <div class="sv-bp-section">
        <div class="sv-bp-sh">🎤 この曲が歌われた歌枠 <span class="sv-bp-sh-sub">（全${related.length}回）</span></div>
        <div class="sv-bp-related-list">
          ${relatedShown.map(r => {
            const rthumb = youtubeThumb(r.stream.url);
            return `<button class="sv-bp-rel-card" type="button" data-mv-action="open-stream" data-mv-channel="${escapeHtml(r.stream.channel)}" data-mv-index="${r.stream.index}">
              ${rthumb ? `<img class="sv-bp-rel-thumb" src="${escapeHtml(rthumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<div class="sv-bp-rel-thumb sv-bp-rel-thumb--empty"></div>'}
              <div class="sv-bp-rel-info">
                <div class="sv-bp-rel-title">${escapeHtml(r.stream.title || '配信')}</div>
                <div class="sv-bp-rel-meta">${fmtDate(r.stream.date)}　第${r.stream.index}枠</div>
                <div class="sv-bp-rel-songs">🎵 ${escapeHtml(r.songTitle)}</div>
              </div>
            </button>`;
          }).join('')}
        </div>
      </div>
      ` : ''}

      ${others.length ? `
      <div class="sv-bp-section">
        <div class="sv-bp-sh">🎬 ほかの動画 <button class="sv-mv-all-btn" type="button" data-mv-action="all-videos">すべて見る →</button></div>
        <div class="sv-mv-grid">
          ${others.map(v => {
            const thumb = youtubeThumb(v.url);
            return `<button class="sv-mv-card" type="button" data-mv-action="open-mv" data-mv-url="${escapeHtml(v.url)}" data-mv-title="${escapeHtml(v.title)}">
              ${thumb ? `<img class="sv-mv-card-thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<div class="sv-mv-card-thumb"></div>'}
              <div class="sv-mv-card-body">
                <div class="sv-mv-card-title">${escapeHtml(v.title)}</div>
                <div class="sv-mv-card-type">${typeLabels[v.type] || 'オリジナル'}</div>
              </div>
            </button>`;
          }).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  el.onchange = (e) => {
    const apCheck = e.target.closest('#sv-ap-check');
    const repeatCheck = e.target.closest('#sv-repeat-check');
    if (apCheck) {
      _svAutoPlay = apCheck.checked;
      const sw = apCheck.closest('.sv-bp-ap-switch');
      if (sw) sw.classList.toggle('sv-bp-ap-switch--on', _svAutoPlay);
    }
    if (repeatCheck) {
      _svRepeat = repeatCheck.checked;
      const sw = repeatCheck.closest('.sv-bp-ap-switch');
      if (sw) sw.classList.toggle('sv-bp-ap-switch--on', _svRepeat);
    }
  };

  el.onclick = (e) => {
    const btn = e.target.closest('[data-mv-action]');
    if (!btn) return;
    const action = btn.dataset.mvAction;
    if (action === 'open-stream') {
      const ch = btn.dataset.mvChannel;
      const targetIdx = parseInt(btn.dataset.mvIndex, 10);
      const all = state.channelData?.combined?.streams || state.data?.streams || [];
      const target = all.find(s => s.channel === ch && s.index === targetIdx);
      if (target) openStreamViewer(target);
    } else if (action === 'open-mv') {
      openStreamViewer({ url: btn.dataset.mvUrl, title: btn.dataset.mvTitle, isMv: true });
    } else if (action === 'all-videos') {
      activateTab('playlists');
    }
  };
}

function _svRefreshSetlist(setlistEl, songs, ts) {
  setlistEl.innerHTML = songs.map((s, i) => _svSongRow(s, i, ts)).join('');
}

// タイムスタンプ文字列（MM:SS or H:MM:SS）を秒数に変換
function _parseTs(str) {
  const m = str.match(/(\d+):(\d{2}):(\d{2})|(\d+):(\d{2})/);
  if (!m) return null;
  if (m[1] !== undefined) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
  return parseInt(m[4]) * 60 + parseInt(m[5]);
}

// 配信タイムスタンプコメントの1行をパース
// 形式: "MM:SS　曲名 / アーティスト　MM:SS" または "H:MM:SS　…　H:MM:SS"
function _parseTsCommentLine(line) {
  const m = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)[\s　]+(.+?)\s*\/\s*(.+?)[\s　]+(\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (!m) return null;
  return { start: m[1].trim(), title: m[2].trim(), artist: m[3].trim(), end: m[4].trim() };
}

// 文字列を正規化（大文字小文字・空白・記号を統一）してマッチングに使う
function _normForMatch(s) {
  return (s || '').toLowerCase()
    .replace(/[\s　]/g, '')
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[・｡。、，,．.！!？?「」『』【】（）()]/g, '');
}

// パースした曲名・アーティストでセトリ内のインデックスを探す
function _matchSongIdx(title, artist, songs) {
  const nt = _normForMatch(title);
  const na = _normForMatch(artist);
  let bestIdx = -1, bestScore = 0;
  for (let i = 0; i < songs.length; i++) {
    const st = _normForMatch(songs[i].title);
    const sa = _normForMatch(songs[i].artist);
    let score = 0;
    if (st === nt) score += 80;
    else if (nt.length > 1 && (st.includes(nt) || nt.includes(st))) score += 40;
    if (na && sa === na) score += 20;
    else if (na && na.length > 1 && (sa.includes(na) || na.includes(sa))) score += 10;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestScore >= 40 ? bestIdx : -1;
}

function initStreamViewer() {
  if ($('#stream-viewer')) return;
  const panel = $('#panel-player');
  if (!panel) return;
  const el = document.createElement('div');
  el.id = 'stream-viewer';
  el.hidden = true;
  el.setAttribute('aria-label', '配信プレイヤー');
  el.innerHTML = `
    <div class="sv-container">
      <div class="sv-header">
        <button class="sv-close-btn" id="sv-close" type="button" title="ミニプレイヤーで再生を続けながら戻ります（Esc）">
          ← 戻る <span class="sv-esc-hint">Esc</span>
        </button>
        <div class="sv-title-area">
          <nav class="sv-breadcrumb" aria-label="現在地">
            <button class="sv-bc-btn" type="button" data-bc-tab="dashboard">ホーム</button>
            <span class="sv-bc-sep" aria-hidden="true">/</span>
            <button class="sv-bc-btn" type="button" data-bc-tab="timeline">タイムライン</button>
            <span class="sv-bc-sep" aria-hidden="true">/</span>
            <span class="sv-bc-current" id="sv-bc-title"></span>
          </nav>
          <div class="sv-stream-meta" id="sv-stream-meta"></div>
        </div>
        <button class="sv-fullscreen-btn" id="sv-fullscreen-btn" type="button"
          title="大画面で再生" aria-pressed="false">⛶</button>
        <div class="sv-volume-wrap">
          <button class="vol-btn" id="sv-vol-btn" type="button" aria-label="音量">🔊</button>
          <input class="vol-slider" id="sv-vol-slider" type="range" min="0" max="100" value="100" aria-label="音量">
        </div>
        <button class="sv-music-btn" id="sv-music-btn" type="button" title="現在位置から音楽プレイヤーで聴く">🎵 音楽プレイヤーで聴く</button>
        <button class="sv-share-btn" id="sv-share-btn" type="button" title="この動画の共有リンクをコピー">🔗 共有</button>
        <a class="sv-yt-link" id="sv-yt-link" href="#" target="_blank" rel="noopener">↗ YouTubeで開く</a>
      </div>
      <div class="sv-body">
        <div class="sv-player-section">
          <div class="sv-player-wrap" id="sv-player-wrap">
            <div class="sv-player-loading">読み込み中…</div>
          </div>
          <div class="sv-below-player" id="sv-below-player"></div>
        </div>
        <div class="sv-panel">
          <div class="sv-panel-head">
            <span>セットリスト</span>
            <div class="sv-panel-head-right">
              <button class="sv-import-toggle" id="sv-import-toggle" type="button">一括入力</button>
              <button class="sv-cts-bulk-btn" id="sv-cts-bulk-btn" type="button" hidden>セトリ登録</button>
              <span class="sv-song-count" id="sv-song-count"></span>
            </div>
          </div>
          <div class="sv-import-area" id="sv-import-area" hidden>
            <p class="sv-import-desc">タイムスタンプを1行に1つ入力（上から順に曲へ割り当て）</p>
            <textarea class="sv-import-input" id="sv-import-input" rows="6"
              placeholder="例:&#10;15:59&#10;21:12&#10;25:57&#10;1:08:13"></textarea>
            <div class="sv-import-btns">
              <button class="sv-import-apply" id="sv-import-apply" type="button">適用</button>
              <button class="sv-import-cancel" id="sv-import-cancel" type="button">キャンセル</button>
            </div>
          </div>
          <div class="sv-panel-hint">⏱ で現在時刻をメモ ／ バッジをタップで移動</div>
          <div class="sv-setlist" id="sv-setlist"></div>
        </div>
      </div>
    </div>
  `;
  panel.appendChild(el);

  $('#sv-close').addEventListener('click', () => closeStreamViewer());

  $('#sv-share-btn').addEventListener('click', _svOpenShareModal);
  $('#sv-music-btn').addEventListener('click', _svMoveToMusicBar);

  // 全画面ボタン
  $('#sv-fullscreen-btn').addEventListener('click', enterStreamFullscreen);

  // 音量
  const svVolSlider = $('#sv-vol-slider');
  const svVolBtn    = $('#sv-vol-btn');
  if (svVolSlider) {
    const v0 = _storedVol();
    svVolSlider.value = v0;
    svVolSlider.style.setProperty('--pct', `${v0}%`);
    if (svVolBtn) svVolBtn.textContent = _volIcon(v0);
    svVolSlider.addEventListener('input', e => {
      const v = parseInt(e.target.value);
      e.target.style.setProperty('--pct', `${v}%`);
      _saveVol(v);
      if (svVolBtn) svVolBtn.textContent = _volIcon(v);
      if (_svPlayer) try { _svPlayer.setVolume(v); } catch (_) {}
    });
  }
  if (svVolBtn) {
    let _preMute = 80;
    svVolBtn.addEventListener('click', () => {
      if (!svVolSlider) return;
      const cur = parseInt(svVolSlider.value);
      const newV = cur > 0 ? 0 : (_preMute || 80);
      if (cur > 0) _preMute = cur;
      _applyVol(svVolSlider, svVolBtn, _svPlayer, newV);
      _saveVol(newV);
    });
  }

  // パンくずナビゲーション
  el.querySelectorAll('[data-bc-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      _epPrevTab = btn.dataset.bcTab;
      closeStreamViewer();
    });
  });

  // 一括インポート
  $('#sv-import-toggle').addEventListener('click', () => {
    const area = $('#sv-import-area');
    if (!area) return;
    area.hidden = !area.hidden;
    if (!area.hidden) $('#sv-import-input')?.focus();
  });
  $('#sv-import-cancel').addEventListener('click', () => {
    const area = $('#sv-import-area');
    if (area) { area.hidden = true; }
    const input = $('#sv-import-input');
    if (input) input.value = '';
  });
  $('#sv-import-apply').addEventListener('click', () => {
    const stream = el._currentStream;
    if (!stream) return;
    const input = $('#sv-import-input');
    if (!input) return;
    const lines = input.value.split('\n');
    const times = lines.map(l => _parseTs(l)).filter(t => t !== null);
    if (!times.length) return;
    const ts = _svLoadTs(stream);
    times.forEach((t, i) => { if (i < stream.songs.length) ts[i] = t; });
    _svSaveTs(stream, ts);
    _svRefreshSetlist($('#sv-setlist'), stream.songs, ts);
    const area = $('#sv-import-area');
    if (area) area.hidden = true;
    input.value = '';
  });

  $('#sv-cts-bulk-btn').addEventListener('click', () => {
    const stream = el._currentStream;
    if (stream) _svShowBulkProposeModal(stream);
  });

  $('#sv-setlist').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    const stream = el._currentStream;
    if (!stream) return;
    const ts = _svLoadTs(stream);

    if (btn.dataset.action === 'seek') {
      if (ts[idx] != null && _svPlayer?.seekTo) {
        _svPlayer.seekTo(ts[idx], true);
        try { _svPlayer.playVideo(); } catch (_) {}
      }
    } else if (btn.dataset.action === 'set-ts') {
      const time = _svPlayer?.getCurrentTime?.();
      if (time != null) {
        ts[idx] = Math.floor(time);
        _svSaveTs(stream, ts);
        _svRefreshSetlist($('#sv-setlist'), stream.songs, ts);
      }
    } else if (btn.dataset.action === 'del-ts') {
      delete ts[idx];
      _svSaveTs(stream, ts);
      _svRefreshSetlist($('#sv-setlist'), stream.songs, ts);
    } else if (btn.dataset.action === 'cts-seek') {
      const sec = Number(btn.dataset.ctsSeconds);
      if (!isNaN(sec) && _svPlayer?.seekTo) {
        _svPlayer.seekTo(sec, true);
        try { _svPlayer.playVideo(); } catch (_) {}
      }
    } else if (btn.dataset.action === 'cts-propose') {
      const song = stream.songs[idx];
      _svShowProposeModal(stream, idx, song?.title || `曲 ${idx + 1}`);
    }
  });
}

function openStreamViewer(stream, resumeAt = 0) {
  if (!stream?.url) return;
  const id = youtubeVideoId(stream.url);
  if (!id) { playYouTubeInline(stream.url); return; }

  initStreamViewer();
  _loadYtApi();
  _svStopEndedWatch();

  // 退避中で同じ動画 → そのまま復帰（リロードなし）
  const curViewer = $('#stream-viewer');
  if (_svIsDocked(curViewer)) {
    if (curViewer._currentStream?.url === stream.url) {
      if (!_svUnminify() && !window.__restoreMusicExternalPlayer?.()) _svRestoreFromMusicBar();
      if (resumeAt > 0) {
        try { _svPlayer?.seekTo(Math.floor(resumeAt), true); _svPlayer?.playVideo(); } catch (_) {}
      }
      return;
    }
    _svDiscardMini(); // 別の動画 → 退避中のプレイヤーを破棄して通常オープン
  }

  const musicHandoff = window.__takeOverMusicPlayerVideo?.(stream.url) || null;
  if (!musicHandoff) {
    // 同一動画の2プレイヤー競合で再生が壊れるのを防ぐ。
    import('./music-player.js').then(m => (m.releaseMusicPlayerVideo || m.pauseMusicPlayer)()).catch(() => {});
  }

  // ミニプレイヤーが表示中なら即時破棄（同一ページで2プレイヤー競合を防ぐ）
  const miniPanel = $('#yt-player-panel');
  if (miniPanel && !miniPanel.hidden) {
    try { _miniPlayer?.pauseVideo(); } catch (_) {}
    miniPanel.hidden = true;
    _miniDestroyPlayer();
  }
  _svLastStream = null;

  // 全画面中なら埋め込みに戻してから開く
  if (_svFullscreen) {
    _svFullscreen = false;
    const existingViewer = $('#stream-viewer');
    if (existingViewer) existingViewer.classList.remove('sv-fullscreen');
    document.body.classList.remove('has-sv-fullscreen');
    document.body.style.overflow = '';
  }
  _svFullscreen = false;

  // 埋め込みプレイヤーパネルを表示
  showPlayerPanel();

  const viewer = $('#stream-viewer');
  viewer.classList.remove('sv-fullscreen');
  viewer.classList.toggle('sv-mv-mode', !!stream.isMv);
  viewer._currentStream = stream;
  const gen = ++_svGen;

  // パンくずリンクを用途に合わせて切り替え（MV: プレイリスト / 配信: タイムライン）
  const bcBtns = viewer.querySelectorAll('[data-bc-tab]');
  if (bcBtns[1]) {
    if (stream.isMv) {
      bcBtns[1].dataset.bcTab = 'playlists';
      bcBtns[1].textContent = 'プレイリスト';
    } else {
      bcBtns[1].dataset.bcTab = 'timeline';
      bcBtns[1].textContent = 'タイムライン';
    }
  }

  // パンくずタイトルを更新
  const bcTitleEl = $('#sv-bc-title');
  if (bcTitleEl) bcTitleEl.textContent = stream.title || '配信';
  const metaEl = $('#sv-stream-meta');
  if (metaEl) metaEl.textContent = stream.isMv ? '' : `${fmtDate(stream.date)}　第${stream.index}枠　🎤 ${stream.songs.length}曲`;
  const ytLink = $('#sv-yt-link');
  if (ytLink) ytLink.href = stream.url;
  const songCount = $('#sv-song-count');
  if (songCount) songCount.textContent = stream.isMv ? '' : `${stream.songs.length}曲`;

  _svCommunityTs = {};
  if (stream.isMv) {
    // MV モード: セットリスト不要。プレイヤー下は関連歌枠+ほかの動画で埋める
    const setlist = $('#sv-setlist');
    if (setlist) setlist.innerHTML = '';
    const belowPlayer = $('#sv-below-player');
    if (belowPlayer) belowPlayer.innerHTML = '';
    _svRenderBelowPlayerMv(stream);
  } else {
    const ts = _svLoadTs(stream);
    _svRefreshSetlist($('#sv-setlist'), stream.songs, ts);
    _svLoadCommunityTs(stream);
    _svRenderBelowPlayer(stream);
  }

  viewer.hidden = false;
  document.body.style.overflow = ''; // 埋め込みモードではスクロールロックしない
  _svUpdateUrl();
  // フォーカス先: 埋め込み時はスクロールを引き起こさないよう遅延
  setTimeout(() => { $('#sv-close')?.focus({ preventScroll: true }); }, 50);

  _svPlayer = null;
  const wrap = $('#sv-player-wrap');
  wrap.innerHTML = '<div class="sv-player-loading">読み込み中…</div>';

  const startSec = Math.floor(resumeAt || musicHandoff?.currentTime || 0);

  if (musicHandoff?.player) {
    wrap.innerHTML = '';
    if (musicHandoff.iframe) {
      musicHandoff.iframe.style.width = '100%';
      musicHandoff.iframe.style.height = '100%';
      wrap.appendChild(musicHandoff.iframe);
    } else {
      wrap.innerHTML = `<div class="sv-player-loading">再生を引き継ぎました</div>`;
    }
    _svPlayer = musicHandoff.player;
    try {
      _svPlayer.setVolume?.(_storedVol());
      if (startSec > 1) _svPlayer.seekTo?.(startSec, true);
      _svPlayer.playVideo?.();
    } catch (_) {}
    _applyVol($('#sv-vol-slider'), $('#sv-vol-btn'), null, _storedVol());
    _svStartEndedWatch(gen, viewer);
    return;
  }

  _onYtReady(() => {
    if (gen !== _svGen || viewer.hidden) return;
    wrap.innerHTML = '';
    const playerDiv = document.createElement('div');
    wrap.appendChild(playerDiv);
    try {
      _svPlayer = new window.YT.Player(playerDiv, {
        videoId: id,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          ...(startSec > 0 ? { start: startSec } : {}),
        },
        events: {
          onReady: (event) => {
            const v = _storedVol();
            try { event.target.setVolume(v); } catch (_) {}
            _applyVol($('#sv-vol-slider'), $('#sv-vol-btn'), null, v);
            try { event.target.setPlaybackQuality('hd1080'); } catch (_) {}
            try { event.target.setPlaybackQualityRange('hd720', 'hd1080'); } catch (_) {}
            if (startSec > 5) {
              try { event.target.seekTo(startSec, true); } catch (_) {}
            }
          },
          onStateChange: (event) => {
            if (gen !== _svGen) return;
            if (event.data === window.YT.PlayerState.PLAYING) {
              try { event.target.setPlaybackQuality('hd1080'); } catch (_) {}
            }
            if (event.data === window.YT.PlayerState.ENDED) _svHandleEnded(viewer);
          },
          onError: () => {
            if (gen !== _svGen) return;
            wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${escapeHtml(id)}?autoplay=1&playsinline=1&rel=0${startSec > 0 ? `&start=${startSec}` : ''}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
          },
        },
      });
    } catch (_) {
      wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${escapeHtml(id)}?autoplay=1&playsinline=1&rel=0${startSec > 0 ? `&start=${startSec}` : ''}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    }
  });
}

function closeStreamViewer() {
  const viewer = $('#stream-viewer');
  if (!viewer || viewer.hidden || _svIsDocked(viewer)) return;

  // ── 全画面モードの場合 → 埋め込みに戻るだけ（ミニプレイヤーは起動しない）──
  if (_svFullscreen) {
    _svFullscreen = false;
    viewer.classList.remove('sv-fullscreen');
    document.body.classList.remove('has-sv-fullscreen');
    document.body.style.overflow = '';
    const closeBtn = $('#sv-close');
    if (closeBtn) closeBtn.title = 'ミニプレイヤーで再生を続けながら戻ります（Esc）';
    const fsBtn = $('#sv-fullscreen-btn');
    if (fsBtn) fsBtn.setAttribute('aria-pressed', 'false');
    return; // 動画はそのまま継続再生
  }

  // ── 埋め込み → ミニ化: 同じ iframe を CSS で縮小表示（リロードなし・ゼロラグ）──
  if (_svMinify()) return;

  // プレイヤー未生成など → 通常クローズ
  ++_svGen;
  viewer.hidden = true;
  viewer._currentStream = null;
  _svStopEndedWatch();
  _svPlayer = null;
  const wrap = $('#sv-player-wrap');
  if (wrap) wrap.innerHTML = '';
  document.body.style.overflow = '';
  hidePlayerPanel();
  _svUpdateUrl();
}

// プレイリストビューからストリームを開けるようにグローバル公開
window.__openStreamViewer = openStreamViewer;

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
  const favActive = isFavorite(song.key);
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
        <div><strong>${fmtDate(song.firstSung) || '—'}</strong><span>初披露</span></div>
      </div>
    </div>
    <div class="song-detail-actions">
      <button class="btn ${favActive ? 'primary' : 'ghost'}" type="button" data-detail-action="favorite" data-songkey="${escapeHtml(song.key)}">${favActive ? '♥ お気に入り解除' : '♡ お気に入りに追加'}</button>
      <button class="btn primary" type="button" data-detail-action="timeline" data-songkey="${escapeHtml(song.key)}">歌枠を見る</button>
      <button class="btn ghost" type="button" data-detail-action="close">閉じる</button>
    </div>
    <div class="song-detail-history">
      <h3>歌った歌枠</h3>
      ${refs.length ? refs.map(ref => `
        <div class="song-detail-stream">
          ${ref.thumbnail && ref.url
            ? `<span class="song-detail-thumb-wrap"><button class="song-detail-thumb-link" type="button" data-inline-youtube="${escapeHtml(ref.url)}" aria-label="インライン再生"><img class="song-detail-thumb" src="${escapeHtml(ref.thumbnail)}" data-fallback="${escapeHtml(ref.thumbnailFallback)}" data-tiny="${escapeHtml(ref.thumbnailTiny)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span>再生</span></button><a class="song-detail-youtube-link" href="${escapeHtml(ref.url)}" target="_blank" rel="noopener">開く</a></span>`
            : '<div class="song-detail-thumb placeholder"></div>'}
          <button class="song-detail-frame" type="button" data-detail-action="stream" data-songkey="${escapeHtml(song.key)}" data-streamkey="${escapeHtml(ref.detailKey)}">
            <span>${fmtDate(ref.date)}</span>
            <strong>${escapeHtml(ref.title || '配信')}</strong>
          </button>
          <button class="song-detail-watch" type="button" data-detail-action="watch" data-songkey="${escapeHtml(song.key)}" data-streamkey="${escapeHtml(ref.detailKey)}" title="この歌唱の頭出し再生（タイムスタンプがあればその位置から）">⏱ 頭出し</button>
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
    const inlineYt = event.target.closest('[data-inline-youtube]');
    if (inlineYt) {
      event.preventDefault();
      event.stopPropagation();
      playYouTubeInline(inlineYt.dataset.inlineYoutube);
      return;
    }
    const action = event.target.closest('[data-detail-action]');
    if (!action) return;
    event.stopPropagation();
    if (action.dataset.detailAction === 'close') close();
    if (action.dataset.detailAction === 'favorite') {
      const key = action.dataset.songkey;
      toggleFavorite(key);
      const nowActive = isFavorite(key);
      action.textContent = nowActive ? '♥ お気に入り解除' : '♡ お気に入りに追加';
      action.classList.toggle('primary', nowActive);
      action.classList.toggle('ghost', !nowActive);
    }
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
    if (action.dataset.detailAction === 'watch') {
      const song = findSong(action.dataset.songkey);
      const refKey = action.dataset.streamkey;
      close();
      if (song && refKey) _openSongPerformance(song, refKey);
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

let _heroCardsReady = false;

function renderHero() {
  if (!state.data) return;
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

  const statsGrid = $('#stats-grid');
  if (!_heroCardsReady) {
    statsGrid.innerHTML = `
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
    _heroCardsReady = true;
  } else {
    const values = statsGrid.querySelectorAll('.stat-value');
    if (values.length >= 6) {
      values[0].textContent = formatNumber(stats.total);
      values[0].innerHTML += '<span class="stat-unit">回</span>';
      values[1].textContent = formatNumber(stats.repertoire);
      values[1].innerHTML += '<span class="stat-unit">曲</span>';
      values[2].textContent = formatNumber(stats.streams);
      values[2].innerHTML += '<span class="stat-unit">回</span>';
      values[3].textContent = stats.avgPerStream;
      values[3].innerHTML += '<span class="stat-unit">曲</span>';
      values[4].textContent = dSinceLatest != null ? dSinceLatest : '—';
      values[4].innerHTML += '<span class="stat-unit">日</span>';
      values[5].textContent = activeDays(state.data);
      values[5].innerHTML += '<span class="stat-unit">日</span>';
    }
  }
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
  const loading = $('#loading');
  const error = $('#error');
  const errDetail = $('#err-detail');
  if (loading) loading.hidden = true;
  if (error) error.hidden = false;
  if (errDetail) errDetail.textContent = err && err.message ? err.message : String(err);
}

function updatePageTitle(_mode) {
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
    const channelData = await loadInitial();
    state.channelData = channelData;
    // meta.json 完了直後に songs/streams の fetch を開始（ヒーロー描画処理を待たない）
    if (!fullDataPromise && !channelData.fullLoaded) {
      startFullDataLoad();
    }
    const url = readUrlState();
    const hasSharedVideo = !!url.v;
    state.songsQuery = url.q;
    state.activeTab = hasSharedVideo ? 'player' : (isValidTab(url.tab) ? url.tab : 'dashboard');
    syncActiveTabUi(state.activeTab);
    let initialChannel = url.channel || state.channel || DEFAULT_CHANNEL;
    if (!getDataset(initialChannel)) initialChannel = DEFAULT_CHANNEL;
    if (!getDataset(initialChannel)) {
      const fallback = Object.keys(channelData.channels)[0];
      if (fallback) initialChannel = fallback;
    }
    if (!getDataset(initialChannel)) throw new Error('No channel data could be loaded');
    refreshChannelButtons();
    switchChannel(initialChannel, {
      resetSearch: false,
      updateUrl: false,
      autoLoad: true,
      initial: true,
      render: !hasSharedVideo,
    });
    // ?v= 付き URL → 該当の配信/MV をビューワーで開く（共有リンク）
    if (hasSharedVideo) {
      const opened = await _maybeOpenSharedVideo();
      if (!opened) activateTab(url.tab, { updateUrl: false, initial: true });
    }
    hideLoading();
    // ?pl= 付き URL → 共有プレイリストの取り込み確認
    _maybeImportSharedPlaylist();
  } catch (e) {
    console.error('[init] failed:', e);
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
// 埋め込みプレイヤーが開いている状態で別タブへ移動した場合、
// ミニプレイヤーへ再生を引き継ぎながらタブ遷移する
$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    const streamViewer = $('#stream-viewer');
    // 埋め込みモード（非全画面）でストリームが再生中 → ミニプレイヤーへ引き継ぐ
    if (tab !== 'player' && streamViewer && !streamViewer.hidden && !_svFullscreen
        && !_svIsDocked(streamViewer)) {
      _epPrevTab = tab; // closeStreamViewer 内の hidePlayerPanel がこのタブへ遷移する
      closeStreamViewer();
      return;
    }
    activateTab(tab);
  });
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
  // プレイリストに追加ボタン
  const plAddEl = e.target.closest('[data-playlist-add]');
  if (plAddEl) {
    e.preventDefault();
    e.stopPropagation();
    const skey = plAddEl.dataset.playlistAdd;
    const title = plAddEl.dataset.streamTitle || '';
    import('./views/playlists.js').then(m => m.showAddToPlaylistModal(skey, title));
    return;
  }

  const streamPlayEl = e.target.closest('[data-stream-play]');
  if (streamPlayEl) {
    e.preventDefault();
    e.stopPropagation();
    const skey = streamPlayEl.dataset.streamPlay;
    const foundStream = (state.data?.streams || []).find(s => streamKey(s) === skey);
    if (foundStream?.url) {
      openStreamViewer(foundStream);
    } else if (streamPlayEl.dataset.inlineYoutube) {
      playYouTubeInline(streamPlayEl.dataset.inlineYoutube);
    }
    return;
  }
  const inlineYt = e.target.closest('[data-inline-youtube]');
  if (inlineYt) {
    e.preventDefault();
    e.stopPropagation();
    playYouTubeInline(inlineYt.dataset.inlineYoutube);
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
initYouTubePlayer();
initStreamViewer();
initSongModal();
initMobileMenu();
initPageTopToast();
initWelcomeTip();
import('./music-player.js').then(m => { m.setApiLoader(_loadYtApi); m.initMusicPlayer(); }).catch(() => {});

// グローバル検索パレット初期化
initSearchPalette((result) => {
  if (result.type === 'song') {
    openSongDetail(result.song.key);
  } else if (result.type === 'artist') {
    searchArtistName(result.artist);
  } else if (result.type === 'stream') {
    openStreamViewer(result.stream);
  } else if (result.type === 'music-video') {
    openStreamViewer({ ...result.video, isMv: true });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// キーボードショートカット
//   /  または Ctrl+K / Cmd+K → グローバル検索を開く
//   T                         → テーマ切替
//   ?                         → ヘルプモーダルを開く
//   Esc                       → 検索パレット→曲モーダル→ヘルプ→検索クリア の順で閉じる
// ──────────────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  // ── ビューワー再生操作: Space 再生/停止、←→ 10秒シーク ──
  if (!inInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const viewer = $('#stream-viewer');
    const viewerActive = viewer && !viewer.hidden
      && !viewer.classList.contains('sv-minified')
      && !viewer.classList.contains('sv-music-minified')
      && $('#sv-share-modal')?.hidden !== false
      && _svPlayer;
    if (viewerActive) {
      if (e.key === ' ') {
        e.preventDefault();
        try {
          const st = _svPlayer.getPlayerState?.();
          if (st === window.YT?.PlayerState?.PLAYING) _svPlayer.pauseVideo();
          else _svPlayer.playVideo();
        } catch (_) {}
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        try {
          const cur = _svPlayer.getCurrentTime?.() ?? 0;
          const next = Math.max(0, cur + (e.key === 'ArrowRight' ? 10 : -10));
          _svPlayer.seekTo(next, true);
        } catch (_) {}
        return;
      }
    }
  }

  // グローバル検索を開く: / (非入力中) または Ctrl+K / Cmd+K
  const openSearch =
    (e.key === '/' && !inInput && !e.metaKey && !e.ctrlKey) ||
    (e.key === 'k' && (e.ctrlKey || e.metaKey) && !e.shiftKey);
  if (openSearch) {
    e.preventDefault();
    openSearchPalette();
    return;
  }

  // テーマ切替: T
  if (e.key === 't' && !inInput && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    cycleTheme();
    return;
  }

  // ヘルプ: ?
  if (e.key === '?' && !inInput && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    const modal = $('#help-modal');
    if (modal && modal.hidden) {
      modal.hidden = false;
      $('#help-close')?.focus();
    }
    return;
  }

  // Esc: 優先度順に閉じる
  if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey) {
    // 0. 配信プレイヤー（全画面 or プレイヤーパネルがアクティブな場合）
    const streamViewer = $('#stream-viewer');
    const playerPanelActive = !!$('#panel-player.active');
    if (streamViewer && !streamViewer.hidden && (_svFullscreen || playerPanelActive)) {
      e.preventDefault();
      closeStreamViewer();
      return;
    }
    // 1. グローバル検索
    if (isSearchPaletteOpen()) {
      e.preventDefault();
      closeSearchPalette();
      return;
    }
    // 2. 曲詳細モーダル
    const songModal = $('#song-modal');
    if (songModal && !songModal.hidden) {
      // song modal の Esc は initSongModal 内で処理済み
      return;
    }
    // 3. チャンネル情報モーダル
    const chModal = $('#ch-modal');
    if (chModal && !chModal.hidden) {
      chModal.hidden = true;
      return;
    }
    // 4. ヘルプモーダル
    const helpModal = $('#help-modal');
    if (helpModal && !helpModal.hidden) {
      helpModal.hidden = true;
      $('#help-btn')?.focus();
      return;
    }
    // 4. 曲リスト検索クリア
    const searchEl = $('#songs-search');
    if (searchEl && document.activeElement === searchEl && searchEl.value) {
      e.preventDefault();
      searchEl.value = '';
      searchEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
});

// Re-render charts on theme change
onRerenderNeeded(() => {
  if (!state.data) return;
  destroyAllCharts();
  if (state.activeTab === 'dashboard' || state.activeTab === 'analytics') renderTab();
});

function startApp() {
  init();
}

startApp();
