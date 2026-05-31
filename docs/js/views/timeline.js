import { state } from '../state.js';
import { TIMELINE_INITIAL, TIMELINE_STEP } from '../config.js';
import { $, $$, escapeHtml, fmtDate, streamKey } from '../utils.js';

export function renderTimeline() {
  const { streams } = state.data;
  const filter = state.timelineFilter;
  const filtered = filter
    ? streams.filter(s => s.songs.some(sg => sg.key === filter.key))
    : streams;
  const visible = sortTimelineStreams(filtered, state.timelineSort);

  const panel = $('#panel-timeline');
  panel.innerHTML = `
    <div class="section-header">
      <h2>📅 配信タイムライン</h2>
      <span class="count-pill">${visible.length}枠</span>
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
    const totalCount = visible.reduce(
      (n, s) => n + s.songs.filter(sg => sg.key === filter.key).length, 0);
    banner.innerHTML = `
      <div class="filter-banner">
        <span class="filter-icon">🔎</span>
        <div class="filter-text">
          <strong>${escapeHtml(filter.title)}</strong>
          <span style="color:var(--ink-mute);"> / ${escapeHtml(filter.artist)}</span>
          <span class="meta">この曲を歌った配信のみ表示中（${visible.length}枠 / ${totalCount}回歌唱）</span>
        </div>
        <button class="clear-btn" id="clear-filter">✕ 絞り込みを解除</button>
      </div>
    `;
    $('#clear-filter').addEventListener('click', () => {
      state.timelineFilter = null;
      state.timelineLimit = TIMELINE_INITIAL;
      renderTimeline();
    });
  }

  if (!visible.length) {
    $('#timeline').innerHTML = `<div class="empty-state">該当する配信がありません 🐠</div>`;
    return;
  }

  const limited = visible.slice(0, state.timelineLimit);
  $('#timeline').innerHTML = limited.map((s, idx) => renderItem(s, idx, filter)).join('');
  if (state.timelineFocus) {
    const focus = document.querySelector(`[data-streamkey="${CSS.escape(state.timelineFocus)}"]`);
    const item = focus?.closest('.timeline-item');
    item?.classList.add('focus');
    item?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    state.timelineFocus = null;
  }
  $('#timeline').onclick = async (event) => {
    const btn = event.target.closest('[data-copy-stream]');
    if (!btn) return;
    event.stopPropagation();
    const stream = limited[Number(btn.dataset.copyStream)];
    if (!stream) return;
    try {
      await navigator.clipboard.writeText(formatStreamSetlist(stream));
      btn.textContent = 'コピー済み';
      setTimeout(() => { btn.textContent = 'セトリコピー'; }, 1200);
    } catch (_) {
      btn.textContent = '失敗';
      setTimeout(() => { btn.textContent = 'セトリコピー'; }, 1200);
    }
  };

  const ctrl = $('#timeline-controls');
  if (state.timelineLimit < visible.length) {
    ctrl.innerHTML = `<button class="load-more-btn" id="load-more">▼ もっと見る (残り${visible.length - state.timelineLimit}枠)</button>`;
    $('#load-more').addEventListener('click', () => {
      state.timelineLimit += TIMELINE_STEP;
      renderTimeline();
    });
  }
}

function renderItem(s, idx, filter) {
  const recentClass = !filter && state.timelineSort === 'date-desc' && idx < 3 ? 'recent' : '';
  const setlistHtml = s.songs.map((song, i) => {
    const hit = filter && song.key === filter.key ? ' hit' : '';
    const title = hit ? 'クリックで絞り込み解除' : 'クリックで絞り込み';
    return `<span class="setlist-song${hit}" data-songkey="${escapeHtml(song.key)}" data-songtitle="${escapeHtml(song.title)}" data-songartist="${escapeHtml(song.artist)}" title="${title}"><span class="sl-num">${i + 1}</span>${escapeHtml(song.title)}<span style="color:var(--ink-mute);"> / ${escapeHtml(song.artist)}</span></span>`;
  }).join('');
  const titleHtml = s.url
    ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title || '配信')}</a>`
    : escapeHtml(s.title || '配信');
  const watchHtml = s.url
    ? `<a class="watch-link" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">▶ YouTube</a>`
    : '';
  const copyHtml = state.singerMode
    ? `<button class="timeline-copy-btn" type="button" data-copy-stream="${idx}">セトリコピー</button>`
    : '';
  return `
    <article class="timeline-item ${recentClass}">
      <span class="stream-anchor" data-streamkey="${escapeHtml(streamKey(s))}"></span>
      <header class="timeline-head">
        <span class="timeline-date">${fmtDate(s.date)}</span>
        <span class="timeline-stream-no">第${s.index}枠</span>
        <span class="timeline-songcount">🎤 ${s.songs.length}曲</span>
        ${copyHtml}
        ${watchHtml}
      </header>
      <div class="timeline-title">${titleHtml}</div>
      <div class="setlist">${setlistHtml}</div>
    </article>
  `;
}

function sortTimelineStreams(streams, sort) {
  const list = [...streams];
  const dateTime = (stream) => stream.date instanceof Date
    ? stream.date.getTime()
    : new Date(stream.date || 0).getTime();
  const streamIndex = (stream) => Number(stream.index) || 0;
  const songCount = (stream) => stream.songs?.length || 0;
  const byDateDesc = (a, b) => dateTime(b) - dateTime(a) || streamIndex(b) - streamIndex(a);

  switch (sort) {
    case 'date-asc':
      list.sort((a, b) => dateTime(a) - dateTime(b) || streamIndex(a) - streamIndex(b));
      break;
    case 'songs-desc':
      list.sort((a, b) => songCount(b) - songCount(a) || byDateDesc(a, b));
      break;
    case 'songs-asc':
      list.sort((a, b) => songCount(a) - songCount(b) || byDateDesc(a, b));
      break;
    case 'index-desc':
      list.sort((a, b) => streamIndex(b) - streamIndex(a) || byDateDesc(a, b));
      break;
    case 'index-asc':
      list.sort((a, b) => streamIndex(a) - streamIndex(b) || byDateDesc(a, b));
      break;
    case 'title':
      list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ja') || byDateDesc(a, b));
      break;
    case 'date-desc':
    default:
      list.sort(byDateDesc);
      break;
  }
  return list;
}

function formatStreamSetlist(stream) {
  return (stream.songs || [])
    .map((song) => `00:00 ${song.title} / ${song.artist}`)
    .join('\n');
}
