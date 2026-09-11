/**
 * マイリスト（プレイリスト「my-playlists」サブタブ）
 *
 * localStorage 保存のユーザー作成プレイリストの CRUD・カード描画・
 * 追加モーダル・ドラッグ並び替えを所有する。
 * 永続化そのものは player/playlists-store.js に委譲する。
 * 全体再描画は initMyLists({ rerender }) で親ビューから注入される。
 *
 * localStorage データ形式:
 *   ibara-playlists = [{ id, name, createdAt, streams: [streamKey|"mv:<id>",...] }]
 */

import { state } from '../../store.js';
import { $, escapeHtml, fmtDate, streamKey, youtubeThumb, youtubeVideoId } from '../../utils.js';
import { icon } from '../../icons.js';
import { openStreamViewer, playMyListInViewer } from '../../player/stream-player.js';
import { getPlaylists as storeGetPlaylists, savePlaylists as storeSavePlaylists, isStreamInAnyPlaylist } from '../../player/playlists-store.js';
import { resolveMusicVideoId, getMusicVideos, mvBadge } from './music-library.js';

const PL_BOOKMARK_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/></svg>';

// 親ビューから注入される全体再描画（renderPlaylists 相当）
let _rerender = () => {};

/** 親ビューから依存を注入する（renderPlaylists の初期化時に一度呼ぶ） */
export function initMyLists({ rerender }) {
  if (rerender) _rerender = rerender;
}

/* ── データ操作（localStorage） ─────────────────────────────────────────── */

export function getPlaylists() {
  return storeGetPlaylists();
}

function savePlaylists(lists) {
  storeSavePlaylists(lists);
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

/* ── 共有ヘルパー ──────────────────────────────────────────────────────── */

/**
 * プレイリストの YouTube 動画 ID を収集する共有ヘルパー。
 * mv: キーは resolveMusicVideoId で解決し、それ以外は allStreams で解決する。
 * 解決できた URL から youtubeVideoId で ID を抽出し、falsy を除いた配列を返す。
 */
function _playlistVideoIds(pl, allStreams) {
  return (pl.streams || [])
    .map(skey => {
      if (skey.startsWith('mv:')) {
        const mv = resolveMusicVideoId(skey);
        return mv?.url ? youtubeVideoId(mv.url) : '';
      }
      const s = allStreams.find(st => streamKey(st) === skey);
      return s?.url ? youtubeVideoId(s.url) : '';
    })
    .filter(Boolean);
}

/**
 * 動画 ID 配列から YouTube 再生 URL を開く。
 * - 0 本: alert
 * - 1 本: watch?v=ID
 * - 2 本以上: watch_videos?video_ids= (先頭 50 本)
 */
function _openYouTubePlaylist(videoIds) {
  if (!videoIds.length) {
    alert('YouTubeで再生できる動画がありません');
    return;
  }
  let url;
  if (videoIds.length === 1) {
    url = `https://www.youtube.com/watch?v=${videoIds[0]}`;
  } else {
    const ids = videoIds.slice(0, 50);
    if (videoIds.length > 50) {
      alert(`動画が${videoIds.length}本あります。先頭50本で連続再生します。`);
    }
    url = `https://www.youtube.com/watch_videos?video_ids=${ids.join(',')}`;
  }
  window.open(url, '_blank', 'noopener noreferrer');
}

/* ── マイリスト描画 ────────────────────────────────────────────────────── */

export function renderMyPlaylists(allStreams) {
  const lists = getPlaylists();
  if (!lists.length) {
    return `
      <div class="pl-empty-state">
        <p>まだプレイリストがありません</p>
        <p class="pl-empty-hint">タイムラインの配信枠から <strong>栞ボタン</strong> を押して追加できます</p>
      </div>
      <div class="pl-my-actions">
        <button class="pl-new-btn" id="pl-new-btn" type="button">${icon('plus')} 新規作成</button>
      </div>`;
  }

  return `
    <div class="pl-my-actions">
      <span class="pl-my-count">${lists.length}件のプレイリスト</span>
      <button class="pl-new-btn" id="pl-new-btn" type="button">${icon('plus')} 新規作成</button>
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

  const items = entries.map(({ skey, isMv, mv, stream }) => {
    const moveKey = escapeHtml(pl.id + '|:|' + skey);
    const dragHandle = `<span class="pl-drag-handle" aria-hidden="true" title="ドラッグして並び替え">${icon('drag')}</span>`;
    const rmBtn = `<button class="pl-rm-btn" data-pl-rm-stream="${moveKey}" type="button" title="削除">${icon('close')}</button>`;

    if (isMv) {
      if (!mv) return `
        <div class="pl-stream-row pl-stream-missing" data-pl-skey="${escapeHtml(skey)}" data-pl-id="${escapeHtml(pl.id)}">${dragHandle}
          <div class="pl-stream-info"><span class="pl-stream-title">（動画データなし）</span></div>
          <div class="pl-stream-actions">${rmBtn}</div>
        </div>`;
      const { label: badge, sub } = mvBadge(mv);
      const mvTypeKey = mv.type || 'original';
      const mvIdx = getMusicVideos().indexOf(mv);
      return `
        <div class="pl-stream-row" data-pl-skey="${escapeHtml(skey)}" data-pl-id="${escapeHtml(pl.id)}">
          ${dragHandle}
          <div class="pl-stream-info">
            <span class="pl-stream-date"><span class="mv-badge-inline mv-type-${mvTypeKey}">${badge}</span></span>
            <span class="pl-stream-title">${escapeHtml(mv.title || '—')}</span>
            <span class="pl-stream-meta">${escapeHtml(sub)}</span>
          </div>
          <div class="pl-stream-actions">
            ${mvIdx >= 0
              ? `<button class="pl-play-stream-btn" data-play-music-pl="${mvIdx}" type="button" title="再生">${icon('play')}</button>`
              : ''}
            ${rmBtn}
          </div>
        </div>`;
    }

    if (!stream) return `
      <div class="pl-stream-row pl-stream-missing" data-pl-skey="${escapeHtml(skey)}" data-pl-id="${escapeHtml(pl.id)}">${dragHandle}
        <div class="pl-stream-info"><span class="pl-stream-title">（配信データなし）</span></div>
        <div class="pl-stream-actions">${rmBtn}</div>
      </div>`;
    return `
      <div class="pl-stream-row" data-pl-skey="${escapeHtml(skey)}" data-pl-id="${escapeHtml(pl.id)}">
        ${dragHandle}
        <div class="pl-stream-info">
          <span class="pl-stream-date">${fmtDate(stream.date)}</span>
          <span class="pl-stream-title">${escapeHtml(stream.title || '配信')}</span>
          <span class="pl-stream-meta">第${stream.index}枠 · ${stream.songs?.length ?? 0}曲</span>
        </div>
        <div class="pl-stream-actions">
          ${stream.url
            ? `<button class="pl-play-stream-btn" data-pl-play-stream="${escapeHtml(skey)}"
                type="button" title="再生">${icon('play')}</button>`
            : ''}
          ${rmBtn}
        </div>
      </div>`;
  }).join('');

  // YouTube共有可能な動画IDを収集（stream + mv: 両方を含む）
  const videoIds = _playlistVideoIds(pl, allStreams);

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
          type="button" title="このプレイリストの共有リンクをコピー">${icon('link')} リンクを共有</button>` : ''}
      </div>` : ''}
    </div>`;
}

/* ── クリックハンドラ ──────────────────────────────────────────────────── */

export function handleMyListsClick(e, allStreams) {
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
      shareBtn.innerHTML = ok ? `${icon('check')} コピーしました` : 'コピーできません';
      setTimeout(() => { shareBtn.innerHTML = `${icon('link')} リンクを共有`; }, 1600);
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
      _rerender();
    }
    return;
  }
  // 配信削除
  const rmBtn = e.target.closest('[data-pl-rm-stream]');
  if (rmBtn) {
    const [plId, skey] = rmBtn.dataset.plRmStream.split('|:|');
    removeStreamFromPlaylist(plId, skey);
    _rerender();
    return;
  }
  // 再生（プレイリスト内の配信）→ マイリストをキューとしてビューワーで再生
  const playBtn = e.target.closest('[data-pl-play-stream]');
  if (playBtn) {
    const row = playBtn.closest('.pl-stream-row');
    if (row && _playMyListFromRow(row, allStreams)) return;
    const skey = playBtn.dataset.plPlayStream;
    const found = allStreams.find(s => streamKey(s) === skey);
    if (found?.url) openStreamViewer(found);
    return;
  }
  // 再生（プレイリスト内の音楽動画）→ 同上
  const playMvBtn = e.target.closest('[data-play-music-pl]');
  if (playMvBtn) {
    const row = playMvBtn.closest('.pl-stream-row');
    if (row && _playMyListFromRow(row, allStreams)) return;
    const musicVideos = getMusicVideos();
    if (musicVideos.length) {
      const idx = Number(playMvBtn.dataset.playMusicPl);
      import('../../music-player.js').then(m => m.playMusicQueue(musicVideos, idx));
    }
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
      if (target) { target.name = newName; savePlaylists(lists); _rerender(); }
    }
    return;
  }

  // YouTubeで連続再生
  const ytShareBtn = e.target.closest('[data-pl-yt-share]');
  if (ytShareBtn) {
    const plId = ytShareBtn.dataset.plYtShare;
    const pl = getPlaylists().find(p => p.id === plId);
    if (!pl) return;
    _openYouTubePlaylist(_playlistVideoIds(pl, allStreams));
    return;
  }
}

function _promptCreate() {
  const name = prompt('プレイリスト名を入力してください')?.trim();
  if (!name) return;
  createPlaylist(name);
  _rerender();
}

/* ── プレイリスト追加モーダル（YouTube の保存先選択風） ──────────────────── */

/** プレイリストの先頭動画のサムネ URL（カバー用）。なければ空文字 */
function _playlistCoverUrl(pl) {
  const allStreams = state.data?.streams || [];
  for (const k of (pl.streams || [])) {
    if (k.startsWith('mv:')) { const mv = resolveMusicVideoId(k); if (mv?.url) return mv.url; }
    else { const s = allStreams.find(st => streamKey(st) === k); if (s?.url) return s.url; }
  }
  return '';
}

/** プレイリスト追加モーダル。skeyOrArray は単一キーまたはキー配列（まとめて追加）。
 *  YouTube の保存先選択のように、サムネ + 曲数 + 栞アイコンで表示し、
 *  栞をタップで追加/削除トグル（登録済みは色付き）。再描画で再ポップしない。 */
export function showAddToPlaylistModal(skeyOrArray, streamTitle, opts = {}) {
  const keys = Array.isArray(skeyOrArray) ? skeyOrArray.filter(Boolean) : [skeyOrArray].filter(Boolean);
  if (!keys.length) return;
  const isBulk = keys.length > 1;
  // 追加/削除のたびに呼ぶ。呼び出し元のボタンの保存済み表示を即時更新するため。
  const notifyChange = () => {
    try { opts.onChange?.(keys.some(k => isStreamInAnyPlaylist(k))); } catch (_) {}
  };

  let modal = $('#pl-add-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'pl-add-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
  }

  // このリストに（すべての）キーが入っているか
  const isSaved = (pl) => keys.every(k => (pl.streams || []).includes(k));

  /** 1プレイリストぶんの行 HTML */
  const itemHtml = (pl) => {
    const saved = isSaved(pl);
    const coverUrl = _playlistCoverUrl(pl);
    const thumb = coverUrl ? youtubeThumb(coverUrl) : '';
    return `
      <button class="pl-modal-item${saved ? ' is-saved' : ''}" data-pl-add="${escapeHtml(pl.id)}"
        type="button" role="checkbox" aria-checked="${saved}">
        <span class="pl-modal-item-cover">
          ${thumb
            ? `<img src="${escapeHtml(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
            : `<span class="pl-modal-item-cover--empty">${icon('music')}</span>`}
        </span>
        <span class="pl-modal-item-info">
          <span class="pl-modal-item-name">${escapeHtml(pl.name)}</span>
          <span class="pl-modal-item-count">${pl.streams.length}曲</span>
        </span>
        <span class="pl-modal-bookmark${saved ? ' is-saved' : ''}" aria-hidden="true">${PL_BOOKMARK_SVG}</span>
      </button>`;
  };

  const listHtmlAll = () => {
    const currentLists = getPlaylists();
    if (!currentLists.length) {
      return '<p class="pl-modal-empty">プレイリストがありません<br><span style="font-size:11px">下の「新しいプレイリストを作成」から追加できます</span></p>';
    }
    return currentLists.map(itemHtml).join('');
  };

  const subText = isBulk ? `${keys.length}曲をまとめて保存` : (streamTitle || '配信');

  const _build = () => {
    modal.innerHTML = `
      <div class="pl-modal-backdrop" id="pl-modal-backdrop"></div>
      <div class="pl-modal-box" role="dialog" aria-modal="true" aria-label="プレイリストに保存">
        <div class="pl-modal-head">
          <span class="pl-modal-head-title">保存先</span>
          <button class="pl-modal-close" id="pl-modal-close" type="button" aria-label="閉じる">${icon('close')}</button>
        </div>
        <div class="pl-modal-sub">${escapeHtml(subText)}</div>
        <div class="pl-modal-list" id="pl-modal-list">${listHtmlAll()}</div>
        <button class="pl-modal-new" id="pl-modal-new" type="button">
          <span class="pl-modal-new-icon">${icon('plus')}</span> 新しいプレイリストを作成
        </button>
      </div>`;
    modal.hidden = false;

    modal.querySelector('#pl-modal-close').addEventListener('click', close);
    modal.querySelector('#pl-modal-backdrop').addEventListener('click', close);

    modal.querySelector('#pl-modal-new').addEventListener('click', () => {
      const name = prompt('プレイリスト名')?.trim();
      if (!name) return;
      const pl = createPlaylist(name);
      keys.forEach(k => addStreamToPlaylist(pl.id, k));
      _showToast(isBulk ? `「${name}」に${keys.length}曲保存しました` : `「${name}」に保存しました`);
      // 行を1つ追加するだけ（モーダルは閉じない）
      const listEl = modal.querySelector('#pl-modal-list');
      const empty = listEl?.querySelector('.pl-modal-empty');
      if (empty) listEl.innerHTML = '';
      if (listEl) listEl.insertAdjacentHTML('afterbegin', itemHtml(getPlaylists().find(p => p.id === pl.id)));
      notifyChange();
    });

    // 行クリック＝保存トグル（その行だけ更新、モーダルは再ポップしない）
    modal.querySelector('#pl-modal-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pl-add]');
      if (!btn) return;
      const plId = btn.dataset.plAdd;
      const lists = getPlaylists();
      const pl = lists.find(p => p.id === plId);
      if (!pl) return;
      if (!Array.isArray(pl.streams)) pl.streams = [];
      if (isSaved(pl)) {
        keys.forEach(k => { pl.streams = pl.streams.filter(s => s !== k); });
        savePlaylists(lists);
        _showToast(isBulk ? `${keys.length}曲を削除しました` : '削除しました');
      } else {
        keys.forEach(k => { if (!pl.streams.includes(k)) pl.streams.push(k); });
        savePlaylists(lists);
        _showToast(isBulk ? `「${pl.name}」に${keys.length}曲保存しました` : `「${pl.name}」に保存しました`);
      }
      // クリックした行だけ差し替え（再描画による再ポップを避ける）
      btn.outerHTML = itemHtml(getPlaylists().find(p => p.id === plId));
      notifyChange();
    });
  };

  const close = () => { modal.hidden = true; };
  _build();

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

/* ── キュー再生 ────────────────────────────────────────────────────────── */

/** マイリストの行 ▶ から、リスト全体をビューワーのキューとして再生する。
 *  解決できた項目（配信 + 動画）だけをキューに積み、クリック行から開始する。 */
function _playMyListFromRow(row, allStreams) {
  const pl = getPlaylists().find(p => p.id === row.dataset.plId);
  if (!pl) return false;
  const items = [];
  for (const k of pl.streams) {
    if (k.startsWith('mv:')) {
      const mv = resolveMusicVideoId(k);
      if (mv?.url) items.push({ kind: 'mv', key: k, video: mv });
    } else {
      const s = allStreams.find(st => streamKey(st) === k);
      if (s?.url) items.push({ kind: 'stream', key: k, stream: s });
    }
  }
  if (!items.length) return false;
  let idx = items.findIndex(it => it.key === row.dataset.plSkey);
  if (idx < 0) idx = 0;
  playMyListInViewer({ name: pl.name || 'マイリスト', items, idx });
  return true;
}

/* ── ドラッグ並び替え（Pointer Events ベース） ─────────────────────────────
 * ドラッグ中の行は transform でポインタに追従し、他の行は CSS トランジションで
 * 滑らかにシフト表示する。DOM の並び替えと保存はドロップ確定時に一度だけ行う。 */

export function initDragSort() {
  const panel = $('#panel-playlists');
  if (!panel) return;
  panel.querySelectorAll('.pl-stream-list').forEach(list => {
    list.addEventListener('pointerdown', _onDragStart, { passive: false });
  });
}

let _dragState = null;

function _onDragStart(e) {
  if (_dragState) return; // 多重ドラッグ防止
  const handle = e.target.closest('.pl-drag-handle');
  if (!handle) return;
  const row = handle.closest('.pl-stream-row');
  const list = handle.closest('.pl-stream-list');
  if (!row || !list) return;

  e.preventDefault();

  const rows = Array.from(list.querySelectorAll('.pl-stream-row'));
  const startIdx = rows.indexOf(row);
  if (startIdx < 0) return;

  // ドラッグ開始時点の各行の中心 Y（固定値として使う — レイアウトは動かさないので不変）
  const mids = rows.map(r => {
    const rc = r.getBoundingClientRect();
    return rc.top + rc.height / 2;
  });
  const rowRect = row.getBoundingClientRect();

  _dragState = {
    list, row, rows, mids, startIdx,
    targetIdx: startIdx,
    startY: e.clientY,
    rowH: rowRect.height + (parseFloat(getComputedStyle(list).rowGap || getComputedStyle(list).gap) || 0),
    plId: row.dataset.plId,
    moved: false,
  };

  row.classList.add('is-dragging');
  list.classList.add('is-drag-active');
  try { row.setPointerCapture(e.pointerId); } catch (_) { /* 合成イベント等 */ }

  row.addEventListener('pointermove', _onDragMove, { passive: false });
  row.addEventListener('pointerup', _onDragEnd);
  row.addEventListener('pointercancel', _onDragCancel);
}

function _onDragMove(e) {
  const st = _dragState;
  if (!st) return;
  e.preventDefault();

  const dy = e.clientY - st.startY;
  if (!st.moved && Math.abs(dy) < 3) return; // 微小移動はクリック扱い
  st.moved = true;
  st.row.style.transform = `translateY(${dy}px)`;

  // ドラッグ中の行の中心位置から挿入先インデックスを決定
  const centerY = st.mids[st.startIdx] + dy;
  let target = 0;
  for (let i = 0; i < st.mids.length; i++) {
    if (i === st.startIdx) continue;
    if (centerY > st.mids[i]) target++;
  }

  if (target !== st.targetIdx) {
    st.targetIdx = target;
    // 間にある行をシフト表示（CSS transition で滑らかに動く）
    st.rows.forEach((r, i) => {
      if (i === st.startIdx) return;
      let shift = 0;
      if (st.startIdx < target && i > st.startIdx && i <= target) shift = -st.rowH;
      else if (st.startIdx > target && i >= target && i < st.startIdx) shift = st.rowH;
      r.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  }
}

function _onDragEnd() {
  const st = _dragState;
  if (!st) return;
  const { plId, startIdx, targetIdx, moved } = st;
  _cleanupDrag();
  if (!moved || targetIdx === startIdx) return;

  const lists = getPlaylists();
  const pl = lists.find(p => p.id === plId);
  if (pl && startIdx < pl.streams.length) {
    const arr = pl.streams.slice();
    const [item] = arr.splice(startIdx, 1);
    arr.splice(targetIdx, 0, item);
    pl.streams = arr;
    savePlaylists(lists);
  }
  _rerender();
}

function _onDragCancel() {
  _cleanupDrag();
}

function _cleanupDrag() {
  const st = _dragState;
  if (!st) return;
  st.rows.forEach(r => { r.style.transform = ''; });
  st.row.classList.remove('is-dragging');
  st.list.classList.remove('is-drag-active');
  st.row.removeEventListener('pointermove', _onDragMove);
  st.row.removeEventListener('pointerup', _onDragEnd);
  st.row.removeEventListener('pointercancel', _onDragCancel);
  _dragState = null;
}
