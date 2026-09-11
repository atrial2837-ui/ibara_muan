/**
 * 歌枠一覧グリッド（プレイリスト「all-streams」サブタブ）
 *
 * 全配信枠のサムネグリッド表示・ソート・ページネーションを所有する。
 * 全体再描画は initAllStreams({ rerender }) で親ビューから注入される。
 */

import { $, escapeHtml, fmtDate, streamKey, youtubeThumb, youtubeThumbHq } from '../../utils.js';
import { isStreamInAnyPlaylist } from '../../player/playlists-store.js';

const PER_PAGE = 24; // 4列 × 6行

const PL_BOOKMARK_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/></svg>';

const SORT_OPTIONS = [
  { key: 'newest',      label: '新しい順' },
  { key: 'oldest',      label: '古い順'   },
  { key: 'most-songs',  label: '曲数↓'    },
  { key: 'fewest-songs',label: '曲数↑'    },
];

let _streamPage = 1;
let _streamSort = 'newest';

// 親ビューから注入される全体再描画（renderPlaylists 相当）
let _rerender = () => {};

/** 親ビューから依存を注入する（renderPlaylists の初期化時に一度呼ぶ） */
export function initAllStreams({ rerender }) {
  if (rerender) _rerender = rerender;
}

/** サブタブ切替時にページを先頭へ戻す */
export function resetStreamPage() {
  _streamPage = 1;
}

function _sortStreams(streams, sort) {
  const s = streams.slice();
  if (sort === 'oldest')       return s.reverse();
  if (sort === 'most-songs')   return s.sort((a, b) => (b.songs?.length ?? 0) - (a.songs?.length ?? 0));
  if (sort === 'fewest-songs') return s.sort((a, b) => (a.songs?.length ?? 0) - (b.songs?.length ?? 0));
  return s; // newest (default — already sorted newest-first in store)
}

export function renderAllStreams(streams) {
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
  const safePage   = Math.min(Math.max(1, _streamPage), totalPages);
  const start      = (safePage - 1) * PER_PAGE;
  const slice      = sorted.slice(start, start + PER_PAGE);

  const cards = slice.map(s => {
    const skey = streamKey(s);
    // 主=maxres(高解像度)、失敗時は data-fallback の mqdefault に onerror で切り替わる
    const thumb = youtubeThumbHq(s.url);
    const thumbFb = youtubeThumb(s.url);
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
          <span class="pl-sg-add${isStreamInAnyPlaylist(skey) ? ' is-saved' : ''}" role="button" tabindex="0"
            aria-label="プレイリストに追加"
            data-playlist-add="${escapeHtml(skey)}" data-stream-title="${escapeHtml(s.title || '配信')}"
            title="プレイリストに追加">${PL_BOOKMARK_SVG}</span>
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

/** all-streams サブタブ由来のクリック（ソート/ページ）。処理したら true。 */
export function handleAllStreamsClick(e, allStreams) {
  const sortBtn = e.target.closest('[data-pl-sort]');
  if (sortBtn) {
    _streamSort = sortBtn.dataset.plSort;
    _streamPage = 1;
    _renderPageInPlace(allStreams);
    return true;
  }

  const pageBtn = e.target.closest('[data-pl-page]');
  if (pageBtn && !pageBtn.disabled) {
    _streamPage = Number(pageBtn.dataset.plPage);
    _renderPageInPlace(allStreams);
    return true;
  }

  return false;
}

/** ページ切替時はグリッド部分だけ差し替えてスクロールを戻す */
function _renderPageInPlace(allStreams) {
  const body = $('#pl-subtab-body');
  if (!body) { _rerender(); return; }
  body.innerHTML = renderAllStreams(allStreams);
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
