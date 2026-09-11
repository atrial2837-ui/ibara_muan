import { state } from '../store.js';
import { $, escapeHtml, fmtDate, fmtMonth, youtubeThumb } from '../utils.js';
import { periodHits, buildMonthly, buildHeatmap, heatLevel } from '../domain-compat.js';
import { getToday } from '../store.js';
import { icon } from '../icons.js';
import { openStreamViewer, playMyListInViewer } from '../player/stream-player.js';
import { getWatchHistory, clearWatchHistory } from '../player/watch-history.js';
import { chartCanvas, createChart, getColors } from '../charts.js';
import { analyticsSectionHtml, bindAnalytics } from '../sections/analytics.js';

export function renderDashboard() {
  const { songs, streams, artists } = state.data;
  const sorted = [...songs].sort((a, b) => b.count - a.count);
  const top5 = sorted.slice(0, 5);
  const top5Max = top5[0]?.count || 1;
  const recent = streams.slice(0, 5);
  const today = getToday();
  const panel = $('#panel-dashboard');
  const heatmap = buildHeatmap(streams, today);
  const monthly = buildMonthly(streams).slice(-12);
  const genreRows = genreTopRows(songs);

  const top5Html = `
    <div class="card dashboard-card dashboard-top-card">
      <div class="card-title">${icon('rank')} TOP5 楽曲</div>
      <div class="bar-list">
        ${top5.length ? top5.map((s, i) => topBarRow(s, i, top5Max)).join('') : '<div class="empty-state">曲データなし</div>'}
      </div>
    </div>
  `;

  panel.innerHTML = `
    <div class="dashboard-grid" id="dashboard-grid">
      <div class="dashboard-trio-grid">
        ${top5Html}
        ${hitsCardHtml(streams)}
        <div class="card dashboard-card dashboard-genre-card">
          <div class="card-title">${icon('chart')} ジャンル分布 <span class="pill">${songs.length}曲</span></div>
          ${renderGenreChart(genreRows)}
        </div>
      </div>
      <div class="dashboard-overview-grid">
        <div class="card dashboard-card dashboard-monthly-card">
          <div class="card-title">${icon('music')} 月別 歌唱数 <span class="pill">直近12か月</span></div>
          ${monthly.length ? chartCanvas('chart-monthly', { class: 'short' }) : '<div class="empty-state">月別データなし</div>'}
        </div>
        <div class="card dashboard-card dashboard-heatmap-card">
          <div class="card-title">${icon('calendar')} 配信ヒートマップ <span class="pill">直近1年</span></div>
          ${renderHeatmap(heatmap)}
        </div>
      </div>
      ${renderResumeSection()}
      ${renderRecentStreamsCard(recent)}
      <div class="dashboard-analytics-section" id="dashboard-analytics">
        ${analyticsSectionHtml(songs, streams)}
      </div>
    </div>
  `;
  bindResumeSection();
  bindHitsToggle();
  drawGenreChart(genreRows);
  drawMonthlyChart(monthly);
  bindAnalytics(songs, streams, artists);

  // ヒートマップは直近1年を横に並べるため、初期表示で最新（右端）へ
  const heatmapWrap = panel.querySelector('.heatmap-wrap');
  if (heatmapWrap) heatmapWrap.scrollLeft = heatmapWrap.scrollWidth;
}

/* ── よく歌われた曲（今月/今年 スライド切替） ───────────────────────────── */

function bindHitsToggle() {
  const toggle = $('#dashboard-hits-toggle');
  const card = toggle?.closest('.dashboard-list-card');
  if (!toggle || !card) return;
  const setPeriod = (period) => {
    card.querySelectorAll('[data-hits-list]').forEach(list => {
      list.hidden = list.dataset.hitsList !== period;
    });
    toggle.querySelectorAll('[data-hits-period]').forEach(b => {
      const active = b.dataset.hitsPeriod === period;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
    });
    toggle.dataset.active = period;
  };
  toggle.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hits-period]');
    if (!btn) return;
    setPeriod(btn.dataset.hitsPeriod);
  });
  setPeriod('month');
}

/* ── よく歌われた曲カード ──────────────────────────────────────────────── */

function hitsCardHtml(streams) {
  const monthlyHits = periodHits(streams, 'month', getToday());
  const yearlyHits = periodHits(streams, 'year', getToday());
  return `
    <div class="card dashboard-card dashboard-list-card dashboard-list-hits">
      <div class="card-title">${icon('rank')} よく歌われた曲
        <span class="seg-control" id="dashboard-hits-toggle" data-active="month" role="tablist" aria-label="期間切替">
          <span class="seg-thumb" aria-hidden="true"></span>
          <button class="seg-btn is-active" type="button" role="tab" aria-selected="true" data-hits-period="month">今月</button>
          <button class="seg-btn" type="button" role="tab" aria-selected="false" data-hits-period="year">今年</button>
        </span>
      </div>
      <div class="bar-list" data-hits-list="month">
        ${monthlyHits.length ? monthlyHits.slice(0, 5).map((s, i) => topBarRow(s, i, monthlyHits[0].count)).join('') : '<div class="empty-state">今月の歌唱履歴なし</div>'}
      </div>
      <div class="bar-list" data-hits-list="year" hidden>
        ${yearlyHits.length ? yearlyHits.slice(0, 5).map((s, i) => topBarRow(s, i, yearlyHits[0].count)).join('') : '<div class="empty-state">今年の歌唱履歴なし</div>'}
      </div>
    </div>
  `;
}

/* ── 活動まとめ（旧「今月の活動」+「まとめ」を統合） ─────────────────────────── */

/* ── 続きから見る（視聴履歴） ──────────────────────────────────────────── */

// 視聴履歴の永続化は player/watch-history.js が唯一の所有者

function _fmtPos(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
}

function renderResumeSection() {
  const entries = getWatchHistory().slice(0, 6);
  if (!entries.length) return '';
  return `
    <div class="card dashboard-card dashboard-resume-card">
      <div class="card-title">${icon('play')} 続きから見る
        <span class="dashboard-resume-actions">
          <button class="dashboard-resume-clear dashboard-resume-queue" id="dashboard-resume-queue" type="button" title="履歴をキューとして再生">キュー再生</button>
          <button class="dashboard-resume-clear" id="dashboard-resume-clear" type="button" title="履歴を消去">消去</button>
        </span>
      </div>
      <div class="dashboard-resume-list" id="dashboard-resume-list">
        ${entries.map((e, i) => {
          const thumb = youtubeThumb(e.url);
          const days = Math.floor((Date.now() - (e.updatedAt || 0)) / 86400000);
          const ago = days <= 0 ? '今日' : `${days}日前`;
          return `
          <button class="dashboard-resume-item" type="button" data-resume-idx="${i}" title="${escapeHtml(e.title || '')}">
            ${thumb ? `<img class="dashboard-resume-thumb" src="${escapeHtml(thumb)}" alt="" width="320" height="180" loading="lazy" referrerpolicy="no-referrer">` : '<div class="dashboard-resume-thumb"></div>'}
            <span class="dashboard-resume-title">${escapeHtml(e.title || '動画')}</span>
            <span class="dashboard-resume-meta">${icon('time')} ${_fmtPos(e.t)} から ・ ${ago}</span>
          </button>`;
        }).join('')}
      </div>
    </div>`;
}

/** renderDashboard 後に呼ぶ: 続きから見るのクリック処理 */
function bindResumeSection() {
  const list = $('#dashboard-resume-list');
  if (list) {
    list.onclick = (e) => {
      const btn = e.target.closest('[data-resume-idx]');
      if (!btn) return;
      const entry = getWatchHistory()[Number(btn.dataset.resumeIdx)];
      if (!entry?.url) return;
      let target = null;
      if (entry.channel != null && entry.index != null) {
        const all = state.channelData?.combined?.streams || state.data?.streams || [];
        target = all.find(s => s.channel === entry.channel && s.index === entry.index) || null;
      }
      openStreamViewer(target || { url: entry.url, title: entry.title, isMv: !!entry.isMv }, entry.t);
    };
  }
  const clear = $('#dashboard-resume-clear');
  if (clear) {
    clear.onclick = () => {
      clearWatchHistory();
      $('#panel-dashboard .dashboard-resume-card')?.remove();
    };
  }
  const queueBtn = $('#dashboard-resume-queue');
  if (queueBtn) {
    queueBtn.onclick = () => {
      const entries = getWatchHistory();
      const streams = state.channelData?.combined?.streams || state.data?.streams || [];
      const items = entries.map((entry, i) => {
        const stream = entry.channel != null && entry.index != null
          ? streams.find(s => s.channel === entry.channel && s.index === entry.index)
          : null;
        if (stream?.url) return { kind: 'stream', key: `${stream.channel}:${stream.index}`, stream };
        if (entry.url) return { kind: 'mv', key: `history:${i}`, video: { url: entry.url, title: entry.title || '動画', isMv: !!entry.isMv } };
        return null;
      }).filter(Boolean);
      if (!items.length) return;
      playMyListInViewer({ name: '視聴履歴', items, idx: 0 });
    };
  }
}

/* ── 遅延セクション（概要グリッドの下に続くカード群） ─────────────────────────── */

/** 直近の歌枠（タイムラインへの入口。新鮮な内容なので先頭に） */
function renderRecentStreamsCard(recent) {
  return `
    <div class="card dashboard-card dashboard-recent-card">
      <div class="card-title">${icon('video')} 直近の歌枠 <span class="pill">最新${recent.length}件</span></div>
      ${recent.map(s => `
        <div class="activity-row">
          <span class="a-date">${fmtDate(s.date)}</span>
          <span class="a-title">${s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title || '配信')}</a>` : escapeHtml(s.title)}</span>
          <span class="a-meta">${icon('mic')} ${s.songs.length}曲</span>
        </div>
      `).join('')}
    </div>
  `;
}

function topBarRow(s, i, max) {
  const pct = Math.round((s.count / max) * 100);
  return `
    <div class="bar-row clickable" role="button" tabindex="0" data-songkey="${escapeHtml(s.key)}" data-songtitle="${escapeHtml(s.title)}" data-songartist="${escapeHtml(s.artist)}">
      <div class="bar-rank">${i + 1}</div>
      <div class="bar-content">
        <div class="bar-label">${escapeHtml(s.title)}${s.artist ? ` <span class="bar-label-sep">/</span> <button class="bar-label-artist artist-search-btn" type="button" data-artist-search="${escapeHtml(s.artist)}" title="このアーティストの曲を絞り込む">${escapeHtml(s.artist)}</button>` : ''}</div>
        <div class="bar-bar" style="width:${pct}%;"></div>
      </div>
      <div class="bar-value">${s.count}</div>
    </div>
  `;
}

/** ジャンル集計（上位5件＋その他に丸め） */
function genreTopRows(songs) {
  const genreCounts = new Map();
  for (const s of songs) {
    const genre = s.genre || s.genreText || '未分類';
    if (!genre || genre === '未分類') continue;
    genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  }
  const rows = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (rows.length <= 6) return rows;
  const top = rows.slice(0, 5);
  const rest = rows.slice(5).reduce((sum, [, count]) => sum + count, 0);
  return [...top, ['その他', rest]];
}

/** ドーナツと凡例で共有するパレット（テーマ連動＋予備色） */
function genrePalette() {
  const c = getColors();
  return [c.primary, c.accent, c.gold, c.primaryStrong, c.accentStrong, '#9b7ed9'];
}

function renderGenreChart(rows) {
  if (!rows.length) return '<div class="empty-state">ジャンルデータなし</div>';
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  const palette = genrePalette();
  return `
    <div class="genre-doughnut" aria-label="ジャンル分布">
      ${chartCanvas('chart-genre', { class: 'genre-chart' })}
      <div class="genre-table">
        ${rows.map(([genre, count], index) => `
          <div class="genre-trow" style="--gc:${palette[index % palette.length]}" title="${escapeHtml(genre)}: ${count}曲">
            <span class="genre-tdot" aria-hidden="true"></span>
            <span class="genre-tname">${escapeHtml(genre)}</span>
            <span class="genre-tvals"><strong class="genre-tpct">${Math.round((count / total) * 100)}%</strong><span class="genre-tcount">(${count}曲)</span></span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/** 円内の％表示（狭い区分は引き出し線で外に表示） */
function genrePctPlugin(colors) {
  return {
    id: 'genre-pct',
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      if (!meta?.data?.length) return;
      const data = chart.data.datasets[0].data;
      const total = data.reduce((sum, v) => sum + v, 0);
      if (!total) return;
      const { ctx } = chart;
      ctx.save();
      meta.data.forEach((arc, i) => {
        const pct = Math.round((data[i] / total) * 100);
        const midAngle = (arc.startAngle + arc.endAngle) / 2;
        const color = colors[i % colors.length];
        if (pct >= 4) {
          const r = (arc.innerRadius + arc.outerRadius) / 2;
          const x = arc.x + Math.cos(midAngle) * r;
          const y = arc.y + Math.sin(midAngle) * r;
          ctx.fillStyle = '#fff';
          ctx.font = '800 12px "Noto Sans JP", "Yu Gothic", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${pct}%`, x, y);
        } else {
          const cos = Math.cos(midAngle), sin = Math.sin(midAngle);
          const x0 = arc.x + cos * arc.outerRadius;
          const y0 = arc.y + sin * arc.outerRadius;
          const x1 = arc.x + cos * (arc.outerRadius + 6);
          const y1 = arc.y + sin * (arc.outerRadius + 6);
          const x2 = x1 + (cos >= 0 ? 12 : -12);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y1);
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.font = '800 11px "Noto Sans JP", "Yu Gothic", system-ui, sans-serif';
          ctx.textAlign = cos >= 0 ? 'left' : 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${pct}%`, x2 + (cos >= 0 ? 3 : -3), y1);
        }
      });
      ctx.restore();
    },
  };
}

/** 中央に合計曲数を表示 */
function genreCenterPlugin(total) {
  return {
    id: 'genre-center',
    afterDraw(chart) {
      const arc = chart.getDatasetMeta(0)?.data?.[0];
      if (!arc) return;
      const c = getColors();
      const { ctx } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = c.ink;
      ctx.font = '800 18px "Noto Sans JP", "Yu Gothic", system-ui, sans-serif';
      ctx.fillText(`${total}曲`, arc.x, arc.y - 9);
      ctx.fillStyle = c.inkMute;
      ctx.font = '500 11px "Noto Sans JP", "Yu Gothic", system-ui, sans-serif';
      ctx.fillText('全体', arc.x, arc.y + 12);
      ctx.restore();
    },
  };
}

function drawGenreChart(rows) {
  if (!rows.length) return;
  const c = getColors();
  const palette = genrePalette();
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  createChart('chart-genre', 'doughnut', {
    labels: rows.map(([genre]) => genre),
    datasets: [{
      data: rows.map(([, count]) => count),
      backgroundColor: rows.map((_, i) => palette[i % palette.length]),
      borderColor: c.surface,
      borderWidth: 2,
    }],
  }, {
    cutout: '58%',
    layout: { padding: 14 },
    // ドーナツに軸は不要（共通デフォルトの目盛・グリッド線を消す）
    scales: {
      x: { display: false },
      y: { display: false },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item) => {
            const t = item.dataset.data.reduce((sum, v) => sum + v, 0);
            const pct = t ? Math.round((item.parsed / t) * 100) : 0;
            return ` ${item.label}: ${item.parsed}曲 (${pct}%)`;
          },
        },
      },
    },
  }, [genrePctPlugin(palette), genreCenterPlugin(total)]);
}

function drawMonthlyChart(monthly) {
  if (!monthly.length) return;
  const labels = monthly.map(m => fmtMonth(m.date).replace(/^\d{4}\//, ''));
  const c = getColors();
  createChart('chart-monthly', 'line', {
    labels,
    datasets: [
      {
        label: '歌唱数',
        data: monthly.map(m => m.songs),
        borderColor: c.primaryStrong,
        backgroundColor: c.primary + '30',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
      {
        label: '歌枠数',
        data: monthly.map(m => m.streams),
        borderColor: c.accent,
        backgroundColor: 'transparent',
        tension: 0.4,
        fill: false,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 1.5,
        borderDash: [4, 3],
        yAxisID: 'y2',
      },
    ],
  }, {
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: { boxWidth: 10, padding: 10, font: { size: 10 } },
      },
    },
    scales: {
      y: { beginAtZero: true },
      // 歌枠数(1桁台)は歌唱数(3桁)と桁が違い左軸では潰れるため右軸に分離
      y2: {
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: { color: c.accentStrong, font: { size: 10 }, precision: 0 },
      },
    },
  });
}

function renderHeatmap(cells) {
  const dow = ['日','月','火','水','木','金','土'];
  const rowsHtml = dow.map(d => `<div>${d}</div>`).join('');
  const cellsHtml = cells.map(c => {
    if (!c.inRange) return `<div class="heatmap-cell" style="visibility:hidden"></div>`;
    const lvl = heatLevel(c.value);
    return `<div class="heatmap-cell ${lvl}" title="${c.iso}: ${c.value}曲"></div>`;
  }).join('');
  return `
    <div class="heatmap-flex">
      <div class="heatmap-row-labels">${rowsHtml}</div>
      <div class="heatmap-wrap"><div class="heatmap">${cellsHtml}</div></div>
    </div>
    <div class="heatmap-legend">
      少なめ
      <div class="scale">
        <div class="heatmap-cell"></div>
        <div class="heatmap-cell l1"></div>
        <div class="heatmap-cell l2"></div>
        <div class="heatmap-cell l3"></div>
        <div class="heatmap-cell l4"></div>
      </div>
      多め
    </div>
  `;
}
