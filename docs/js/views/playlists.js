/**
 * プレイリスト管理ビュー
 *
 * Sub-tabs:
 *   「歌枠一覧」  — 全配信枠をサムネグリッド表示
 *   「歌みた・オリ曲」— music.json の動画ライブラリ（グリッド/リスト/カテゴリ切替）
 *   「マイリスト」 — localStorage 保存のユーザー作成プレイリスト
 *
 * localStorage データ形式:
 *   ibara-playlists = [{ id, name, createdAt, streams: [streamKey|"mv:<id>",...] }]
 */

import { state } from '../store.js';
import { $, escapeHtml, fmtDate, streamKey, youtubeThumb, youtubeThumbFallback, youtubeVideoId } from '../utils.js';

const STORAGE_KEY = 'ibara-playlists';
const MUSIC_CACHE_KEY = 'ibara-music-videos-cache-v2';
const PER_PAGE    = 24; // 4列 × 6行

/* ── モジュールレベルの状態（サブタブ / ページ） ─────────────────────────── */

let _activeSubTab = 'all-streams';
let _streamPage   = 1;
let _streamSort   = 'newest';
let _musicView    = 'grid';     // 'grid' | 'list' | 'category'
let _musicVideos  = null;       // キャッシュ済み music.json の videos 配列
let _musicLoadPromise = null;
let _musicLoading = false;
let _musicQuery   = '';
let _musicSearchDebounce = null;

/* ── データ操作（localStorage） ─────────────────────────────────────────── */

export function getPlaylists() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch (_) { return []; }
}

function savePlaylists(lists) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lists)); } catch (_) {}
}

export function createPlaylist(name) {
  const lists = getPlaylists();
  const pl = {
    id: String(Date.now()),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    streams: [],
  };
  lists.unshift(pl);
  savePlaylists(lists);
  return pl;
}

export function deletePlaylist(id) {
  savePlaylists(getPlaylists().filter(p => p.id !== id));
}

export function addStreamToPlaylist(playlistId, skey) {
  const lists = getPlaylists();
  const pl = lists.find(p => p.id === playlistId);
  if (!pl) return false;
  if (pl.streams.includes(skey)) return false;
  pl.streams.push(skey);
  savePlaylists(lists);
  return true;
}

export function removeStreamFromPlaylist(playlistId, skey) {
  const lists = getPlaylists();
  const pl = lists.find(p => p.id === playlistId);
  if (!pl) return;
  pl.streams = pl.streams.filter(s => s !== skey);
  savePlaylists(lists);
}

export function isStreamInAnyPlaylist(skey) {
  return getPlaylists().some(p => p.streams.includes(skey));
}

/* ── メイン描画 ────────────────────────────────────────────────────────── */

export function renderPlaylists() {
  const panel = $('#panel-playlists');
  if (!panel) return;

  const allStreams = state.data?.streams || [];

  // データ更新などによる全再描画で検索欄のフォーカスが失われないよう退避
  const searchHadFocus = document.activeElement?.id === 'pl-music-search';
  let searchSel = null;
  if (searchHadFocus) {
    try { searchSel = document.activeElement.selectionStart; } catch (_) {}
    _musicQuery = document.activeElement.value || '';
  }

  panel.innerHTML = `
    <div class="pl-wrap">
      <nav class="pl-subtabs" role="tablist" aria-label="プレイリストサブタブ">
        <button class="pl-subtab${_activeSubTab === 'all-streams'  ? ' active' : ''}"
          data-pl-subtab="all-streams"  role="tab"
          aria-selected="${_activeSubTab === 'all-streams'}">歌枠一覧</button>
        <button class="pl-subtab${_activeSubTab === 'music' ? ' active' : ''}"
          data-pl-subtab="music" role="tab"
          aria-selected="${_activeSubTab === 'music'}">歌みた・オリ曲</button>
        <button class="pl-subtab${_activeSubTab === 'my-playlists' ? ' active' : ''}"
          data-pl-subtab="my-playlists" role="tab"
          aria-selected="${_activeSubTab === 'my-playlists'}">
          マイリスト
          <span class="pl-subtab-count">${getPlaylists().length}</span>
        </button>
      </nav>
      <div class="pl-subtab-body" id="pl-subtab-body">
        ${_activeSubTab === 'all-streams'
          ? _renderAllStreams(allStreams, _streamPage)
          : _activeSubTab === 'music'
            ? _renderMusicSubtab()
            : _renderMyPlaylists(allStreams)}
      </div>
    </div>
  `;

  // music サブタブ表示中は常にローダーを起動（未取得なら fetch、取得済みなら結果同期）
  if (_activeSubTab === 'music') _loadAndRenderMusic();

  // 検索欄のフォーカス・カーソル位置を復元
  if (searchHadFocus) {
    const inp = $('#pl-music-search');
    if (inp) {
      inp.focus();
      if (searchSel !== null) { try { inp.setSelectionRange(searchSel, searchSel); } catch (_) {} }
    }
  }

  // サブタブ切り替え（panel.onclick で毎回上書き → リスナー重複なし）
  panel.onclick = (e) => {
    // ── サブタブ ──
    const subtabBtn = e.target.closest('[data-pl-subtab]');
    if (subtabBtn) {
      _activeSubTab = subtabBtn.dataset.plSubtab;
      if (_activeSubTab === 'all-streams') _streamPage = 1;
      renderPlaylists(); // music サブタブのローダーは renderPlaylists 内で起動される
      return;
    }

    // ── ソート ──
    const sortBtn = e.target.closest('[data-pl-sort]');
    if (sortBtn) {
      _streamSort = sortBtn.dataset.plSort;
      _streamPage = 1;
      _renderPageInPlace(allStreams);
      return;
    }

    // ── ページネーション ──
    const pageBtn = e.target.closest('[data-pl-page]');
    if (pageBtn && !pageBtn.disabled) {
      _streamPage = Number(pageBtn.dataset.plPage);
      _renderPageInPlace(allStreams);
      return;
    }

    // ── 音楽ビュー切替 ──
    const viewBtn = e.target.closest('[data-music-view]');
    if (viewBtn) {
      _musicView = viewBtn.dataset.musicView;
      _refreshMusicResults();
      return;
    }

    // ── 音楽再生 ──
    const playMusicBtn = e.target.closest('[data-play-music]');
    if (playMusicBtn && _musicVideos?.length) {
      const idx = Number(playMusicBtn.dataset.playMusic);
      import('../music-player.js').then(m => m.playMusicQueue(_musicVideos, idx));
      return;
    }

    // ── 動画視聴（ストリームビューワーで開く）──
    const watchMusicBtn = e.target.closest('[data-watch-music]');
    if (watchMusicBtn && _musicVideos?.length) {
      const idx = Number(watchMusicBtn.dataset.watchMusic);
      const video = _musicVideos[idx];
      if (video?.url) window.__openStreamViewer?.({ url: video.url, title: video.title, isMv: true });
      return;
    }

    // ── 音楽動画をプレイリストに追加 ──
    const addMvBtn = e.target.closest('[data-playlist-add-mv]');
    if (addMvBtn) {
      const mvId    = addMvBtn.dataset.playlistAddMv;
      const title   = addMvBtn.dataset.streamTitle || '';
      showAddToPlaylistModal('mv:' + mvId, title);
      return;
    }

    if (_activeSubTab === 'my-playlists') {
      _handleMyPlaylistsClick(e, allStreams);
    }
  };

  // 検索: 入力欄は描画し直さず結果(#pl-music-results)だけ差し替えるので、
  // IME 変換中でもライブフィルタして問題ない（抑制ロジック不要）
  panel.oninput = (e) => {
    const input = e.target.closest('#pl-music-search');
    if (!input) return;
    _musicQuery = input.value || '';
    clearTimeout(_musicSearchDebounce);
    _musicSearchDebounce = setTimeout(_refreshMusicResults, 100);
  };
  // IME 確定直後にも即時反映（ブラウザ差異対策）
  panel.oncompositionend = (e) => {
    const input = e.target.closest('#pl-music-search');
    if (!input) return;
    _musicQuery = input.value || '';
    clearTimeout(_musicSearchDebounce);
    _refreshMusicResults();
  };

  // サムネ 404 フォールバック
  panel.addEventListener('error', (e) => {
    const img = e.target;
    if (!img.classList.contains('pl-sg-thumb')) return;
    const fb = img.dataset.fallback;
    if (fb && img.src !== fb) { img.src = fb; delete img.dataset.fallback; }
  }, true);
}


/* ── 歌枠一覧グリッド ──────────────────────────────────────────────────── */

const SORT_OPTIONS = [
  { key: 'newest',      label: '新しい順' },
  { key: 'oldest',      label: '古い順'   },
  { key: 'most-songs',  label: '曲数↓'    },
  { key: 'fewest-songs',label: '曲数↑'    },
];

function _sortStreams(streams, sort) {
  const s = streams.slice();
  if (sort === 'oldest')       return s.reverse();
  if (sort === 'most-songs')   return s.sort((a, b) => (b.songs?.length ?? 0) - (a.songs?.length ?? 0));
  if (sort === 'fewest-songs') return s.sort((a, b) => (a.songs?.length ?? 0) - (b.songs?.length ?? 0));
  return s; // newest (default — already sorted newest-first in store)
}

function _renderAllStreams(streams, page) {
  if (!streams.length) {
    return `
      <div class="pl-empty-state">
        <p>配信データを読み込んでいます…</p>
        <p class="pl-empty-hint">先にタイムラインタブを開くとすぐに表示されます</p>
      </div>`;
  }

  const sorted     = _sortStreams(streams, _streamSort);
  const total      = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage   = Math.min(Math.max(1, page), totalPages);
  const start      = (safePage - 1) * PER_PAGE;
  const slice      = sorted.slice(start, start + PER_PAGE);

  const cards = slice.map(s => {
    const skey = streamKey(s);
    const thumb = youtubeThumb(s.url);
    const thumbFb = youtubeThumbFallback(s.url);
    const songCount = s.songs?.length ?? 0;
    return `
      <button class="pl-sg-card" type="button" data-stream-play="${escapeHtml(skey)}"
        title="${escapeHtml(s.title || '配信')}">
        <div class="pl-sg-thumb-wrap">
          ${thumb
            ? `<img class="pl-sg-thumb" src="${escapeHtml(thumb)}"
                data-fallback="${escapeHtml(thumbFb)}"
                alt="" loading="lazy" referrerpolicy="no-referrer">`
            : '<div class="pl-sg-thumb-placeholder"></div>'}
          <span class="pl-sg-song-badge">${songCount}<span class="pl-sg-badge-unit">曲</span></span>
        </div>
        <div class="pl-sg-info">
          <span class="pl-sg-title">${escapeHtml(s.title || '配信')}</span>
          <span class="pl-sg-date">${escapeHtml(fmtDate(s.date) || '')}</span>
        </div>
      </button>`;
  }).join('');

  const pagination = totalPages > 1 ? `
    <div class="pl-pagination">
      <button class="pl-page-btn" data-pl-page="${safePage - 1}"
        ${safePage <= 1 ? 'disabled' : ''} type="button" aria-label="前のページ">前へ</button>
      <span class="pl-page-info">${safePage} / ${totalPages}</span>
      <button class="pl-page-btn" data-pl-page="${safePage + 1}"
        ${safePage >= totalPages ? 'disabled' : ''} type="button" aria-label="次のページ">次へ</button>
    </div>` : '';

  const sortBar = `
    <div class="pl-sort-bar">
      ${SORT_OPTIONS.map(o => `
        <button class="pl-sort-opt${_streamSort === o.key ? ' active' : ''}"
          data-pl-sort="${o.key}" type="button">${o.label}</button>`).join('')}
    </div>`;

  return `${sortBar}<div class="pl-stream-grid" id="pl-stream-grid">${cards}</div>${pagination}`;
}

/** ページ切替時はグリッド部分だけ差し替えてスクロールを戻す */
function _renderPageInPlace(allStreams) {
  const body = $('#pl-subtab-body');
  if (!body) { renderPlaylists(); return; }
  body.innerHTML = _renderAllStreams(allStreams, _streamPage);
  // サムネフォールバック再セット
  const panel = $('#panel-playlists');
  if (panel) {
    panel.addEventListener('error', (e) => {
      const img = e.target;
      if (!img.classList.contains('pl-sg-thumb')) return;
      const fb = img.dataset.fallback;
      if (fb && img.src !== fb) { img.src = fb; delete img.dataset.fallback; }
    }, { once: true, capture: true });
  }
  body.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── 歌みた・オリ曲ライブラリ ──────────────────────────────────────────── */

/** music サブタブの初期 HTML（renderPlaylists から同期呼び出し） */
function _renderMusicSubtab() {
  if (_musicVideos === null) {
    const cached = _readMusicVideoCache();
    if (cached.length) _musicVideos = cached;
  }
  return _renderMusicLibrary(_musicVideos || []);
}

/** music.json を取得して結果を反映する。
 *  検索欄が既に DOM にある場合は結果リストだけ差し替え、
 *  入力中のフォーカス・IME 変換を絶対に壊さない。 */
async function _loadAndRenderMusic() {
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

function _renderOrRefreshMusic() {
  if (_activeSubTab !== 'music') return;
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
        <span class="pl-music-search-icon" aria-hidden="true">⌕</span>
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
  const typeLabel = _mvBadge(video).label;
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

function _mvBadge(video) {
  switch (video.type) {
    case 'cover':     return { label: 'カバー',    cls: 'mv-badge-cover',     sub: video.originalArtist || 'カバー曲' };
    case 'office':    return { label: 'Re:AcT',    cls: 'mv-badge-office',    sub: 'Re:AcT' };
    case 'character': return { label: 'キャラ',    cls: 'mv-badge-character', sub: video.character || 'キャラソン' };
    default:          return { label: 'オリジナル', cls: 'mv-badge-original',  sub: '茨むあん' };
  }
}

function _musicCard(video, globalIdx) {
  const thumb = youtubeThumb(video.url);
  const thumbFb = youtubeThumbFallback(video.url);
  const { label: badge, cls: badgeClass, sub } = _mvBadge(video);
  return `
    <div class="mv-card">
      <button class="mv-card-thumb-btn" type="button" data-play-music="${globalIdx}" aria-label="再生">
        ${thumb
          ? `<img class="mv-card-thumb" src="${escapeHtml(thumb)}" data-fallback="${escapeHtml(thumbFb)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
          : '<div class="mv-card-thumb mv-card-thumb-placeholder"></div>'}
        <span class="mv-card-play-icon">▶</span>
        <span class="mv-type-badge ${badgeClass}">${badge}</span>
      </button>
      <div class="mv-card-info">
        <span class="mv-card-title">${escapeHtml(video.title || '—')}</span>
        <span class="mv-card-sub">${escapeHtml(sub)}</span>
      </div>
      <div class="mv-card-actions">
        <button class="mv-watch-btn" type="button" data-watch-music="${globalIdx}" title="動画で見る">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v12H4V6zm5.5 3.5 5 3-5 3v-6z"/></svg>
        </button>
        <button class="mv-add-btn" type="button"
          data-playlist-add-mv="${escapeHtml(video.id)}"
          data-stream-title="${escapeHtml(video.title || '')}"
          title="プレイリストに追加">＋</button>
      </div>
    </div>`;
}

function _musicListRow(video, globalIdx) {
  const { label: badge, cls: badgeClass, sub } = _mvBadge(video);
  return `
    <div class="mv-list-row">
      <span class="mv-list-num">${globalIdx + 1}</span>
      <button class="mv-list-play" type="button" data-play-music="${globalIdx}" aria-label="再生">▶</button>
      <div class="mv-list-info">
        <span class="mv-list-title">${escapeHtml(video.title || '—')}</span>
        <span class="mv-list-sub">${escapeHtml(sub)}</span>
      </div>
      <span class="mv-type-badge ${badgeClass}">${badge}</span>
      <button class="mv-watch-btn" type="button" data-watch-music="${globalIdx}" title="動画で見る">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v12H4V6zm5.5 3.5 5 3-5 3v-6z"/></svg>
      </button>
      <button class="mv-add-btn" type="button"
        data-playlist-add-mv="${escapeHtml(video.id)}"
        data-stream-title="${escapeHtml(video.title || '')}"
        title="プレイリストに追加">＋</button>
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
    { key: 'office',    label: 'Re:AcT オリ曲' },
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

/** 外部から music.json キャッシュにアクセス */
export function getMusicVideos() { return _musicVideos || []; }

/** 音楽 playlist item ("mv:<id>") から動画オブジェクトを解決 */
export function resolveMusicVideoId(mvKey) {
  if (!mvKey?.startsWith('mv:')) return null;
  const id = mvKey.slice(3);
  return (_musicVideos || []).find(v => v.id === id) || null;
}

/* ── マイリスト ────────────────────────────────────────────────────────── */

function _renderMyPlaylists(allStreams) {
  const lists = getPlaylists();
  if (!lists.length) {
    return `
      <div class="pl-empty-state">
        <p>まだプレイリストがありません</p>
        <p class="pl-empty-hint">タイムラインの配信枠から <strong>☆ 保存</strong> を押して追加できます</p>
      </div>
      <div class="pl-my-actions">
        <button class="pl-new-btn" id="pl-new-btn" type="button">＋ 新規作成</button>
      </div>`;
  }

  return `
    <div class="pl-my-actions">
      <span class="pl-my-count">${lists.length}件のプレイリスト</span>
      <button class="pl-new-btn" id="pl-new-btn" type="button">＋ 新規作成</button>
    </div>
    <div class="pl-grid">
      ${lists.map(pl => _renderPlaylistCard(pl, allStreams)).join('')}
    </div>`;
}

function _renderPlaylistCard(pl, allStreams) {
  const entries = pl.streams.map(skey => {
    const isMv = skey.startsWith('mv:');
    const mv   = isMv ? resolveMusicVideoId(skey) : null;
    return { skey, isMv, mv, stream: isMv ? null : allStreams.find(s => streamKey(s) === skey) };
  });

  const firstUrl = entries.find(({ stream, mv }) => stream?.url || mv?.url)?.stream?.url
    || entries.find(({ mv }) => mv?.url)?.mv?.url;
  const coverThumbs = firstUrl
    ? `<img class="pl-card-cover" src="${escapeHtml(youtubeThumb(firstUrl))}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : '';

  const totalItems = entries.length;
  const items = entries.map(({ skey, isMv, mv, stream }, rowIdx) => {
    const moveKey = escapeHtml(pl.id + '|:|' + skey);
    const sortBtns = `
      <div class="pl-sort-btns">
        <button class="pl-sort-btn" data-pl-move="${moveKey}|:|up"
          type="button" title="上へ" ${rowIdx === 0 ? 'disabled' : ''}>↑</button>
        <button class="pl-sort-btn" data-pl-move="${moveKey}|:|down"
          type="button" title="下へ" ${rowIdx === totalItems - 1 ? 'disabled' : ''}>↓</button>
      </div>`;
    const rmBtn = `<button class="pl-rm-btn" data-pl-rm-stream="${moveKey}" type="button" title="削除">✕</button>`;

    if (isMv) {
      if (!mv) return `
        <div class="pl-stream-row pl-stream-missing">${sortBtns}
          <span class="pl-stream-title">（動画データなし）</span>${rmBtn}
        </div>`;
      const { label: badge, sub } = _mvBadge(mv);
      const mvTypeKey = mv.type || 'original';
      const mvIdx = (_musicVideos || []).indexOf(mv);
      return `
        <div class="pl-stream-row">
          ${sortBtns}
          <div class="pl-stream-info">
            <span class="pl-stream-date"><span class="mv-badge-inline mv-type-${mvTypeKey}">${badge}</span></span>
            <span class="pl-stream-title">${escapeHtml(mv.title || '—')}</span>
            <span class="pl-stream-meta">${escapeHtml(sub)}</span>
          </div>
          <div class="pl-stream-actions">
            ${mvIdx >= 0
              ? `<button class="pl-play-stream-btn" data-play-music-pl="${mvIdx}" type="button" title="再生">▶</button>`
              : ''}
            ${rmBtn}
          </div>
        </div>`;
    }

    if (!stream) return `
      <div class="pl-stream-row pl-stream-missing">${sortBtns}
        <span class="pl-stream-title">（配信データなし）</span>${rmBtn}
      </div>`;
    return `
      <div class="pl-stream-row">
        ${sortBtns}
        <div class="pl-stream-info">
          <span class="pl-stream-date">${fmtDate(stream.date)}</span>
          <span class="pl-stream-title">${escapeHtml(stream.title || '配信')}</span>
          <span class="pl-stream-meta">第${stream.index}枠 · ${stream.songs?.length ?? 0}曲</span>
        </div>
        <div class="pl-stream-actions">
          ${stream.url
            ? `<button class="pl-play-stream-btn" data-pl-play-stream="${escapeHtml(skey)}"
                type="button" title="再生">▶</button>`
            : ''}
          ${rmBtn}
        </div>
      </div>`;
  }).join('');

  // YouTube共有可能な動画IDを収集（stream のみ、mv: は除外）
  const videoIds = entries
    .map(({ stream, mv }) => {
      const url = stream?.url || mv?.url;
      return url ? youtubeVideoId(url) : '';
    })
    .filter(Boolean);

  return `
    <div class="pl-card">
      <div class="pl-card-head">
        ${coverThumbs ? `<div class="pl-card-cover-wrap">${coverThumbs}</div>` : ''}
        <div class="pl-card-head-info">
          <button class="pl-card-name" data-pl-rename="${escapeHtml(pl.id)}"
            type="button" title="クリックで名前変更">${escapeHtml(pl.name)}</button>
          <span class="pl-card-count">${pl.streams.length}件</span>
        </div>
        <button class="pl-del-btn" data-pl-del="${escapeHtml(pl.id)}"
          type="button" title="プレイリストを削除">🗑</button>
      </div>
      <div class="pl-stream-list">
        ${items || '<div class="pl-stream-empty">配信が追加されていません</div>'}
      </div>
      ${(videoIds.length || pl.streams.length) ? `
      <div class="pl-card-footer">
        ${videoIds.length ? `
        <button class="pl-yt-share-btn" data-pl-yt-share="${escapeHtml(pl.id)}"
          type="button" title="YouTubeで連続再生（一時的なプレイリストとして開きます）">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>
          YouTubeで連続再生 (${videoIds.length}本)
        </button>` : ''}
        ${pl.streams.length ? `
        <button class="pl-yt-share-btn" data-pl-share="${escapeHtml(pl.id)}"
          type="button" title="このプレイリストの共有リンクをコピー">🔗 リンクを共有</button>` : ''}
      </div>` : ''}
    </div>`;
}

function _handleMyPlaylistsClick(e, allStreams) {
  // 新規作成
  if (e.target.closest('#pl-new-btn')) {
    _promptCreate();
    return;
  }
  // プレイリスト共有リンクをコピー
  const shareBtn = e.target.closest('[data-pl-share]');
  if (shareBtn) {
    const pl = getPlaylists().find(p => p.id === shareBtn.dataset.plShare);
    if (!pl) return;
    const payload = JSON.stringify({ n: pl.name, s: pl.streams });
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(payload)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = `${location.origin}${location.pathname}?pl=${b64}`;
    const done = (ok) => {
      shareBtn.textContent = ok ? '✓ コピーしました' : 'コピーできません';
      setTimeout(() => { shareBtn.textContent = '🔗 リンクを共有'; }, 1600);
    };
    navigator.clipboard?.writeText(url).then(() => done(true)).catch(() => {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        done(ok);
      } catch (_) { done(false); }
    });
    return;
  }
  // プレイリスト削除
  const delBtn = e.target.closest('[data-pl-del]');
  if (delBtn) {
    const id = delBtn.dataset.plDel;
    const pl = getPlaylists().find(p => p.id === id);
    if (pl && confirm(`「${pl.name}」を削除しますか？`)) {
      deletePlaylist(id);
      renderPlaylists();
    }
    return;
  }
  // 配信削除
  const rmBtn = e.target.closest('[data-pl-rm-stream]');
  if (rmBtn) {
    const [plId, skey] = rmBtn.dataset.plRmStream.split('|:|');
    removeStreamFromPlaylist(plId, skey);
    renderPlaylists();
    return;
  }
  // 再生（プレイリスト内の配信）
  const playBtn = e.target.closest('[data-pl-play-stream]');
  if (playBtn) {
    const skey = playBtn.dataset.plPlayStream;
    const found = allStreams.find(s => streamKey(s) === skey);
    if (found?.url) window.__openStreamViewer?.(found);
    return;
  }
  // 再生（プレイリスト内の音楽動画）
  const playMvBtn = e.target.closest('[data-play-music-pl]');
  if (playMvBtn && _musicVideos?.length) {
    const idx = Number(playMvBtn.dataset.playMusicPl);
    import('../music-player.js').then(m => m.playMusicQueue(_musicVideos, idx));
    return;
  }
  // プレイリスト名変更
  const nameEl = e.target.closest('[data-pl-rename]');
  if (nameEl) {
    const id = nameEl.dataset.plRename;
    const pl = getPlaylists().find(p => p.id === id);
    if (!pl) return;
    const newName = prompt('プレイリスト名', pl.name)?.trim();
    if (newName) {
      const lists = getPlaylists();
      const target = lists.find(p => p.id === id);
      if (target) { target.name = newName; savePlaylists(lists); renderPlaylists(); }
    }
    return;
  }

  // 並び替え（↑↓）
  const moveBtn = e.target.closest('[data-pl-move]');
  if (moveBtn) {
    const parts = moveBtn.dataset.plMove.split('|:|');
    const [plId, skey, dir] = parts; // plId|:|skey|:|up or down
    const lists = getPlaylists();
    const pl = lists.find(p => p.id === plId);
    if (!pl) return;
    const idx = pl.streams.indexOf(skey);
    if (idx < 0) return;
    if (dir === 'up' && idx > 0) {
      [pl.streams[idx - 1], pl.streams[idx]] = [pl.streams[idx], pl.streams[idx - 1]];
      savePlaylists(lists);
      renderPlaylists();
    } else if (dir === 'down' && idx < pl.streams.length - 1) {
      [pl.streams[idx], pl.streams[idx + 1]] = [pl.streams[idx + 1], pl.streams[idx]];
      savePlaylists(lists);
      renderPlaylists();
    }
    return;
  }

  // YouTubeで連続再生
  const ytShareBtn = e.target.closest('[data-pl-yt-share]');
  if (ytShareBtn) {
    const plId = ytShareBtn.dataset.plYtShare;
    const pl = getPlaylists().find(p => p.id === plId);
    if (!pl) return;
    const videoIds = pl.streams
      .map(skey => allStreams.find(s => streamKey(s) === skey))
      .filter(s => s?.url)
      .map(s => youtubeVideoId(s.url))
      .filter(Boolean);
    if (!videoIds.length) {
      alert('YouTubeのURLが登録されている配信がありません');
      return;
    }
    const url = `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(',')}`;
    window.open(url, '_blank', 'noopener noreferrer');
    return;
  }
}

function _promptCreate() {
  const name = prompt('プレイリスト名を入力してください')?.trim();
  if (!name) return;
  createPlaylist(name);
  renderPlaylists();
}

/* ── プレイリスト追加モーダル（タイムラインから呼ばれる） ──────────────── */

export function showAddToPlaylistModal(skey, streamTitle) {
  let modal = $('#pl-add-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'pl-add-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
  }

  const lists = getPlaylists();

  const _rebuildModal = () => {
    const currentLists = getPlaylists();
    const listHtml = !currentLists.length
      ? '<p class="pl-modal-empty">プレイリストがありません<br><span style="font-size:11px">先に「新しいプレイリストを作成」してください</span></p>'
      : currentLists.map(pl => {
          const added = pl.streams.includes(skey);
          return `
            <button class="pl-modal-item${added ? ' pl-modal-item--added' : ' pl-modal-item--free'}"
              data-pl-add="${escapeHtml(pl.id)}"
              ${added ? 'disabled aria-disabled="true"' : ''} type="button">
              <div class="pl-modal-item-info">
                <span class="pl-modal-item-name">${escapeHtml(pl.name)}</span>
                <span class="pl-modal-item-count">${pl.streams.length}枠</span>
              </div>
              <span class="pl-modal-item-status${added ? ' status--added' : ' status--free'}">
                ${added ? '<span class="pl-modal-status-check">✓</span> 登録済み' : '＋ 追加'}
              </span>
            </button>`;
        }).join('');

    modal.innerHTML = `
      <div class="pl-modal-backdrop" id="pl-modal-backdrop"></div>
      <div class="pl-modal-box" role="dialog" aria-modal="true" aria-label="プレイリストに追加">
        <div class="pl-modal-head">
          <span class="pl-modal-head-title">保存先を選択</span>
          <button class="pl-modal-close" id="pl-modal-close" type="button" aria-label="閉じる">✕</button>
        </div>
        <div class="pl-modal-sub">${escapeHtml(streamTitle || '配信')}</div>
        <div class="pl-modal-list" id="pl-modal-list">${listHtml}</div>
        <button class="pl-modal-new" id="pl-modal-new" type="button">
          <span class="pl-modal-new-icon">＋</span> 新しいプレイリストを作成
        </button>
      </div>`;
    modal.hidden = false;

    modal.querySelector('#pl-modal-close').addEventListener('click', close);
    modal.querySelector('#pl-modal-backdrop').addEventListener('click', close);

    modal.querySelector('#pl-modal-new').addEventListener('click', () => {
      const name = prompt('プレイリスト名')?.trim();
      if (!name) return;
      const pl = createPlaylist(name);
      addStreamToPlaylist(pl.id, skey);
      close();
      _showToast(`「${name}」に追加しました`);
    });

    // 未登録のプレイリスト行をクリックで即追加
    modal.querySelectorAll('[data-pl-add]:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const plId = btn.dataset.plAdd;
        const pl = getPlaylists().find(p => p.id === plId);
        addStreamToPlaylist(plId, skey);
        // モーダルを再描画して登録済み表示に切り替え
        _rebuildModal();
        _showToast(`「${pl?.name}」に追加しました`);
      });
    });
  };

  const close = () => { modal.hidden = true; };
  _rebuildModal();

  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
}

function _showToast(msg) {
  let toast = $('#pl-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pl-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('pl-toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('pl-toast--show'), 2500);
}
