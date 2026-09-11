import { state } from '../store.js';
import { TIMELINE_INITIAL, TIMELINE_STEP } from '../config.js';
import { $, escapeHtml, fmtDate, streamKey } from '../utils.js';
import { isStreamInAnyPlaylist } from '../player/playlists-store.js';
import { groupByYearMonth, sortTimelineStreams, formatStreamSetlist } from './timeline/grouping.js';
import { icon } from '../icons.js';

const TIMELINE_COPY_ICON = icon('copy');
const TIMELINE_PLAY_ICON = icon('play');

export function renderTimeline() {
  const { streams } = state.data;
  const filter = state.timelineFilter;
  const filtered = filter
    ? streams.filter(s => s.songs.some(sg => sg.key === filter.key))
    : streams;
  const sorted = sortTimelineStreams(filtered, state.timelineSort);
  const isDateSort = state.timelineSort === 'date-desc' || state.timelineSort === 'date-asc';

  const panel = $('#panel-timeline');
  panel.innerHTML = `
    <div class="section-header">
      <h2>${icon('calendar')} 配信タイムライン</h2>
      <span class="count-pill">${sorted.length}枠</span>
    </div>
    <div class="timeline-tools">
      <label class="timeline-sort-field" for="timeline-sort">
        <span>並び替え</span>
        <select id="timeline-sort" class="select-input">
          <option value="date-desc"${state.timelineSort === 'date-desc' ? ' selected' : ''}>配信日（新しい順）</option>
          <option value="date-asc"${state.timelineSort === 'date-asc' ? ' selected' : ''}>配信日（古い順）</option>
          <option value="songs-desc"${state.timelineSort === 'songs-desc' ? ' selected' : ''}>曲数（多い順）</option>
          <option value="songs-asc"${state.timelineSort === 'songs-asc' ? ' selected' : ''}>曲数（少ない順）</option>
          <option value="index-desc"${state.timelineSort === 'index-desc' ? ' selected' : ''}>枠番号（大きい順）</option>
          <option value="index-asc"${state.timelineSort === 'index-asc' ? ' selected' : ''}>枠番号（小さい順）</option>
          <option value="title"${state.timelineSort === 'title' ? ' selected' : ''}>タイトル順</option>
        </select>
      </label>
      ${isDateSort ? `<label class="timeline-sort-field" for="timeline-month-jump">
        <span>月へ移動</span>
        <select id="timeline-month-jump" class="select-input">
          <option value="">選択…</option>
        </select>
      </label>` : ''}
    </div>
    <div id="timeline-filter-banner"></div>
    <div id="timeline" class="timeline"></div>
    <div class="timeline-controls" id="timeline-controls"></div>
  `;

  $('#timeline-sort')?.addEventListener('change', (event) => {
    state.timelineSort = event.target.value || 'date-desc';
    state.timelineLimit = TIMELINE_INITIAL;
    renderTimeline();
  });

  const banner = $('#timeline-filter-banner');
  if (filter) {
    const totalCount = sorted.reduce(
      (n, s) => n + s.songs.filter(sg => sg.key === filter.key).length, 0);
    banner.innerHTML = `
      <div class="filter-banner">
        <span class="filter-icon">${icon('search')}</span>
        <div class="filter-text">
          <strong>${escapeHtml(filter.title)}</strong>
          <span style="color:var(--ink-mute);"> / ${escapeHtml(filter.artist)}</span>
          <span class="meta">この曲を歌った配信のみ表示中（${sorted.length}枠 / ${totalCount}回歌唱）</span>
        </div>
        <button class="clear-btn" id="clear-filter">${icon('close')} 絞り込みを解除</button>
      </div>
    `;
    $('#clear-filter').addEventListener('click', () => {
      state.timelineFilter = null;
      state.timelineLimit = TIMELINE_INITIAL;
      renderTimeline();
    });
  }

  if (!sorted.length) {
    $('#timeline').innerHTML = `<div class="empty-state">該当する配信がありません 🐠</div>`;
    return;
  }

  if (isDateSort) {
    renderGrouped(sorted, filter);
  } else {
    renderFlat(sorted, filter);
  }
}

// ── 月グループ表示 ─────────────────────────────────────────────────────────

function renderGrouped(streams, filter) {
  const groups = groupByYearMonth(streams);

  // 月ジャンプ（プルダウン）
  const jumpSel = $('#timeline-month-jump');
  if (jumpSel) {
    jumpSel.innerHTML = '<option value="">選択…</option>' +
      groups.map(g => `<option value="${escapeHtml(g.key)}">${escapeHtml(g.label)}（${g.streams.length}枠）</option>`).join('');
    jumpSel.addEventListener('change', () => {
      const key = jumpSel.value;
      if (!key) return;
      const el = document.getElementById(`tl-month-${key}`);
      if (!el) return;
      el.open = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      jumpSel.value = '';
    });
  }

  // 月グループ
  $('#timeline').innerHTML = groups.map((g, gi) => {
    const items = g.streams.map((s, i) => renderItem(s, i, filter)).join('');
    return `
      <details class="timeline-month-group" id="tl-month-${escapeHtml(g.key)}"${gi === 0 ? ' open' : ''}>
        <summary class="timeline-month-summary">
          <span class="timeline-month-label">${escapeHtml(g.label)}</span>
          <span class="count-pill">${g.streams.length}枠</span>
        </summary>
        <div class="timeline-month-items">${items}</div>
      </details>
    `;
  }).join('');

  // フォーカス（他パネルから飛んできた場合）
  if (state.timelineFocus) {
    const focus = document.querySelector(`[data-streamkey="${CSS.escape(state.timelineFocus)}"]`);
    const item = focus?.closest('.timeline-item');
    if (item) {
      item.closest('.timeline-month-group')?.setAttribute('open', '');
      item.classList.add('focus');
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    state.timelineFocus = null;
  }

  setupClickHandlers(streams);
}

// ── フラット表示（日付以外のソート） ───────────────────────────────────────

function renderFlat(streams, filter) {
  const limited = streams.slice(0, state.timelineLimit);
  $('#timeline').innerHTML = limited.map((s, idx) => renderItem(s, idx, filter)).join('');

  if (state.timelineFocus) {
    const focus = document.querySelector(`[data-streamkey="${CSS.escape(state.timelineFocus)}"]`);
    const item = focus?.closest('.timeline-item');
    item?.classList.add('focus');
    item?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    state.timelineFocus = null;
  }

  const ctrl = $('#timeline-controls');
  if (state.timelineLimit < streams.length) {
    ctrl.innerHTML = `<button class="load-more-btn" id="load-more">${icon('chevronDown')} もっと見る (残り${streams.length - state.timelineLimit}枠)</button>`;
    $('#load-more').addEventListener('click', () => {
      state.timelineLimit += TIMELINE_STEP;
      renderTimeline();
    });
  }

  setupClickHandlers(limited);
}

// ── コピーハンドラ ─────────────────────────────────────────────────────────

function setupClickHandlers(streams) {
  $('#timeline').onclick = async (event) => {
    const btn = event.target.closest('[data-copy-key]');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    const key = btn.dataset.copyKey;
    const stream = streams.find(s => streamKey(s) === key);
    if (!stream) return;
    try {
      await navigator.clipboard.writeText(formatStreamSetlist(stream));
      btn.classList.add('is-copied');
      btn.setAttribute('aria-label', 'コピー済み');
      btn.setAttribute('data-tooltip', 'コピー済み');
      setTimeout(() => {
        btn.classList.remove('is-copied');
        btn.setAttribute('aria-label', 'セトリをコピー');
        btn.setAttribute('data-tooltip', 'セトリをコピー');
      }, 1200);
    } catch (_) {
      btn.classList.add('is-error');
      btn.setAttribute('aria-label', 'コピーに失敗');
      btn.setAttribute('data-tooltip', 'コピーに失敗');
      setTimeout(() => {
        btn.classList.remove('is-error');
        btn.setAttribute('aria-label', 'セトリをコピー');
        btn.setAttribute('data-tooltip', 'セトリをコピー');
      }, 1200);
    }
  };
}

// ── カードレンダリング ──────────────────────────────────────────────────────

function renderItem(s, idx, filter) {
  const recentClass = !filter && state.timelineSort === 'date-desc' && idx < 3 ? 'recent' : '';
  const setlistHtml = s.songs.map((song, i) => {
    const hit = filter && song.key === filter.key ? ' hit' : '';
    return `
      <li class="setlist-item${hit}">
        <span class="setlist-num">${i + 1}.</span>
        <button class="setlist-title" type="button"
          data-songkey="${escapeHtml(song.key)}"
          data-songtitle="${escapeHtml(song.title)}"
          data-songartist="${escapeHtml(song.artist)}"
          title="曲詳細を表示">${escapeHtml(song.title)}</button>
        ${song.artist ? `
        <span class="setlist-separator">/</span>
        <button class="setlist-artist" type="button"
          data-artist-search="${escapeHtml(song.artist)}"
          title="全曲リストで絞り込み">${escapeHtml(song.artist)}</button>` : ''}
      </li>`;
  }).join('');
  const titleHtml = s.url
    ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title || '配信')}</a>`
    : escapeHtml(s.title || '配信');
  const watchHtml = s.url
    ? `<span class="watch-actions"><a class="watch-open-link" href="${escapeHtml(s.url)}" target="_blank" rel="noopener" aria-label="YouTubeで開く" data-tooltip="YouTubeで開く" data-tooltip-pos="left">${TIMELINE_PLAY_ICON}</a></span>`
    : '';
  const skey = streamKey(s);
  const saved = isStreamInAnyPlaylist(skey);
  const saveHtml = `<button class="timeline-save-btn${saved ? ' is-saved' : ''}" type="button" data-playlist-add="${escapeHtml(skey)}" data-stream-title="${escapeHtml(s.title || '配信')}" aria-label="${saved ? 'プレイリストに保存済み' : 'プレイリストに保存'}" data-tooltip="${saved ? 'プレイリストに保存済み' : 'プレイリストに保存'}" data-tooltip-pos="left">${icon('bookmark')}</button>`;
  const copyHtml = `<button class="timeline-copy-btn" type="button" data-copy-key="${escapeHtml(skey)}" aria-label="セトリをコピー" data-tooltip="セトリをコピー" data-tooltip-pos="left">${TIMELINE_COPY_ICON}</button>`;
  const open = filter ? ' open' : '';
  return `
    <details class="timeline-item ${recentClass}"${open}>
      <span class="stream-anchor" data-streamkey="${escapeHtml(streamKey(s))}"></span>
      <summary class="timeline-summary">
        <span class="timeline-date-badge">${fmtDate(s.date).replace(/^\d{4}\//, '')}</span>
        <span class="timeline-summary-main">
          <span class="timeline-head">
            <span class="timeline-stream-no">第${s.index}枠</span>
            <span class="timeline-songcount">${s.songs.length}曲</span>
          </span>
          <span class="timeline-title">${titleHtml}</span>
        </span>
        <span class="timeline-actions">
          ${saveHtml}
          ${copyHtml}
          ${watchHtml}
        </span>
      </summary>
      <div class="timeline-setlist"><ol class="setlist-list">${setlistHtml}</ol></div>
    </details>
  `;
}

// 並び替え・グループ化・セトリ整形は views/timeline/grouping.js が所有する
// （DOM 非依存の純粋関数としてテストするため分離）
