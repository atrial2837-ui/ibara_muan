import { state, initStore, toggleFavorite, isFavorite } from './store.js';
import { ensureSongTags, loadAll, loadInitial } from './data.js';
import { buildIndex } from './search.js';
import { initTheme, onThemeChange, cycleTheme } from './theme.js';
import { onRerenderNeeded, destroyAllCharts } from './charts.js';
import { $, $$, escapeHtml, fmtDate, fmtTs, streamKey, youtubeThumb, youtubeThumbHq, youtubeThumbTiny, youtubeUrlAt, youtubeVideoId } from './utils.js';
import { DEFAULT_CHANNEL } from './config.js';
import { readUrlState, writeUrlState } from './url-state.js';
import { buildPageMeta } from './seo-meta.js';
import { initSearchPalette, openSearchPalette, closeSearchPalette, isSearchPaletteOpen } from './views/search-palette.js';
import { icon } from './icons.js';
import { initChannelModal, initHelpModal, initWelcomeTip } from './views/modals.js';
import { renderHero } from './views/hero.js';
import { _epSetPendingTabOptions, _epSetPrevTab, _maybeImportSharedPlaylist, _maybeOpenSharedVideo, closeStreamViewer, getPlayerMode, handleViewerKeyboard, initPlayerShell, initStreamViewer, initYouTubePlayer, openStreamViewer } from './player/stream-player.js';

initTheme();
initStore();

const VIEW_LOADERS = {
  dashboard: () => import('./views/dashboard.js').then(m => m.renderDashboard),
  ranking:   () => import('./views/ranking.js').then(m => m.renderRanking),
  songs:     () => import('./views/songs.js').then(m => m.renderSongs),
  timeline:  () => import('./views/timeline.js').then(m => m.renderTimeline),
  analytics: () => import('./views/analytics.js').then(m => m.renderAnalytics),
  // requests は後回し(バックエンド未移植): views/requests.js は残すが登録しない
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
  if (!isValidTab(tab)) return;
  // playlists はアプリ本体データ待ち不要
  if (tab !== 'playlists' && !state.data) return;
  const hasPartial = state.channelData?.partialLoaded || state.channelData?.fullLoaded;
  const hasFull    = state.channelData?.fullLoaded;
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

  // 埋め込み再生中のタブ切替はミニプレイヤーへ引き継いでから遷移する
  if (getPlayerMode() === 'embedded') {
    _epSetPrevTab(tab);
    _epSetPendingTabOptions(options);
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
  // ビューワー表示中(embedded/fullscreen)はプレイヤーパネルを前面にし、
  // タブボタンは非選択にする。activeTab 自体は下層のタブを保持し続ける。
  const playerVisible = ['embedded', 'fullscreen'].includes(getPlayerMode());
  const btnTab = playerVisible ? null : tab;
  $$('.tab-btn').forEach(b => {
    const isActive = b.dataset.tab === btnTab;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  $$('.mobile-tab-item').forEach(b => {
    const isActive = b.dataset.mobileTab === btnTab;
    b.classList.toggle('is-active', isActive);
    b.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
  const current = $('#mobile-tab-current');
  const activeLabel = $(`.tab-btn[data-tab="${tab}"] span:last-child`)?.textContent?.trim();
  if (current && activeLabel) current.textContent = activeLabel;
  $$('.panel').forEach(p => p.classList.toggle('active', p.id === (playerVisible ? 'panel-player' : `panel-${tab}`)));
  document.body.dataset.activeTab = playerVisible ? 'player' : tab; // ヒーロー圧縮・ビューワー集中表示の CSS フック

  // ビューワー表示中とプレイリストタブはサイドバーを非表示にして全幅使用
  _setSidebarHidden(playerVisible || tab === 'playlists');
}

/** サイドバーの表示・非表示を切り替え、body padding と topbar left を同期する */
function _setSidebarHidden(hidden) {
  const sidebar = $('nav.tabs');
  const topbar  = $('.topbar');
  if (!sidebar) return;
  if (hidden) {
    sidebar.style.display = 'none';
    document.body.style.paddingLeft = '0';
    if (topbar) { topbar.style.left = '0'; topbar.style.width = '100%'; }
  } else {
    sidebar.style.display = '';
    document.body.style.paddingLeft = '';
    if (topbar) { topbar.style.left = ''; topbar.style.width = ''; }
  }
}

function initSidebarNav() {
  const sidebarToggle = $('#db-sidebar-toggle');
  const storageKey = 'ibara-sidebar-collapsed';
  const setCollapsed = (collapsed) => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    sidebarToggle?.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
    const label = collapsed ? 'メニューを展開' : 'メニューを折り畳む';
    sidebarToggle?.setAttribute('data-tooltip', label);
    sidebarToggle?.setAttribute('aria-label', label);
    try { localStorage.setItem(storageKey, collapsed ? '1' : '0'); } catch (_) {}
  };

  try {
    setCollapsed(localStorage.getItem(storageKey) === '1');
  } catch (_) {
    setCollapsed(false);
  }

  // 初期状態を描画してから transition を有効化（起動時のアニメーション/シフト防止）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.add('sidebar-anim-ready'));
  });

  sidebarToggle?.addEventListener('click', () => {
    setCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  });

  const profileButton = $('#db-profile-button');
  const profileMenu = $('#db-profile-menu');
  const setProfileOpen = (open) => {
    if (!profileMenu || !profileButton) return;
    profileMenu.hidden = !open;
    profileButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  profileButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    setProfileOpen(profileMenu?.hidden ?? true);
  });
  profileMenu?.querySelector('[data-ch-modal]')?.addEventListener('click', () => {
    setProfileOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (!profileMenu || profileMenu.hidden) return;
    if (event.target.closest?.('#db-profile-menu, #db-profile-button')) return;
    setProfileOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setProfileOpen(false);
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
  const close = () => {
    setOpen(false);
    toggle.focus();
  };
  // label から button へ変えたので、チェックボックスの切り替えは自分で行う。
  // button は Enter / Space でも click が出るため、キー処理は不要。
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
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

function initMobileTabNav() {
  const nav = $('#mobile-tab-nav');
  const toggle = $('#mobile-tab-toggle');
  const panel = $('#mobile-tab-panel');
  if (!nav || !toggle || !panel) return;

  const setOpen = (open) => {
    panel.hidden = !open;
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('has-mobile-tab-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(panel.hidden);
  });

  panel.addEventListener('click', (event) => {
    // 公式リンクなどタブ移動以外の項目も、押したらパネルを閉じる
    // （モーダルがパネルの裏に隠れてしまうため）
    if (event.target.closest('[data-ch-modal]')) {
      setOpen(false);
      return;
    }
    const item = event.target.closest('[data-mobile-tab]');
    if (!item) return;
    const tab = item.dataset.mobileTab;
    setOpen(false);
    activateTab(tab);
    // モバイルでは .tabs を隠しているため、本文の先頭へ戻す
    document.querySelector('.panels')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.addEventListener('click', (event) => {
    if (panel.hidden) return;
    if (event.target.closest('#mobile-tab-nav')) return;
    setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  syncActiveTabUi(state.activeTab || 'dashboard');
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

function openSongDetail(key) {
  const song = findSong(key);
  const modal = $('#song-modal');
  const body = $('#song-modal-body');
  const title = $('#song-modal-title');
  if (!song || !modal || !body || !title) return;
  ensureSongTags(song);

  title.textContent = song.title;
  const refs = (song.streamRefs || []).slice(0, 8).map(ref => {
    // その枠でこの曲が始まる秒数。streams.json に t として入っている
    const startAt = (ref.songs || []).find(item => item.key === song.key)?.t ?? null;
    return {
      ...ref,
      // 主=maxres(高解像度)。存在しない動画では onerror で mqdefault → default と段階的に落ちる
      thumbnail: youtubeThumbHq(ref.url),
      thumbnailFallback: youtubeThumb(ref.url),
      thumbnailTiny: youtubeThumbTiny(ref.url),
      detailKey: streamKey(ref),
      startAt,
      // 開始位置が分かっていればその地点から、無ければ頭から開く
      watchUrl: youtubeUrlAt(ref.url, startAt),
    };
  });
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
        <div><strong>${String(song.displayKey || '').split(',').map(k => k.trim()).filter(Boolean).join(' / ') || '—'}</strong><span>キー</span></div>
        <div><strong>${song.daysSinceLast ?? '—'}</strong><span>日前</span></div>
        <div><strong>${fmtDate(song.firstSung) || '—'}</strong><span>初披露</span></div>
      </div>
    </div>
    <div class="song-detail-actions">
      <button class="btn ${favActive ? 'primary' : 'ghost'}" type="button" data-detail-action="favorite" data-songkey="${escapeHtml(song.key)}">${icon('heart')} ${favActive ? 'お気に入り解除' : 'お気に入りに追加'}</button>
      <button class="btn primary" type="button" data-detail-action="timeline" data-songkey="${escapeHtml(song.key)}">歌枠を見る</button>
      <button class="btn ghost" type="button" data-detail-action="close">閉じる</button>
    </div>
    <div class="song-detail-history">
      <h3>歌った歌枠</h3>
      ${refs.length ? refs.map(ref => `
        <div class="song-detail-stream">
          ${ref.thumbnail && ref.url
            ? `<a class="song-detail-thumb-link" href="${escapeHtml(ref.watchUrl)}" target="_blank" rel="noopener" aria-label="${ref.startAt != null ? `この曲の位置（${fmtTs(ref.startAt)}）からYouTubeで開く` : 'YouTubeで開く'}"><img class="song-detail-thumb" src="${escapeHtml(ref.thumbnail)}" data-fallback="${escapeHtml(ref.thumbnailFallback)}" data-tiny="${escapeHtml(ref.thumbnailTiny)}" alt="" loading="lazy" referrerpolicy="no-referrer">${ref.startAt != null ? `<span class="song-detail-at">${escapeHtml(fmtTs(ref.startAt))}</span>` : ''}</a>`
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
    if (action.dataset.detailAction === 'favorite') {
      const key = action.dataset.songkey;
      toggleFavorite(key);
      const nowActive = isFavorite(key);
      action.innerHTML = `${icon('heart')} ${nowActive ? 'お気に入り解除' : 'お気に入りに追加'}`;
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

function updatePageTitle(mode) {
  const el = document.getElementById('page-title');
  if (!el) return;

  // 単チャンネル運用のためラベル分岐なし
  el.innerHTML = `<img class="hero-title-icon" src="assets/site-icon.svg" alt="" width="32" height="32" fetchpriority="high" decoding="sync">茨むあん 歌唱データベース`;

  // ヒーロー背景ウォーターマーク切替
  const bg = document.getElementById('hero-ch-bg');
  if (bg) bg.dataset.mode = mode || 'all';

  applySeoMeta();
}

// 開いている歌枠を videoId から引く。チャンネルをまたいで探す。
function findStreamByVideoId(videoId) {
  if (!videoId || !state.channelData) return null;
  const buckets = [state.data, ...Object.values(state.channelData.channels || {})];
  for (const ds of buckets) {
    const hit = (ds?.streams || []).find(s => youtubeVideoId(s.url) === videoId);
    if (hit) return hit;
  }
  return null;
}

// SPA なので URL が変わっても HTML は同じ。title/description/canonical を
// 出し分けないと、歌枠ページも各タブも検索エンジンにはトップと同じ 1 ページに見える。
function applySeoMeta() {
  const url = readUrlState();
  const meta = buildPageMeta(url, { stream: findStreamByVideoId(url.v) });

  document.title = meta.title;
  const set = (selector, attr, value) => {
    const el = document.head.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };
  set('link[rel="canonical"]', 'href', meta.canonical);
  set('meta[name="description"]', 'content', meta.description);
  set('meta[property="og:title"]', 'content', meta.title);
  set('meta[property="og:description"]', 'content', meta.description);
  set('meta[property="og:url"]', 'content', meta.canonical);
  set('meta[name="twitter:title"]', 'content', meta.title);
  set('meta[name="twitter:description"]', 'content', meta.description);
}

window.addEventListener('urlstatechange', applySeoMeta);

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
    // 共有動画(?v=)でもactiveTabは下層タブのまま。ビューワー表示はplayerModeが担う
    state.activeTab = isValidTab(url.tab) ? url.tab : 'dashboard';
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
  applySeoMeta();
}

// Tab buttons
// 埋め込みプレイヤーが開いている状態で別タブへ移動した場合、
// ミニプレイヤーへ再生を引き継ぎながらタブ遷移する
$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    // 埋め込みモード（非全画面）でストリームが再生中 → ミニプレイヤーへ引き継ぐ
    if (getPlayerMode() === 'embedded') {
      _epSetPrevTab(tab); // closeStreamViewer 内の hidePlayerPanel がこのタブへ遷移する
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

// Global click → 曲名で詳細、アーティスト名で絞り込み（全ビュー共通）
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
    // 追加/削除の瞬間に呼び出し元ボタンの保存済み表示を切り替える
    const onChange = (saved) => {
      plAddEl.classList.toggle('is-saved', saved);
      if (plAddEl.classList.contains('timeline-save-btn')) plAddEl.innerHTML = icon('bookmark');
      plAddEl.setAttribute('data-tooltip', saved ? 'プレイリストに保存済み' : 'プレイリストに保存');
    };
    import('./views/playlists.js').then(m => m.showAddToPlaylistModal(skey, title, { onChange }));
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
    }
    return;
  }
  // 曲名クリック → 曲詳細。
  // data-songkey を持つ要素自身が <button> の場合(タイムライン等)も拾いつつ、
  // 行の中に入れ子になった別のリンク/ボタン(セトリ追加・YouTubeリンク等)は無視する。
  const songEl = e.target.closest('[data-songkey]');
  if (!songEl) return;
  const control = e.target.closest('a[href], button');
  if (control && control !== songEl) return;
  e.preventDefault();
  openSongDetail(songEl.dataset.songkey);
});

$('#retry-btn').addEventListener('click', init);
initPlayerShell({
  activateTab,
  setSidebarHidden: _setSidebarHidden,
  ensureFullData,
  syncTabUi: () => syncActiveTabUi(state.activeTab),
});
initHelpModal();
initChannelModal();
initYouTubePlayer();
initStreamViewer();
initSongModal();
initSidebarNav();
initMobileMenu();
initMobileTabNav();
initPageTopToast();
initWelcomeTip();
import('./music-player.js').then(m => m.initMusicPlayer()).catch(() => {});

$('#topbar-search-btn')?.addEventListener('click', openSearchPalette);
$('#topbar-search-menu-btn')?.addEventListener('click', openSearchPalette);

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
    if ((e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') && handleViewerKeyboard(e.key)) {
      e.preventDefault();
      return;
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
    // 0. 配信プレイヤー（全画面 or 埋め込み表示中）
    if (['embedded', 'fullscreen'].includes(getPlayerMode())) {
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
