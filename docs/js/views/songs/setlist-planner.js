/**
 * セトリビルダー（配信者モード専用 / 全曲リストのサブモジュール）
 *
 * 「今日のセトリ」の編集・保存(localStorage)・共有URL・コピー・
 * 検索ドロップダウン・ドラッグ並び替えを所有する。
 * ランダム追加の候補プール（現在のフィルタ結果）は
 * initSetlistPlanner({ getCandidatePool }) で親ビューから注入される。
 */

import { state } from '../../store.js';
import { $, escapeHtml } from '../../utils.js';
import { setlistBalance } from '../../domain-compat.js';
import { icon } from '../../icons.js';

const SETLIST_STORAGE_KEY = 'ibara-setlist-v1';

let _setlistSearchClickOut = null;
let _dragCleanup = null;

// 親ビューから注入される候補プール（現在のフィルタ結果 or 全曲）
let _getCandidatePool = () => state.data?.songs || [];

/** 親ビューから依存を注入する（renderSongs の初期化時に一度呼ぶ） */
export function initSetlistPlanner({ getCandidatePool }) {
  if (getCandidatePool) _getCandidatePool = getCandidatePool;
}

/* ── 永続化・共有 ──────────────────────────────────────────────────────── */

export function loadSetlist() {
  try {
    const raw = localStorage.getItem(SETLIST_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.setlist.theme = String(saved.theme || '');
    state.setlist.copyFormat = saved.copyFormat === 'timestamp' ? 'timestamp' : 'simple';
    state.setlist.items = Array.isArray(saved.items) ? saved.items : [];
  } catch (_) {
    state.setlist.items = [];
  }
}

function generateSetlistShareUrl() {
  const items = state.setlist.items;
  if (!items.length) return window.location.href.split('?')[0];
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(items))));
  const url = new URL(window.location.href.split('?')[0]);
  url.searchParams.set('setlist', encoded);
  return url.toString();
}

export function restoreSetlistFromUrl() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const setlistParam = urlParams.get('setlist');
    if (!setlistParam) return;
    const decoded = decodeURIComponent(escape(atob(setlistParam)));
    const items = JSON.parse(decoded);
    if (!Array.isArray(items) || !items.length) return;
    const existingKeys = new Set(state.setlist.items.map(item => item.key));
    const newItems = items.filter(item => !existingKeys.has(item.key));
    if (newItems.length) {
      state.setlist.items = [...state.setlist.items, ...newItems];
      saveSetlist();
    }
  } catch (_) {
    // Invalid setlist parameter, ignore
  }
}

async function copySetlistShareUrl() {
  const url = generateSetlistShareUrl();
  if (!state.setlist.items.length) {
    renderSetlistPlanner('共有する曲がありません');
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    renderSetlistPlanner('共有URLをコピーしました');
  } catch (_) {
    renderSetlistPlanner('コピーに失敗しました');
  }
}

export function saveSetlist() {
  localStorage.setItem(SETLIST_STORAGE_KEY, JSON.stringify(state.setlist));
}

function songByKey(key) {
  return (state.data.songs || []).find(song => song.key === key) || null;
}

/* ── アイテム操作 ──────────────────────────────────────────────────────── */

function addToSetlist(song) {
  if (!song) return;
  state.setlist.items.push({
    key: song.key,
    title: song.title,
    artist: song.artist,
    displayKey: song.displayKey || '',
    genre: song.genre || '',
    moodTags: song.moodTags || [],
    seasonTags: song.seasonTags || [],
    daysSinceLast: song.daysSinceLast,
  });
  saveSetlist();
  renderSetlistPlanner('追加しました');
}

export function addCustomToSetlist() {
  const titleEl = $('#setlist-custom-title');
  const artistEl = $('#setlist-custom-artist');
  const keyEl = $('#setlist-custom-key');
  const title = String(titleEl?.value || '').trim();
  const artist = String(artistEl?.value || '').trim();
  const displayKey = String(keyEl?.value || '').trim();
  if (!title) {
    renderSetlistPlanner('曲名を入力してください');
    return;
  }
  state.setlist.items.push({
    key: `custom:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    custom: true,
    title,
    artist,
    displayKey,
    genre: '新規',
    moodTags: [],
    seasonTags: [],
    daysSinceLast: null,
  });
  saveSetlist();
  renderSetlistPlanner('新しい曲を追加しました');
}

function hydrateSetlistItem(item) {
  if (item.custom) return item;
  const song = songByKey(item.key);
  return song ? { ...item, ...song } : item;
}

export function handleSetlistAction(action) {
  const act = action.dataset.setlistAction;
  const index = Number(action.dataset.index);
  if (act === 'add') addToSetlist(songByKey(action.dataset.songkey));
  if (act === 'todays-song-add') addToSetlist(songByKey(action.dataset.songkey));
  if (act === 'remove') state.setlist.items.splice(index, 1);
  if (act === 'up' && index > 0) {
    [state.setlist.items[index - 1], state.setlist.items[index]] = [state.setlist.items[index], state.setlist.items[index - 1]];
  }
  if (act === 'down' && index < state.setlist.items.length - 1) {
    [state.setlist.items[index + 1], state.setlist.items[index]] = [state.setlist.items[index], state.setlist.items[index + 1]];
  }
  if (act === 'copy-item') {
    copySetlistItem(index);
    return;
  }
  if (act === 'add-custom') {
    addCustomToSetlist();
    return;
  }
  if (act === 'random') addRandomToSetlist();
  if (act === 'copy') copySetlist();
  if (act === 'share') {
    copySetlistShareUrl();
    return;
  }
  if (act === 'clear' && confirm('セトリを空にしますか？')) state.setlist.items = [];
  saveSetlist();
  if (!['add', 'random', 'copy'].includes(act)) renderSetlistPlanner();
}

function addRandomToSetlist() {
  const existing = new Set(state.setlist.items.map(item => item.key));
  const pool = (_getCandidatePool() || [])
    .filter(song => song.key && !existing.has(song.key));
  if (!pool.length) {
    renderSetlistPlanner('追加できる候補がありません');
    return;
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  addToSetlist(pick);
}

function setlistItems() {
  return state.setlist.items.map(hydrateSetlistItem);
}

/* ── プランナー描画 ────────────────────────────────────────────────────── */

export function toggleSetlistPlanner() {
  if (!state.singerMode) return;
  state.setlistExpanded = !state.setlistExpanded;
  renderSetlistPlanner();
  const wrap = $('#setlist-planner');
  if (state.setlistExpanded) {
    wrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function updateSetlistToggle() {
  const btn = $('#setlist-toggle-btn');
  if (!btn) return;
  const items = state.setlist.items.length;
  btn.setAttribute('aria-expanded', state.setlistExpanded ? 'true' : 'false');
  btn.textContent = state.setlistExpanded
    ? `セトリ制作を閉じる${items ? ` (${items})` : ''}`
    : `セトリ制作を開く${items ? ` (${items})` : ''}`;
}

export function renderSetlistPlanner(message = '') {
  const wrap = $('#setlist-planner');
  if (!wrap) return;
  updateSetlistToggle();
  wrap.hidden = !state.singerMode || !state.setlistExpanded;
  wrap.classList.toggle('is-open', state.singerMode && state.setlistExpanded);
  if (!state.singerMode) {
    wrap.innerHTML = '';
    return;
  }
  const items = setlistItems();
  const balance = setlistBalance(items);
  const minutes = items.length * 5;
  wrap.innerHTML = `
    <div class="setlist-head">
      <div>
        <div class="recommend-label">Setlist Builder</div>
        <h3>今日のセトリ</h3>
      </div>
      <div class="setlist-total">${items.length}曲 / 約${minutes}分</div>
    </div>
    <input id="setlist-theme" class="text-input setlist-theme" type="text" placeholder="歌枠テーマメモ" value="${escapeHtml(state.setlist.theme)}">
    <div class="setlist-search-add">
      <div class="setlist-search-wrap">
        <input id="setlist-search-input" class="text-input setlist-search-input"
               type="text" placeholder="曲名を入力して追加…" autocomplete="off" spellcheck="false">
        <div id="setlist-search-dropdown" class="setlist-search-dropdown" hidden></div>
      </div>
      <details class="setlist-custom-details">
        <summary>検索で見つからない曲を追加する</summary>
        <div class="setlist-custom-add">
          <input id="setlist-custom-title" class="text-input" type="text"
                 placeholder="曲名（例：シャルル）" autocomplete="off">
          <div class="setlist-custom-row2">
            <input id="setlist-custom-artist" class="text-input" type="text"
                   placeholder="アーティスト名（任意）" autocomplete="off">
            <input id="setlist-custom-key" class="text-input setlist-custom-key-inp" type="text"
                   placeholder="キー" maxlength="5" autocomplete="off">
            <button class="btn primary" type="button" data-setlist-action="add-custom">追加</button>
          </div>
        </div>
      </details>
    </div>
    <div class="setlist-balance">
      ${balanceChip('ジャンル', balance.genres)}
      ${balanceChip('雰囲気', balance.moods)}
      <span>キー ${balance.keys}/${items.length}</span>
      <span>久しぶり ${balance.stale}</span>
    </div>
    <div class="setlist-items">
      ${items.length ? items.map((item, i) => setlistItemHtml(item, i)).join('') : '<div class="setlist-empty">曲の「セトリ」ボタンかランダム追加から作れます</div>'}
    </div>
    <div class="setlist-actions">
      <select id="setlist-copy-format" class="select-input">
        <option value="simple"${state.setlist.copyFormat === 'simple' ? ' selected' : ''}>曲名 / アーティスト</option>
        <option value="timestamp"${state.setlist.copyFormat === 'timestamp' ? ' selected' : ''}>タイムスタンプ入力用</option>
      </select>
      <button class="btn ghost" type="button" data-setlist-action="random">ランダム追加</button>
      <button class="btn primary" type="button" data-setlist-action="copy">コピー</button>
      <button class="btn ghost" type="button" data-setlist-action="share">${icon('link')} 共有</button>
      <button class="btn ghost" type="button" data-setlist-action="clear">クリア</button>
      ${message ? `<span class="setlist-message">${escapeHtml(message)}</span>` : ''}
    </div>
  `;

  initSetlistSearch();
  initSetlistDrag();
}

function balanceChip(label, rows) {
  if (!rows.length) return `<span>${label} —</span>`;
  return `<span>${label} ${rows.map(([name, count]) => `${escapeHtml(name)} ${count}`).join(' / ')}</span>`;
}

function setlistItemHtml(item, index) {
  return `
    <div class="setlist-item" data-index="${index}">
      <div class="setlist-no">${index + 1}</div>
      <div class="setlist-drag-handle" title="ドラッグして並び替え" aria-label="ドラッグハンドル">${icon('drag')}</div>
      <div class="setlist-info">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${item.artist ? escapeHtml(item.artist) : 'アーティスト未入力'}${item.displayKey ? ` · key ${escapeHtml(item.displayKey)}` : ''}${item.custom ? ' · 新規' : ''}</span>
      </div>
      <div class="setlist-move">
        <button class="setlist-copy-one" type="button" data-setlist-action="copy-item" data-index="${index}" aria-label="${escapeHtml(item.title)}をコピー">⧉</button>
        <button type="button" data-setlist-action="up" data-index="${index}" aria-label="上へ">↑</button>
        <button type="button" data-setlist-action="down" data-index="${index}" aria-label="下へ">↓</button>
        <button type="button" data-setlist-action="remove" data-index="${index}" aria-label="削除">×</button>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────────────────────
// セトリ曲検索ドロップダウン
// ──────────────────────────────────────────────────────────────────────────────

function initSetlistSearch() {
  const input = document.getElementById('setlist-search-input');
  const dropdown = document.getElementById('setlist-search-dropdown');
  if (!input || !dropdown) return;

  let _matches = [];
  let _selIdx = -1;

  function _render(q) {
    const ql = q.trim().toLowerCase();
    if (!ql) { dropdown.hidden = true; _matches = []; _selIdx = -1; return; }

    const songs = state.data?.songs || [];
    const matched = songs
      .filter(s => s.title.toLowerCase().includes(ql) || (s.artist || '').toLowerCase().includes(ql))
      .sort((a, b) => {
        const aT = a.title.toLowerCase().startsWith(ql) ? 2 : a.title.toLowerCase().includes(ql) ? 1 : 0;
        const bT = b.title.toLowerCase().startsWith(ql) ? 2 : b.title.toLowerCase().includes(ql) ? 1 : 0;
        if (aT !== bT) return bT - aT;
        return b.count - a.count;
      })
      .slice(0, 8);

    const newEntry = { _isNew: true, title: q.trim() };

    if (!matched.length) {
      dropdown.innerHTML = `
        <div class="setlist-dd-item setlist-dd-new" data-dd-idx="0">
          <span class="setlist-dd-plus">${icon('plus')}</span>
          <div class="setlist-dd-body">
            <div class="setlist-dd-title">「${escapeHtml(q.trim())}」を新規追加</div>
            <div class="setlist-dd-meta">アーティスト名を入力して追加できます</div>
          </div>
        </div>`;
      _matches = [newEntry];
    } else {
      dropdown.innerHTML =
        matched.map((s, i) => `
          <div class="setlist-dd-item" data-dd-idx="${i}">
            <span class="setlist-dd-icon">${icon('music')}</span>
            <div class="setlist-dd-body">
              <div class="setlist-dd-title">${escapeHtml(s.title)}</div>
              <div class="setlist-dd-meta">${escapeHtml(s.artist || '—')} · ${s.count}回</div>
            </div>
          </div>`).join('') +
        `<div class="setlist-dd-item setlist-dd-new" data-dd-idx="${matched.length}">
          <span class="setlist-dd-plus">${icon('plus')}</span>
          <div class="setlist-dd-body">
            <div class="setlist-dd-title">「${escapeHtml(q.trim())}」を新規追加</div>
            <div class="setlist-dd-meta">曲リストにない曲として追加</div>
          </div>
        </div>`;
      _matches = [...matched, newEntry];
    }
    _selIdx = -1;
    dropdown.hidden = false;
    _updateSel();
  }

  function _updateSel() {
    dropdown.querySelectorAll('[data-dd-idx]').forEach((el, i) =>
      el.classList.toggle('is-selected', i === _selIdx));
  }

  function _pick(idx) {
    const m = _matches[idx];
    if (!m) return;
    dropdown.hidden = true;
    _matches = []; _selIdx = -1;

    if (m._isNew) {
      // details を開いてタイトルを prefill、アーティスト欄にフォーカス
      const details = document.querySelector('.setlist-custom-details');
      const titleEl = document.getElementById('setlist-custom-title');
      if (details && titleEl) {
        details.open = true;
        titleEl.value = m.title;
        input.value = '';
        document.getElementById('setlist-custom-artist')?.focus();
      } else {
        input.value = '';
      }
    } else {
      input.value = '';
      addToSetlist(m);
    }
  }

  input.addEventListener('input', () => _render(input.value));

  input.addEventListener('keydown', (e) => {
    if (dropdown.hidden) return;
    const len = _matches.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _selIdx = (_selIdx + 1) % len;
      _updateSel();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _selIdx = (_selIdx - 1 + len) % len;
      _updateSel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      _pick(_selIdx >= 0 ? _selIdx : 0);
    } else if (e.key === 'Escape') {
      dropdown.hidden = true;
      _selIdx = -1;
    }
  });

  dropdown.addEventListener('mousedown', (e) => {
    const item = e.target.closest('[data-dd-idx]');
    if (!item) return;
    e.preventDefault(); // blur を防ぐ
    _pick(Number(item.dataset.ddIdx));
  });

  // 外クリックで閉じる（再レンダー時に古いハンドラを解除）
  if (_setlistSearchClickOut) document.removeEventListener('click', _setlistSearchClickOut);
  _setlistSearchClickOut = (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.hidden = true;
      _selIdx = -1;
    }
  };
  document.addEventListener('click', _setlistSearchClickOut);
}

// ──────────────────────────────────────────────────────────────────────────────
// セトリ ドラッグ＆ドロップ並び替え（Pointer Events API）
// ──────────────────────────────────────────────────────────────────────────────

// セトリの並び替え（マイリストと同じ transform 追従方式）。
// ドラッグ中の行はポインタに追従し、他の行は CSS トランジションでシフト、
// 確定時に配列を並び替えて保存・再描画する。
function initSetlistDrag() {
  if (_dragCleanup) { _dragCleanup(); _dragCleanup = null; }

  const listEl = document.querySelector('.setlist-items');
  if (!listEl) return;

  let st = null;

  const cleanup = () => {
    if (!st) return;
    st.rows.forEach(r => { r.style.transform = ''; });
    st.row.classList.remove('is-dragging');
    listEl.classList.remove('is-drag-active');
    st.row.removeEventListener('pointermove', onMove);
    st.row.removeEventListener('pointerup', onEnd);
    st.row.removeEventListener('pointercancel', onCancel);
    st = null;
  };

  function onMove(e) {
    if (!st) return;
    e.preventDefault();
    const dy = e.clientY - st.startY;
    if (!st.moved && Math.abs(dy) < 3) return; // 微小移動はクリック扱い
    st.moved = true;
    st.row.style.transform = `translateY(${dy}px)`;

    const centerY = st.mids[st.startIdx] + dy;
    let target = 0;
    for (let i = 0; i < st.mids.length; i++) {
      if (i === st.startIdx) continue;
      if (centerY > st.mids[i]) target++;
    }
    if (target !== st.targetIdx) {
      st.targetIdx = target;
      st.rows.forEach((r, i) => {
        if (i === st.startIdx) return;
        let shift = 0;
        if (st.startIdx < target && i > st.startIdx && i <= target) shift = -st.rowH;
        else if (st.startIdx > target && i >= target && i < st.startIdx) shift = st.rowH;
        r.style.transform = shift ? `translateY(${shift}px)` : '';
      });
    }
  }

  function onEnd() {
    if (!st) return;
    const { startIdx, targetIdx, moved } = st;
    cleanup();
    if (!moved || targetIdx === startIdx) return;
    const items = state.setlist.items;
    if (startIdx < items.length) {
      const [moved2] = items.splice(startIdx, 1);
      items.splice(targetIdx, 0, moved2);
      saveSetlist();
      renderSetlistPlanner();
    }
  }

  function onCancel() { cleanup(); }

  listEl.addEventListener('pointerdown', (e) => {
    if (st) return;
    if (e.button != null && e.button !== 0) return; // 左ボタンのみ
    // タッチは縦スクロール優先でハンドル限定、マウス等は行のどこからでも開始
    const fromHandle = !!e.target.closest('.setlist-drag-handle');
    if (e.pointerType === 'touch' && !fromHandle) return;
    // 操作ボタン・入力の上では開始しない
    if (e.target.closest('button, a, input, select, textarea')) return;
    const row = e.target.closest('.setlist-item');
    if (!row) return;
    e.preventDefault();

    const rows = Array.from(listEl.querySelectorAll('.setlist-item'));
    const startIdx = rows.indexOf(row);
    if (startIdx < 0) return;
    const mids = rows.map(r => { const rc = r.getBoundingClientRect(); return rc.top + rc.height / 2; });
    const rect = row.getBoundingClientRect();

    st = {
      rows, mids, startIdx, targetIdx: startIdx,
      startY: e.clientY,
      rowH: rect.height + (parseFloat(getComputedStyle(listEl).rowGap || getComputedStyle(listEl).gap) || 0),
      row, moved: false,
    };
    row.classList.add('is-dragging');
    listEl.classList.add('is-drag-active');
    try { row.setPointerCapture(e.pointerId); } catch (_) {}
    row.addEventListener('pointermove', onMove, { passive: false });
    row.addEventListener('pointerup', onEnd);
    row.addEventListener('pointercancel', onCancel);
  });

  _dragCleanup = cleanup;
}

/* ── コピー ────────────────────────────────────────────────────────────── */

function formatSetlistText() {
  const items = setlistItems();
  const lines = [];
  if (state.setlist.theme) lines.push(`# ${state.setlist.theme}`, '');
  items.forEach((item) => {
    lines.push(formatSetlistLine(item));
  });
  return lines.join('\n');
}

function formatSetlistLine(item) {
  const title = String(item?.title || '').trim();
  const artist = String(item?.artist || '').trim();
  const body = artist ? `${title} / ${artist}` : title;
  return state.setlist.copyFormat === 'timestamp' ? `00:00　${body}　00:00` : body;
}

async function copySetlist() {
  const text = formatSetlistText();
  if (!text.trim()) {
    renderSetlistPlanner('コピーする曲がありません');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    renderSetlistPlanner('コピーしました');
  } catch (_) {
    renderSetlistPlanner('コピーに失敗しました');
  }
}

async function copySetlistItem(index) {
  const item = setlistItems()[index];
  if (!item) {
    renderSetlistPlanner('コピーする曲がありません');
    return;
  }
  try {
    await navigator.clipboard.writeText(formatSetlistLine(item));
    renderSetlistPlanner('1曲コピーしました');
  } catch (_) {
    renderSetlistPlanner('コピーに失敗しました');
  }
}
