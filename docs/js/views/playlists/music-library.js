/**
 * 歌みた・オリ曲ライブラリ（プレイリスト「music」サブタブ）
 *
 * music.json の取得・キャッシュ・検索・グリッド/リスト/カテゴリ表示・
 * 選択モード（まとめて追加）を所有する。
 * 親ビュー(views/playlists.js)へは initMusicLibrary で依存を注入され、
 * クリック/入力は handleMusicClick / handleMusicSearchInput で委譲される。
 */

import { $, escapeHtml, youtubeThumb, youtubeThumbHq } from '../../utils.js';
import { icon } from '../../icons.js';
import { openStreamViewer } from '../../player/stream-player.js';
import { isStreamInAnyPlaylist } from '../../player/playlists-store.js';

const MUSIC_CACHE_KEY = 'ibara-music-videos-cache-v2';

const PL_BOOKMARK_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/></svg>';

/* ── モジュール状態 ─────────────────────────────────────────────────────── */

let _musicView    = 'grid';     // 'grid' | 'list' | 'category'
let _musicVideos  = null;       // キャッシュ済み music.json の videos 配列
let _musicLoadPromise = null;
let _musicLoading = false;
let _musicQuery   = '';
let _musicSearchDebounce = null;
let _musicSelectMode = false;        // まとめて追加の選択モード
const _musicSelection = new Set();   // 選択中の動画 id

// 親ビューから注入される依存
let _isActive = () => false;             // music サブタブが表示中か
let _openAddModal = () => {};            // showAddToPlaylistModal 相当

/** 親ビューから依存を注入する（renderPlaylists の初期化時に一度呼ぶ） */
export function initMusicLibrary({ isActive, openAddModal }) {
  if (isActive) _isActive = isActive;
  if (openAddModal) _openAddModal = openAddModal;
}

/* ── 公開 API ───────────────────────────────────────────────────────────── */

/** music サブタブの初期 HTML（renderPlaylists から同期呼び出し） */
export function renderMusicSubtab() {
  if (_musicVideos === null) {
    const cached = _readMusicVideoCache();
    if (cached.length) _musicVideos = cached;
  }
  return _renderMusicLibrary(_musicVideos || []);
}

/** music.json を取得して結果を反映する。
 *  検索欄が既に DOM にある場合は結果リストだけ差し替え、
 *  入力中のフォーカス・IME 変換を絶対に壊さない。 */
export async function loadAndRenderMusic() {
  if (_musicVideos !== null) {
    _renderOrRefreshMusic();
    return;
  }
  _musicVideos = _readMusicVideoCache(); // キャッシュなしなら []
  _musicLoading = true;
  _renderOrRefreshMusic();
  const fetched = await _fetchMusicVideos();
  _musicLoading = false;
  _musicVideos = Array.isArray(fetched) ? fetched : [];
  _renderOrRefreshMusic();
}

/** マイリスト表示などが mv: 項目解決に必要とする動画データを確保する。
 *  同期解決できれば true。未取得なら fetch を開始し、完了時 onLoaded を呼ぶ。 */
export function ensureMusicVideos(onLoaded) {
  if (_musicVideos !== null) return true;
  const cached = _readMusicVideoCache();
  if (cached.length) { _musicVideos = cached; return true; }
  _fetchMusicVideos().then(v => {
    if (_musicVideos === null) _musicVideos = Array.isArray(v) ? v : [];
    onLoaded?.();
  });
  return false;
}

/** 外部から music.json キャッシュにアクセス */
export function getMusicVideos() { return _musicVideos || []; }

/** 全再描画前に検索欄の値を退避する（フォーカス・クエリ復元用） */
export function setMusicQuery(q) { _musicQuery = q || ''; }

/** 音楽 playlist item ("mv:<id>") から動画オブジェクトを解決 */
export function resolveMusicVideoId(mvKey) {
  if (!mvKey?.startsWith('mv:')) return null;
  const id = mvKey.slice(3);
  return (_musicVideos || []).find(v => v.id === id) || null;
}

/** 動画タイプ → バッジ表示情報 */
export function mvBadge(video) {
  switch (video.type) {
    case 'cover':     return { label: 'カバー',    cls: 'mv-badge-cover',     sub: video.originalArtist || 'カバー曲' };
    case 'sugarily':  return { label: 'しゅがりり', cls: 'mv-badge-sugarily',  sub: 'しゅがりり' };
    case 'character': return { label: 'キャラ',    cls: 'mv-badge-character', sub: video.character || 'キャラソン' };
    default:          return { label: 'オリジナル', cls: 'mv-badge-original',  sub: '茨むあん' };
  }
}

/** music サブタブ由来のクリックを処理する。処理したら true を返す。 */
export function handleMusicClick(e) {
  // ── 音楽ビュー切替 ──
  const viewBtn = e.target.closest('[data-music-view]:not([data-music-select-toggle])');
  if (viewBtn) {
    _musicView = viewBtn.dataset.musicView;
    _refreshMusicResults();
    return true;
  }

  // ── 選択モード: ON/OFF トグル ──
  if (e.target.closest('[data-music-select-toggle]')) {
    _musicSelectMode = !_musicSelectMode;
    if (!_musicSelectMode) _musicSelection.clear();
    _rerenderMusicBody();
    return true;
  }

  // ── 選択モード: 個別トグル（全再描画せず対象カードだけ更新＝スクロール維持）──
  const selEl = e.target.closest('[data-mv-select]');
  if (selEl) {
    const id = selEl.dataset.mvSelect;
    const nowSel = !_musicSelection.has(id);
    if (nowSel) _musicSelection.add(id); else _musicSelection.delete(id);
    const container = selEl.classList.contains('mv-list-row') ? selEl : selEl.closest('.mv-card');
    if (container) container.classList.toggle('is-selected', nowSel);
    const cb = container?.querySelector('.mv-card-checkbox, .mv-list-checkbox');
    if (cb) cb.innerHTML = nowSel ? icon('check') : '';
    selEl.setAttribute('aria-pressed', String(nowSel));
    _updateMusicSelBar();
    return true;
  }

  // ── 選択モード: 表示中をすべて選択 ──
  if (e.target.closest('[data-music-select-all]')) {
    _filterMusicVideos(_musicVideos || []).forEach(({ v }) => _musicSelection.add(v.id));
    _rerenderMusicBody();
    return true;
  }

  // ── 選択モード: 選択解除 ──
  if (e.target.closest('[data-music-select-clear]')) {
    _musicSelection.clear();
    _rerenderMusicBody();
    return true;
  }

  // ── 選択モード: まとめて追加 ──
  if (e.target.closest('[data-music-select-add]')) {
    if (!_musicSelection.size) return true;
    const keys = [...(_musicVideos || [])]
      .filter(v => _musicSelection.has(v.id))
      .map(v => 'mv:' + v.id);
    _openAddModal(keys);
    return true;
  }

  // ── 音楽動画をプレイリストに追加 ──
  const addMvBtn = e.target.closest('[data-playlist-add-mv]');
  if (addMvBtn) {
    const mvId    = addMvBtn.dataset.playlistAddMv;
    const title   = addMvBtn.dataset.streamTitle || '';
    _openAddModal('mv:' + mvId, title);
    return true;
  }

  // ── サムネクリック → 動画ビューワーで再生（左クリックのみ。Ctrl/中クリックは
  //    href の YouTube 新規タブを優先）。モバイルはビューワー側で外部遷移 ──
  const watchThumb = e.target.closest('[data-mv-watch]');
  if (watchThumb && _musicVideos?.length) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return true;
    e.preventDefault();
    const v = _musicVideos[Number(watchThumb.dataset.mvWatch)];
    if (v?.url) openStreamViewer({ url: v.url, title: v.title, isMv: true });
    return true;
  }

  return false;
}

/** 検索欄の input / compositionend を処理する。処理したら true を返す。 */
export function handleMusicSearchInput(e, { immediate = false } = {}) {
  const input = e.target.closest('#pl-music-search');
  if (!input) return false;
  _musicQuery = input.value || '';
  clearTimeout(_musicSearchDebounce);
  if (immediate) {
    _refreshMusicResults();
  } else {
    _musicSearchDebounce = setTimeout(_refreshMusicResults, 100);
  }
  return true;
}

/* ── 描画 ──────────────────────────────────────────────────────────────── */

function _renderOrRefreshMusic() {
  if (!_isActive()) return;
  const body = $('#pl-subtab-body');
  if (!body) return;
  if ($('#pl-music-search')) {
    _refreshMusicResults(); // 入力欄を温存して結果・件数のみ更新
  } else {
    body.innerHTML = _renderMusicLibrary(_musicVideos || []);
  }
}

function _renderMusicLibrary(videos) {
  return _renderMusicViewBar(videos) + `<div id="pl-music-results">${_renderMusicResults(videos)}</div>`;
}

function _renderMusicViewBar(videos) {
  const query = _currentMusicQuery();
  const items = _filterMusicVideos(videos);
  const shown = items.length;
  return `
    <div class="pl-music-viewbar">
      <label class="pl-music-search-wrap">
        <span class="pl-music-search-icon" aria-hidden="true">${icon('search')}</span>
        <input id="pl-music-search" class="pl-music-search" type="search"
          value="${escapeHtml(query)}"
          placeholder="曲名 / アーティストで検索"
          aria-label="歌みた・オリ曲を検索">
      </label>
      <span class="pl-music-count">${shown}${shown === videos.length ? '' : ` / ${videos.length}`}件</span>
      <div class="pl-music-views">
        <button class="pl-music-view-btn${_musicView === 'grid'     ? ' active' : ''}" data-music-view="grid"     type="button">グリッド</button>
        <button class="pl-music-view-btn${_musicView === 'list'     ? ' active' : ''}" data-music-view="list"     type="button">リスト</button>
        <button class="pl-music-view-btn${_musicView === 'category' ? ' active' : ''}" data-music-view="category" type="button">カテゴリ</button>
        <button class="pl-music-view-btn pl-music-select-toggle${_musicSelectMode ? ' active' : ''}" data-music-select-toggle="1" type="button" ${shown ? '' : 'disabled'} data-tooltip="複数選択してまとめて追加">${icon('checkbox')} 選択</button>
      </div>
    </div>
    ${_musicSelectMode ? _renderMusicSelectBar() : ''}`;
}

/** 選択モードのアクションバー */
function _renderMusicSelectBar() {
  const n = _musicSelection.size;
  return `
    <div class="pl-music-selbar">
      <span class="pl-music-selcount" id="pl-music-selcount">${n}曲を選択中</span>
      <div class="pl-music-selactions">
        <button class="pl-sel-btn" data-music-select-all="1" type="button">表示中をすべて選択</button>
        <button class="pl-sel-btn" data-music-select-clear="1" type="button" ${n ? '' : 'disabled'}>選択解除</button>
        <button class="pl-sel-btn primary" data-music-select-add="1" type="button" ${n ? '' : 'disabled'}>${icon('plus')} ${n}曲をまとめて追加</button>
        <button class="pl-sel-btn" data-music-select-toggle="1" type="button">完了</button>
      </div>
    </div>`;
}

function _renderMusicResults(videos) {
  const items = _filterMusicVideos(videos);

  if (_musicLoading && !videos.length) {
    return `<div class="pl-empty-state"><p>読み込み中…</p><p class="pl-empty-hint">検索欄はこのまま入力できます</p></div>`;
  }
  if (!videos.length) {
    return `<div class="pl-empty-state"><p>動画が登録されていません</p><p class="pl-empty-hint">管理画面から登録できます</p></div>`;
  }
  if (!items.length) {
    if (_musicLoading) {
      return `<div class="pl-empty-state"><p>最新データを確認中…</p><p class="pl-empty-hint">「${escapeHtml(_currentMusicQuery())}」の候補を読み込んでいます</p></div>`;
    }
    return `<div class="pl-empty-state"><p>一致する動画がありません</p><p class="pl-empty-hint">「曲名 / アーティスト」のように区切って検索できます</p></div>`;
  }

  if (_musicView === 'grid')     return _renderMusicGrid(items);
  if (_musicView === 'list')     return _renderMusicList(items);
  if (_musicView === 'category') return _renderMusicCategory(items);
  return _renderMusicGrid(items);
}

function _currentMusicQuery() {
  const input = $('#pl-music-search');
  if (input) _musicQuery = input.value || '';
  return _musicQuery;
}

/** 音楽サブタブ本体（ビューバー + 結果）を丸ごと再描画する。
 *  選択モードのトグル/選択変化で、選択バーやチェック状態も含めて更新する。
 *  検索クエリは _musicQuery から value 復元されるため保持される。 */
function _rerenderMusicBody() {
  const body = $('#pl-subtab-body');
  if (body) body.innerHTML = _renderMusicLibrary(_musicVideos || []);
}

/** 選択バーの件数・ボタン状態だけ更新（全再描画なし） */
function _updateMusicSelBar() {
  const n = _musicSelection.size;
  const c = $('#pl-music-selcount');
  if (c) c.textContent = `${n}曲を選択中`;
  const addBtn = document.querySelector('[data-music-select-add]');
  if (addBtn) { addBtn.disabled = !n; addBtn.innerHTML = `${icon('plus')} ${n}曲をまとめて追加`; }
  const clearBtn = document.querySelector('[data-music-select-clear]');
  if (clearBtn) clearBtn.disabled = !n;
}

function _refreshMusicResults() {
  const videos = _musicVideos || [];
  const count = $('.pl-music-count');
  if (count) {
    const shown = _filterMusicVideos(videos).length;
    count.textContent = `${shown}${shown === videos.length ? '' : ` / ${videos.length}`}件`;
  }
  document.querySelectorAll('[data-music-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.musicView === _musicView);
  });
  const results = $('#pl-music-results');
  if (results) results.innerHTML = _renderMusicResults(videos);
}

/* ── データ取得・キャッシュ ─────────────────────────────────────────────── */

function _readMusicVideoCache() {
  try {
    const json = JSON.parse(localStorage.getItem(MUSIC_CACHE_KEY) || 'null');
    return Array.isArray(json?.videos) ? json.videos : [];
  } catch (_) {
    return [];
  }
}

function _writeMusicVideoCache(videos) {
  try {
    localStorage.setItem(MUSIC_CACHE_KEY, JSON.stringify({ videos, cachedAt: Date.now() }));
  } catch (_) {}
}

async function _fetchMusicVideos() {
  if (_musicLoadPromise) return _musicLoadPromise;
  _musicLoadPromise = fetch('/data/music.json', { cache: 'no-store' })
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`music.json ${res.status}`)))
    .then(json => {
      const videos = Array.isArray(json?.videos) ? json.videos : [];
      _writeMusicVideoCache(videos);
      return videos;
    })
    .catch(() => _musicVideos || _readMusicVideoCache());
  return _musicLoadPromise;
}

/* ── 検索 ──────────────────────────────────────────────────────────────── */

function _normMusicSearch(text) {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/[‐-‒–—―ー]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function _musicSearchTokens(query) {
  return _normMusicSearch(query)
    .split(/[\/／|｜\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function _musicSearchText(video) {
  const title = video.title || '';
  const slashParts = title.split(/[\/／|｜]/).map(s => s.trim()).filter(Boolean);
  const typeLabel = mvBadge(video).label;
  return _normMusicSearch([
    title,
    ...slashParts,
    video.originalArtist,
    video.character,
    video.type,
    typeLabel,
  ].filter(Boolean).join(' '));
}

function _filterMusicVideos(videos) {
  const tokens = _musicSearchTokens(_currentMusicQuery());
  const indexed = videos.map((v, i) => ({ v, i }));
  if (!tokens.length) return indexed;
  return indexed.filter(({ v }) => {
    const haystack = _musicSearchText(v);
    return tokens.every(token => haystack.includes(token));
  });
}

function _musicDateText(video) {
  return video.publishedAt ? String(video.publishedAt).replaceAll('-', '/') : '公開日未登録';
}

/* ── カード / リスト / カテゴリ描画 ─────────────────────────────────────── */

function _musicCard(video, globalIdx) {
  // 主=maxres(高解像度)、失敗時は data-fallback の mqdefault に onerror で切り替わる
  const thumb = youtubeThumbHq(video.url);
  const thumbFb = youtubeThumb(video.url);
  const { label: badge, cls: badgeClass } = mvBadge(video);
  const saved = isStreamInAnyPlaylist('mv:' + video.id);
  // 選択モード: カードクリックで選択トグル（再生はしない）
  if (_musicSelectMode) {
    const sel = _musicSelection.has(video.id);
    return `
    <div class="mv-card mv-card--select${sel ? ' is-selected' : ''}">
      <button class="mv-card-thumb-btn" type="button" data-mv-select="${escapeHtml(video.id)}" aria-pressed="${sel}">
        ${thumb
          ? `<img class="mv-card-thumb" src="${escapeHtml(thumb)}" data-fallback="${escapeHtml(thumbFb)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
          : '<div class="mv-card-thumb mv-card-thumb-placeholder"></div>'}
        <span class="mv-card-checkbox">${sel ? icon('check') : ''}</span>
        <span class="mv-type-badge ${badgeClass}">${badge}</span>
      </button>
      <div class="mv-card-info">
        <span class="mv-card-title">${escapeHtml(video.title || '—')}</span>
        <span class="mv-card-sub">${escapeHtml(_musicDateText(video))}</span>
      </div>
    </div>`;
  }
  return `
    <div class="mv-card">
      <a class="mv-card-thumb-btn" href="${escapeHtml(video.url || '#')}" target="_blank" rel="noopener"
        data-mv-watch="${globalIdx}" aria-label="動画ビューワーで見る">
        ${thumb
          ? `<img class="mv-card-thumb" src="${escapeHtml(thumb)}" data-fallback="${escapeHtml(thumbFb)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
          : '<div class="mv-card-thumb mv-card-thumb-placeholder"></div>'}
        <span class="mv-card-play-icon">${icon('play')}</span>
        <span class="mv-type-badge ${badgeClass}">${badge}</span>
      </a>
      <button class="pl-sg-add mv-add-btn mv-add-btn--overlay${saved ? ' is-saved' : ''}" type="button"
        data-playlist-add-mv="${escapeHtml(video.id)}"
        data-stream-title="${escapeHtml(video.title || '')}"
        aria-label="${saved ? 'プレイリストに保存済み' : 'プレイリストに追加'}"
        title="${saved ? 'プレイリストに保存済み' : 'プレイリストに追加'}">${PL_BOOKMARK_SVG}</button>
      <div class="mv-card-info">
        <span class="mv-card-title">${escapeHtml(video.title || '—')}</span>
        <span class="mv-card-sub">${escapeHtml(_musicDateText(video))}</span>
      </div>
    </div>`;
}

function _musicListRow(video, globalIdx) {
  // 主=maxres(高解像度)、失敗時は data-fallback の mqdefault に onerror で切り替わる
  const thumb = youtubeThumbHq(video.url);
  const thumbFb = youtubeThumb(video.url);
  const { label: badge, cls: badgeClass, sub } = mvBadge(video);
  const saved = isStreamInAnyPlaylist('mv:' + video.id);
  if (_musicSelectMode) {
    const sel = _musicSelection.has(video.id);
    return `
    <div class="mv-list-row mv-list-row--select${sel ? ' is-selected' : ''}" data-mv-select="${escapeHtml(video.id)}" role="button" aria-pressed="${sel}">
      <span class="mv-list-checkbox">${sel ? icon('check') : ''}</span>
      <span class="mv-list-thumb">
        ${thumb
          ? `<img src="${escapeHtml(thumb)}" data-fallback="${escapeHtml(thumbFb)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
          : ''}
      </span>
      <div class="mv-list-info">
        <span class="mv-list-title">${escapeHtml(video.title || '—')}</span>
        <span class="mv-list-sub">${escapeHtml(_musicDateText(video))}</span>
      </div>
      <span class="mv-type-badge ${badgeClass}">${badge}</span>
    </div>`;
  }
  return `
    <div class="mv-list-row">
      <a class="mv-list-thumb" href="${escapeHtml(video.url || '#')}" target="_blank" rel="noopener" aria-label="YouTubeで開く">
        ${thumb
          ? `<img src="${escapeHtml(thumb)}" data-fallback="${escapeHtml(thumbFb)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
          : ''}
      </a>
      <div class="mv-list-info">
        <span class="mv-list-title">${escapeHtml(video.title || '—')}</span>
        <span class="mv-list-sub">${escapeHtml(_musicDateText(video))}</span>
      </div>
      <span class="mv-type-badge ${badgeClass}">${badge}</span>
      <button class="mv-add-btn${saved ? ' is-saved' : ''}" type="button"
        data-playlist-add-mv="${escapeHtml(video.id)}"
        data-stream-title="${escapeHtml(video.title || '')}"
        title="${saved ? 'プレイリストに保存済み' : 'プレイリストに追加'}">${icon('bookmark')}</button>
    </div>`;
}

function _renderMusicGrid(items) {
  return `<div class="mv-grid">${items.map(({ v, i }) => _musicCard(v, i)).join('')}</div>`;
}

function _renderMusicList(items) {
  return `<div class="mv-list">${items.map(({ v, i }) => _musicListRow(v, i)).join('')}</div>`;
}

function _renderMusicCategory(items) {
  // カテゴリビューでは全動画リストのインデックスをそのまま使う
  const sections = [
    { key: 'original',  label: 'オリジナル曲（個人）' },
    { key: 'sugarily',  label: 'しゅがりり' },
    { key: 'character', label: 'キャラソン / 声優オリ曲' },
    { key: 'cover',     label: 'カバー曲（歌みた）' },
  ].map(({ key, label }) => ({
    label,
    items: items.filter(({ v }) => v.type === key),
  })).filter(({ items }) => items.length > 0);

  return `
    <div class="mv-category">
      ${sections.map(({ label, items }) => `
      <div class="mv-cat-section">
        <h3 class="mv-cat-heading">${label} <span class="mv-cat-count">${items.length}</span></h3>
        <div class="mv-grid">${items.map(({ v, i }) => _musicCard(v, i)).join('')}</div>
      </div>`).join('')}
    </div>`;
}
