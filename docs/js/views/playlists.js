/**
 * プレイリスト管理ビュー（facade）
 *
 * Sub-tabs:
 *   「歌枠一覧」  — playlists/all-streams.js
 *   「歌みた・オリ曲」— playlists/music-library.js
 *   「マイリスト」 — playlists/my-lists.js
 *
 * この facade はサブタブの状態・シェル描画・イベント委譲だけを持ち、
 * 各サブタブの描画/ロジックはサブモジュールが所有する。
 * 外部公開 API は従来どおりここから re-export して互換を維持する。
 */

import { state } from '../store.js';
import { $ } from '../utils.js';
import {
  initMusicLibrary,
  renderMusicSubtab,
  loadAndRenderMusic,
  ensureMusicVideos,
  handleMusicClick,
  handleMusicSearchInput,
  setMusicQuery,
} from './playlists/music-library.js';
import {
  initAllStreams,
  renderAllStreams,
  resetStreamPage,
  handleAllStreamsClick,
} from './playlists/all-streams.js';
import {
  initMyLists,
  renderMyPlaylists,
  handleMyListsClick,
  initDragSort,
  getPlaylists,
  showAddToPlaylistModal,
} from './playlists/my-lists.js';

// ── 外部公開 API（従来の import 先を維持するための re-export） ──────────────
export {
  getPlaylists,
  createPlaylist,
  deletePlaylist,
  addStreamToPlaylist,
  removeStreamFromPlaylist,
  showAddToPlaylistModal,
} from './playlists/my-lists.js';
export { getMusicVideos, resolveMusicVideoId } from './playlists/music-library.js';
// プレイリスト所属判定は player/playlists-store.js が所有（ビュー間依存を作らないため）
export { isStreamInAnyPlaylist } from '../player/playlists-store.js';

/* ── モジュールレベルの状態（サブタブ） ─────────────────────────────────── */

let _activeSubTab = 'all-streams';

/* ── メイン描画 ────────────────────────────────────────────────────────── */

export function renderPlaylists() {
  const panel = $('#panel-playlists');
  if (!panel) return;

  initMusicLibrary({
    isActive: () => _activeSubTab === 'music',
    openAddModal: (keys, title) => showAddToPlaylistModal(keys, title),
  });
  initAllStreams({ rerender: renderPlaylists });
  initMyLists({ rerender: renderPlaylists });

  const allStreams = state.data?.streams || [];

  // マイリストに mv: 項目があるとき music.json 未ロードだと「動画データなし」に
  // なるため、マイリスト表示時はキャッシュ即時反映 + 未取得なら fetch して再描画
  if (_activeSubTab === 'my-playlists') {
    ensureMusicVideos(() => {
      if (_activeSubTab === 'my-playlists') renderPlaylists();
    });
  }

  // データ更新などによる全再描画で検索欄のフォーカスが失われないよう退避
  const searchHadFocus = document.activeElement?.id === 'pl-music-search';
  let searchSel = null;
  if (searchHadFocus) {
    try { searchSel = document.activeElement.selectionStart; } catch (_) {}
    setMusicQuery(document.activeElement.value);
  }

  panel.innerHTML = `
    <nav class="panel-topnav" aria-label="ページナビゲーション">
      <button class="panel-topnav-btn" type="button" data-nav-tab="dashboard"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h5v7H4z"/><path d="M10 4h5v16h-5z"/><path d="M16 9h4v11h-4z"/></svg>ダッシュボード</button>
      <button class="panel-topnav-btn" type="button" data-nav-tab="ranking"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v3a4 4 0 0 1-8 0z"/><path d="M6 5H3v2a4 4 0 0 0 4 4"/><path d="M18 5h3v2a4 4 0 0 1-4 4"/><path d="M12 11v5"/><path d="M8 20h8"/><path d="M9 16h6v4H9z"/></svg>ランキング</button>
      <button class="panel-topnav-btn" type="button" data-nav-tab="songs"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>全曲リスト</button>
      <button class="panel-topnav-btn" type="button" data-nav-tab="timeline"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4"/><path d="M17 3v4"/><path d="M4 8h16"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 13h3"/><path d="M13 13h3"/><path d="M8 17h3"/></svg>タイムライン</button>
      <button class="panel-topnav-btn" type="button" data-nav-tab="analytics"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l3-4 4 2 5-7"/><circle cx="7" cy="15" r="1"/><circle cx="10" cy="11" r="1"/><circle cx="14" cy="13" r="1"/><circle cx="19" cy="6" r="1"/></svg>アナリティクス</button>
      <button class="panel-topnav-btn active" type="button" data-nav-tab="playlists"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h10"/><path d="M5 11h10"/><path d="M5 16h7"/><path d="M18 8v10l3-2 3 2V8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1z"/></svg>プレイリスト</button>
    </nav>
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
          ? renderAllStreams(allStreams)
          : _activeSubTab === 'music'
            ? renderMusicSubtab()
            : renderMyPlaylists(allStreams)}
      </div>
    </div>
  `;

  // music サブタブ表示中は常にローダーを起動（未取得なら fetch、取得済みなら結果同期）
  if (_activeSubTab === 'music') loadAndRenderMusic();

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
    // ── トップナビタブ切り替え ──
    const navTabBtn = e.target.closest('[data-nav-tab]');
    if (navTabBtn) {
      document.querySelector(`[data-tab="${navTabBtn.dataset.navTab}"]`)?.click();
      return;
    }
    // ── サブタブ ──
    const subtabBtn = e.target.closest('[data-pl-subtab]');
    if (subtabBtn) {
      _activeSubTab = subtabBtn.dataset.plSubtab;
      if (_activeSubTab === 'all-streams') resetStreamPage();
      renderPlaylists(); // music サブタブのローダーは renderPlaylists 内で起動される
      return;
    }

    // ── 歌枠一覧サブタブ由来のクリック（all-streams.js に委譲） ──
    if (handleAllStreamsClick(e, allStreams)) return;

    // ── 歌みた・オリ曲サブタブ由来のクリック（music-library.js に委譲） ──
    if (handleMusicClick(e)) return;

    if (_activeSubTab === 'my-playlists') {
      handleMyListsClick(e, allStreams);
    }
  };

  // 検索: 入力欄は描画し直さず結果(#pl-music-results)だけ差し替えるので、
  // IME 変換中でもライブフィルタして問題ない（抑制ロジック不要）
  panel.oninput = (e) => { handleMusicSearchInput(e); };
  // IME 確定直後にも即時反映（ブラウザ差異対策）
  panel.oncompositionend = (e) => { handleMusicSearchInput(e, { immediate: true }); };

  // サムネ 404 フォールバック
  panel.addEventListener('error', (e) => {
    const img = e.target;
    if (!img.classList.contains('pl-sg-thumb')) return;
    const fb = img.dataset.fallback;
    if (fb && img.src !== fb) { img.src = fb; delete img.dataset.fallback; }
  }, true);

  // マイリストのドラッグ並び替えを初期化
  if (_activeSubTab === 'my-playlists') initDragSort();
}
