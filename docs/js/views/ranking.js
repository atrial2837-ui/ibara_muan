import { state } from '../store.js';
import { $, escapeHtml, fmtDate, daysClass } from '../utils.js';
import { RANKING_LIST_LIMIT } from '../config.js';

// ──────────────────────────────────────────────────────────────────────────────
// メインレンダー
// ──────────────────────────────────────────────────────────────────────────────

export function renderRanking() {
  const { songs, streams = [] } = state.data;
  const period = state.rankingPeriod || 'all';

  const panel = $('#panel-ranking');
  if (!panel) return;

  // 期間データ計算（期間指定時のみ）
  const periodData = period === 'all' ? null : computePeriodData(streams, period);

  // ソート済みリスト
  const sorted = periodData
    ? buildPeriodRanking(songs, periodData)
    : [...songs].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'ja'));

  const limit = state.rankingLimit;
  const visible = sorted.slice(0, limit);
  const streamsLoaded = !!state.channelData?.fullLoaded;

  panel.innerHTML = `
    <div class="section-header">
      <h2>🏆 歌唱回数ランキング</h2>
      <span class="count-pill">${songs.length}曲中</span>
    </div>
    ${renderPeriodSelector(streams, period, streamsLoaded)}
    ${periodData ? renderPeriodHeader(periodData) : ''}
    ${!periodData ? `
      <div class="podium">
        ${visible.slice(0, 3).map((s, i) => podiumCard(s, i)).join('')}
      </div>
    ` : (periodData.counts.size === 0 ? `
      <div class="empty-state">この期間に歌唱記録がありません 🐠</div>
    ` : '')}
    ${periodData?.counts.size !== 0 || !periodData ? `
      <div class="song-list${periodData ? ' has-delta' : ''}">
        ${visible.map((song, i) => rowHtml(song, i + 1, periodData)).join('')}
      </div>
      ${limit < sorted.length ? `
        <div class="timeline-controls">
          <button class="load-more-btn" id="rank-more">▼ もっと表示 (残り${sorted.length - limit}曲)</button>
        </div>` : ''}
    ` : ''}
  `;

  // 期間ボタン
  panel.addEventListener('click', (e) => {
    const periodBtn = e.target.closest('[data-ranking-period]');
    if (!periodBtn) return;
    const newPeriod = periodBtn.dataset.rankingPeriod;
    if (newPeriod !== period) {
      state.rankingPeriod = newPeriod;
      state.rankingLimit = RANKING_LIST_LIMIT;
      renderRanking();
    }
  });

  // 月セレクト
  const monthSelect = document.getElementById('ranking-month-select');
  if (monthSelect) {
    monthSelect.addEventListener('change', (e) => {
      if (!e.target.value) return;
      state.rankingMonth = e.target.value;
      state.rankingPeriod = 'month-select';
      state.rankingLimit = RANKING_LIST_LIMIT;
      renderRanking();
    });
  }

  const more = document.getElementById('rank-more');
  if (more) {
    more.addEventListener('click', () => {
      state.rankingLimit += 50;
      renderRanking();
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 期間セレクター UI
// ──────────────────────────────────────────────────────────────────────────────

function renderPeriodSelector(streams, currentPeriod, streamsLoaded) {
  const periods = [
    { key: 'all',        label: '全期間' },
    { key: 'month',      label: '今月' },
    { key: 'prev-month', label: '先月' },
    { key: 'week',       label: '直近7日' },
  ];
  const months = getAvailableMonths(streams);
  const currentMonth = state.rankingMonth || '';

  return `
    <div class="ranking-period-selector">
      ${periods.map(p => `
        <button
          class="period-btn${currentPeriod === p.key ? ' active' : ''}"
          type="button"
          data-ranking-period="${p.key}"
          ${(!streamsLoaded && p.key !== 'all') ? 'disabled title="配信データ読み込み中"' : ''}
        >${p.key === 'all' ? p.label : (streamsLoaded ? p.label : p.label + ' …')}</button>
      `).join('')}
      ${months.length && streamsLoaded ? `
        <select id="ranking-month-select" class="select-input period-month-select" title="月を指定">
          <option value="">月を選択…</option>
          ${months.map(m => {
            const [y, mo] = m.split('-');
            const label = `${y}年${Number(mo)}月`;
            return `<option value="${m}"${currentPeriod === 'month-select' && currentMonth === m ? ' selected' : ''}>${label}</option>`;
          }).join('')}
        </select>
      ` : ''}
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────────────────────
// 期間ヘッダー
// ──────────────────────────────────────────────────────────────────────────────

function renderPeriodHeader(periodData) {
  const { label, prevLabel, counts, totalSongs } = periodData;
  return `
    <div class="ranking-period-header">
      <span class="ranking-period-label">${escapeHtml(label)}</span>
      <span class="ranking-period-meta">${counts.size}曲・合計${totalSongs}回歌唱
        ${prevLabel ? `<span class="ranking-prev-label">（前：${escapeHtml(prevLabel)}比）</span>` : ''}
      </span>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────────────────────
// 期間データ計算
// ──────────────────────────────────────────────────────────────────────────────

function computePeriodData(streams, period) {
  const now = new Date();
  let start, end, prevStart, prevEnd, label, prevLabel;

  if (period === 'week') {
    end = new Date(now);
    start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    prevEnd   = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    prevStart = new Date(prevEnd); prevStart.setDate(prevEnd.getDate() - 6);
    prevStart.setHours(0, 0, 0, 0);
    label = '直近7日';
    prevLabel = '前の7日';

  } else if (period === 'month') {
    const y = now.getFullYear(), m = now.getMonth();
    start     = new Date(y, m, 1);
    end       = new Date(y, m + 1, 0, 23, 59, 59);
    prevStart = new Date(y, m - 1, 1);
    prevEnd   = new Date(y, m, 0, 23, 59, 59);
    label     = `${y}年${m + 1}月`;
    prevLabel = `${y}年${m || 12}月`;

  } else if (period === 'prev-month') {
    const y = now.getFullYear(), rawM = now.getMonth() - 1;
    const adjY = rawM < 0 ? y - 1 : y;
    const adjM = ((rawM % 12) + 12) % 12;
    start     = new Date(adjY, adjM, 1);
    end       = new Date(adjY, adjM + 1, 0, 23, 59, 59);
    prevStart = new Date(adjY, adjM - 1, 1);
    prevEnd   = new Date(adjY, adjM, 0, 23, 59, 59);
    label     = `${adjY}年${adjM + 1}月（先月）`;
    prevLabel = `${adjY}年${adjM || 12}月`;

  } else if (period === 'month-select' && state.rankingMonth) {
    const [y, mo] = state.rankingMonth.split('-').map(Number);
    start     = new Date(y, mo - 1, 1);
    end       = new Date(y, mo, 0, 23, 59, 59);
    prevStart = new Date(y, mo - 2, 1);
    prevEnd   = new Date(y, mo - 1, 0, 23, 59, 59);
    label     = `${y}年${mo}月`;
    prevLabel = `${mo === 1 ? y - 1 : y}年${mo === 1 ? 12 : mo - 1}月`;

  } else {
    return null;
  }

  const counts     = _countInRange(streams, start, end);
  const prevCounts = _countInRange(streams, prevStart, prevEnd);
  const totalSongs = [...counts.values()].reduce((s, n) => s + n, 0);

  return { label, prevLabel, start, end, counts, prevCounts, totalSongs };
}

function _countInRange(streams, start, end) {
  const counts = new Map();
  for (const stream of streams) {
    const d = stream.date instanceof Date ? stream.date : new Date(stream.date || 0);
    if (d >= start && d <= end) {
      for (const song of stream.songs || []) {
        counts.set(song.key, (counts.get(song.key) || 0) + 1);
      }
    }
  }
  return counts;
}

function buildPeriodRanking(songs, { counts, prevCounts }) {
  const songMap = new Map(songs.map(s => [s.key, s]));
  const result = [];
  for (const [key, count] of counts) {
    const song = songMap.get(key);
    if (!song) continue;
    const prev = prevCounts.get(key) || 0;
    result.push({ ...song, periodCount: count, delta: count - prev, isNew: prev === 0 });
  }
  result.sort((a, b) => b.periodCount - a.periodCount || a.title.localeCompare(b.title, 'ja'));
  result.forEach((s, i) => { s.periodRank = i + 1; });
  return result;
}

function getAvailableMonths(streams) {
  const months = new Set();
  for (const s of streams) {
    const d = s.date instanceof Date ? s.date : new Date(s.date || 0);
    if (!isNaN(d)) {
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  }
  return [...months].sort().reverse();
}

// ──────────────────────────────────────────────────────────────────────────────
// HTML 生成
// ──────────────────────────────────────────────────────────────────────────────

function podiumCard(s, i) {
  const medals = ['🥇', '🥈', '🥉'];
  return `
    <div class="podium-card rank-${i + 1}"
      data-songkey="${escapeHtml(s.key)}"
      data-songtitle="${escapeHtml(s.title)}"
      data-songartist="${escapeHtml(s.artist)}"
      title="クリックで配信タイムラインに絞り込み">
      <div class="podium-medal">${medals[i]}</div>
      <div class="song-title">${escapeHtml(s.title)}</div>
      <button class="song-artist artist-search-btn" type="button" data-artist-search="${escapeHtml(s.artist)}">${escapeHtml(s.artist)}</button>
      <div class="count-big">${s.count}<small>回</small></div>
      <div class="last-sung">${s.lastSung ? `最終: ${fmtDate(s.lastSung)} (${s.daysSinceLast}日前)` : '未披露'}</div>
    </div>
  `;
}

function rowHtml(song, displayRank, periodData) {
  const count     = periodData ? song.periodCount : song.count;
  const rank      = periodData ? song.periodRank  : (song.rank ?? displayRank);
  const rankClass = rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : '';

  const sideContent = periodData
    ? `<div class="count">${count}<small>回</small></div>
       <div class="rank-delta ${deltaClass(song)}">${deltaLabel(song)}</div>`
    : `<div class="count">${count}<small>回</small></div>
       <div class="last">${song.lastSung
         ? `<span class="last-date">${fmtDate(song.lastSung)}</span><span class="badge ${daysClass(song.daysSinceLast)}">${song.daysSinceLast}日前</span>`
         : '<span class="last-date">未披露</span><span class="badge never">—</span>'
       }</div>`;

  return `
    <div class="song-row" data-songkey="${escapeHtml(song.key)}" data-songtitle="${escapeHtml(song.title)}" data-songartist="${escapeHtml(song.artist)}" title="クリックで詳細を表示">
      <div class="rank ${rankClass}">${rank}</div>
      <div class="info">
        <div class="title">${escapeHtml(song.title)}</div>
        <button class="artist artist-search-btn" type="button" data-artist-search="${escapeHtml(song.artist)}">${escapeHtml(song.artist)}</button>
      </div>
      <div class="song-row-side">
        ${sideContent}
      </div>
    </div>
  `;
}

function deltaClass(song) {
  if (song.isNew)       return 'new';
  if (song.delta > 0)   return 'up';
  if (song.delta < 0)   return 'down';
  return 'same';
}

function deltaLabel(song) {
  if (song.isNew)       return 'NEW';
  if (song.delta > 0)   return `▲${song.delta}`;
  if (song.delta < 0)   return `▼${Math.abs(song.delta)}`;
  return '—';
}
