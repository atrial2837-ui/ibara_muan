// ヒーローセクション(統計カード)の描画
import { state } from '../store.js';
import { $, escapeHtml, fmtDate, daysSince, formatNumber } from '../utils.js';

let _heroCardsReady = false;

export function renderHero() {
  if (!state.data) return;
  const { stats, streams = [] } = state.data;
  const latest = streams[0]?.date || null;
  const dSinceLatest = daysSince(latest);
  const dataGeneratedDate = stats.dataGeneratedDate || state.channelData?.dataGeneratedDate || null;
  const dSinceUpdate = daysSince(dataGeneratedDate);
  const chLabel = stats.channelLabel || stats.channelId || '';
  const chBadge = chLabel ? `<span class="badge accent" style="margin-right:8px;">${escapeHtml(chLabel)}</span>` : '';

  $('#updated-info').innerHTML =
    chBadge +
    `データ更新日：<strong>${fmtDate(dataGeneratedDate) || '—'}</strong>` +
    (dSinceUpdate != null ? ` <span class="badge">${dSinceUpdate}日前</span>` : '');

  const statsGrid = $('#stats-grid');
  if (!_heroCardsReady) {
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">総歌唱数</div>
        <div class="stat-value">${formatNumber(stats.total)}<span class="stat-unit">回</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">持ち曲数</div>
        <div class="stat-value">${formatNumber(stats.repertoire)}<span class="stat-unit">曲</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">歌枠回数</div>
        <div class="stat-value">${formatNumber(stats.streams)}<span class="stat-unit">回</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">1枠平均</div>
        <div class="stat-value">${stats.avgPerStream}<span class="stat-unit">曲</span></div>
      </div>
      <div class="stat-card accent">
        <div class="stat-label">最新歌枠から</div>
        <div class="stat-value">${dSinceLatest != null ? dSinceLatest : '—'}<span class="stat-unit">日</span></div>
      </div>
      <div class="stat-card gold">
        <div class="stat-label">活動期間</div>
        <div class="stat-value">${activeDays(state.data)}<span class="stat-unit">日</span></div>
      </div>
    `;
    _heroCardsReady = true;
  } else {
    const values = statsGrid.querySelectorAll('.stat-value');
    if (values.length >= 6) {
      values[0].textContent = formatNumber(stats.total);
      values[0].innerHTML += '<span class="stat-unit">回</span>';
      values[1].textContent = formatNumber(stats.repertoire);
      values[1].innerHTML += '<span class="stat-unit">曲</span>';
      values[2].textContent = formatNumber(stats.streams);
      values[2].innerHTML += '<span class="stat-unit">回</span>';
      values[3].textContent = stats.avgPerStream;
      values[3].innerHTML += '<span class="stat-unit">曲</span>';
      values[4].textContent = dSinceLatest != null ? dSinceLatest : '—';
      values[4].innerHTML += '<span class="stat-unit">日</span>';
      values[5].textContent = activeDays(state.data);
      values[5].innerHTML += '<span class="stat-unit">日</span>';
    }
  }
}

function activeDays(data) {
  if (!data.streams?.length) return '—';
  const first = data.streams[data.streams.length - 1].date;
  const last = data.streams[0].date;
  return Math.floor((last - first) / 86400000) + 1;
}
