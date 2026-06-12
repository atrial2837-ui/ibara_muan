/**
 * @module search-palette
 * @description グローバル検索パレット (コマンドパレット)
 *   / または Ctrl+K で開く。曲・アーティスト・配信枠・動画を横断検索する。
 */

import { state } from '../store.js';
import { escapeHtml, fmtDate } from '../utils.js';
import { search as searchSongs } from '../search.js';

let _active = -1;   // 現在ハイライトされている行インデックス
let _flat   = [];   // キーボード選択用フラット配列
let _onAction = null; // 選択時コールバック
let _musicVideos = null;
let _musicPromise = null;

// ──────────────────────────────────────────────────────────────────────────────
// 公開 API
// ──────────────────────────────────────────────────────────────────────────────

export function initSearchPalette(handlers) {
  _onAction = handlers;

  const el = document.createElement('div');
  el.id = 'omni-backdrop';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'サイト内検索');
  el.innerHTML = `
    <div id="omni-box">
      <div class="omni-input-row">
        <span class="omni-search-icon" aria-hidden="true">🔍</span>
        <input
          id="omni-input"
          class="omni-input"
          type="search"
          placeholder="曲・配信・動画を検索（スペース区切りで絞り込み）"
          autocomplete="off"
          spellcheck="false"
          aria-label="サイト内検索"
          aria-autocomplete="list"
          aria-controls="omni-listbox"
        >
        <kbd class="omni-esc-key">Esc</kbd>
      </div>
      <div id="omni-listbox" class="omni-listbox" role="listbox" aria-label="検索結果"></div>
      <div class="omni-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> 移動</span>
        <span><kbd>Enter</kbd> 選択</span>
        <span><kbd>Esc</kbd> 閉じる</span>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  el.addEventListener('click', (e) => { if (e.target === el) closeSearchPalette(); });

  const input = document.getElementById('omni-input');
  input.addEventListener('input', () => _render(input.value));
  input.addEventListener('keydown', _handleKey);

  document.getElementById('omni-listbox').addEventListener('click', (e) => {
    const item = e.target.closest('[data-omni-idx]');
    if (item) _select(Number(item.dataset.omniIdx));
  });
}

export function openSearchPalette() {
  const el = document.getElementById('omni-backdrop');
  if (!el) return;
  el.hidden = false;
  _active = -1;
  _flat = [];
  const input = document.getElementById('omni-input');
  if (input) {
    input.value = '';
    input.focus();
    input.select();
  }
  _render('');
  _ensureMusicVideos().then(() => {
    if (!isSearchPaletteOpen()) return;
    const current = document.getElementById('omni-input')?.value || '';
    if (current.trim()) _render(current);
  });
}

export function closeSearchPalette() {
  const el = document.getElementById('omni-backdrop');
  if (el) el.hidden = true;
  _active = -1;
}

export function isSearchPaletteOpen() {
  const el = document.getElementById('omni-backdrop');
  return !!(el && !el.hidden);
}

// ──────────────────────────────────────────────────────────────────────────────
// 内部ロジック
// ──────────────────────────────────────────────────────────────────────────────

function _handleKey(e) {
  const items = document.querySelectorAll('#omni-listbox [data-omni-idx]');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _active = Math.min(_active + 1, items.length - 1);
    _updateActive(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _active = Math.max(_active - 1, -1);
    _updateActive(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (_active >= 0 && _flat[_active]) _select(_active);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeSearchPalette();
  }
}

function _updateActive(items) {
  items.forEach((el, i) => {
    el.classList.toggle('is-active', i === _active);
    el.setAttribute('aria-selected', String(i === _active));
  });
  if (_active >= 0) items[_active]?.scrollIntoView({ block: 'nearest' });
}

function _select(idx) {
  const result = _flat[idx];
  if (!result || !_onAction) return;
  closeSearchPalette();
  _onAction(result);
}

function _render(rawQuery) {
  const listbox = document.getElementById('omni-listbox');
  if (!listbox) return;
  _active = -1;
  _flat = [];

  const songs   = state.data?.songs || [];
  const streams = state.data?.streams || [];
  const videos  = _musicVideos || [];
  const q = _norm(rawQuery);
  let html = '';
  let idx = 0;

  if (!state.data) {
    listbox.innerHTML = '<div class="omni-empty">データ読み込み中…</div>';
    return;
  }

  // ── クエリなし：上位曲をクイックアクセス ──────────────────────────────────
  if (!q) {
    const tops = songs.slice(0, 8);
    if (tops.length) {
      html += _sectionLabel('🏆 よく歌われる曲');
      for (const song of tops) {
        _flat.push({ type: 'song', song });
        html += _songItem(song, idx++, '');
      }
    }
    listbox.innerHTML = html || '<div class="omni-empty">検索ワードを入力してください</div>';
    return;
  }

  // ── 曲: 全曲リストと同じ検索エンジン（あいまい・ムード・複合キーワード対応）──
  let matchedSongs = [];
  try { matchedSongs = (searchSongs(rawQuery, songs).results || []).slice(0, 8); } catch (_) {}
  if (!matchedSongs.length) {
    // フォールバック: トークン分割 AND 検索
    matchedSongs = songs.filter(s => _tokensMatch(rawQuery, `${s.title} ${s.artist}`)).slice(0, 8);
  }

  if (matchedSongs.length) {
    html += _sectionLabel('🎵 曲');
    for (const song of matchedSongs) {
      _flat.push({ type: 'song', song });
      html += _songItem(song, idx++, q);
    }
  }

  // ── 歌みた・オリ曲動画 ────────────────────────────────────────────────────
  if (videos.length) {
    const matchedVideos = videos.filter(v => _musicMatches(v, rawQuery)).slice(0, 6);
    if (matchedVideos.length) {
      html += _sectionLabel('🎬 歌みた・オリ曲');
      for (const video of matchedVideos) {
        _flat.push({ type: 'music-video', video });
        html += _musicVideoItem(video, idx++, rawQuery);
      }
    }
  }

  // ── アーティスト（トークン分割 AND 検索）──────────────────────────────────
  const seenArtists = new Set();
  const artistMatches = [];
  for (const s of songs) {
    if (s.artist && _tokensMatch(rawQuery, s.artist) && !seenArtists.has(s.artist)) {
      seenArtists.add(s.artist);
      artistMatches.push(s.artist);
      if (artistMatches.length >= 4) break;
    }
  }
  if (artistMatches.length) {
    html += _sectionLabel('🎤 アーティスト');
    for (const artist of artistMatches) {
      const cnt = songs.filter(s => s.artist === artist).length;
      _flat.push({ type: 'artist', artist });
      html += `<div class="omni-item" role="option" aria-selected="false" data-omni-idx="${idx++}">
        <span class="omni-item-icon">🎤</span>
        <div class="omni-item-body">
          <span class="omni-item-title">${_hl(escapeHtml(artist), q)}</span>
          <span class="omni-item-meta">${cnt}曲 · アーティスト絞り込み</span>
        </div>
      </div>`;
    }
  }

  // ── 配信枠（トークン分割 AND 検索: 各語がタイトルか収録曲のどこかに一致）──
  if (streams.length) {
    const matchedStreams = streams.filter(s => {
      const hay = _norm(`${s.title || ''} ${(s.songs || []).map(sg => `${sg.title || ''} ${sg.artist || ''}`).join(' ')}`);
      const tokens = _queryTokens(rawQuery);
      return tokens.length > 0 && tokens.every(t => hay.includes(t));
    }).slice(0, 5);

    if (matchedStreams.length) {
      html += _sectionLabel('📅 配信枠');
      for (const stream of matchedStreams) {
        _flat.push({ type: 'stream', stream });
        const chLabel = '';
        html += `<div class="omni-item" role="option" aria-selected="false" data-omni-idx="${idx++}">
          <span class="omni-item-icon">📅</span>
          <div class="omni-item-body">
            <span class="omni-item-title">${_hl(escapeHtml(stream.title || '配信'), q)}</span>
            <span class="omni-item-meta">${fmtDate(stream.date)}${chLabel ? ' · ' + chLabel : ''} · ${stream.songs?.length || 0}曲 · クリックで再生</span>
          </div>
        </div>`;
      }
    }
  }

  if (!html) {
    html = `<div class="omni-empty">「${escapeHtml(rawQuery)}」に一致する結果がありません 🐠</div>`;
  }
  listbox.innerHTML = html;
}

function _sectionLabel(text) {
  return `<div class="omni-section-label" role="presentation">${text}</div>`;
}

function _songItem(song, idx, q) {
  return `<div class="omni-item" role="option" aria-selected="false" data-omni-idx="${idx}">
    <span class="omni-item-icon">🎵</span>
    <div class="omni-item-body">
      <span class="omni-item-title">${_hl(escapeHtml(song.title), q)}</span>
      <span class="omni-item-meta">${_hl(escapeHtml(song.artist || ''), q)} · ${song.count}回歌唱</span>
    </div>
    <span class="omni-item-count">${song.count}<small>回</small></span>
  </div>`;
}

function _musicVideoItem(video, idx, q) {
  const badge = _musicTypeLabel(video);
  const sub = video.originalArtist || video.character || badge;
  return `<div class="omni-item" role="option" aria-selected="false" data-omni-idx="${idx}">
    <span class="omni-item-icon">🎬</span>
    <div class="omni-item-body">
      <span class="omni-item-title">${_hl(escapeHtml(video.title || '動画'), q)}</span>
      <span class="omni-item-meta">${escapeHtml(badge)}${sub ? ' · ' + escapeHtml(sub) : ''} · 動画で見る</span>
    </div>
  </div>`;
}

function _ensureMusicVideos() {
  if (_musicVideos !== null) return Promise.resolve(_musicVideos);
  if (_musicPromise) return _musicPromise;
  _musicPromise = fetch('/data/music.json', { cache: 'no-store' })
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`music.json ${res.status}`)))
    .then(json => {
      _musicVideos = Array.isArray(json?.videos) ? json.videos : [];
      return _musicVideos;
    })
    .catch(() => {
      _musicVideos = [];
      return _musicVideos;
    });
  return _musicPromise;
}

function _musicMatches(video, rawQuery) {
  const tokens = _queryTokens(rawQuery);
  if (!tokens.length) return false;
  const haystack = _musicSearchText(video);
  return tokens.every(token => haystack.includes(token));
}

function _musicSearchText(video) {
  const title = video.title || '';
  const slashParts = title.split(/[\/／|｜]/).map(s => s.trim()).filter(Boolean);
  return _norm([
    title,
    ...slashParts,
    video.originalArtist,
    video.character,
    video.type,
    _musicTypeLabel(video),
  ].filter(Boolean).join(' '));
}

function _musicTypeLabel(video) {
  switch (video?.type) {
    case 'cover': return '歌みた';
    case 'sugariri': return 'しゅがりり';
    default: return 'オリ曲';
  }
}

function _queryTokens(query) {
  return _norm(query)
    .split(/[\/／|｜\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/** 全トークンが対象テキストに含まれるか（スペース/スラッシュ区切りの AND 検索） */
function _tokensMatch(query, text) {
  const tokens = _queryTokens(query);
  if (!tokens.length) return false;
  const hay = _norm(text);
  return tokens.every(t => hay.includes(t));
}

function _norm(s) {
  return String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function _hl(escaped, q) {
  const tokens = _queryTokens(q);
  const needle = tokens.find(token => token && escaped.toLowerCase().includes(token)) || _norm(q);
  if (!needle) return escaped;
  const lower = escaped.toLowerCase();
  const qi = lower.indexOf(needle);
  if (qi < 0) return escaped;
  return (
    escaped.slice(0, qi) +
    '<mark class="hl">' + escaped.slice(qi, qi + needle.length) + '</mark>' +
    escaped.slice(qi + needle.length)
  );
}
