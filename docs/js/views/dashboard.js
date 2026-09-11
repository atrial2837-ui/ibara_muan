import { state } from '../store.js';
import { $, escapeHtml, fmtDate, fmtMonth, daysSince, youtubeThumb } from '../utils.js';
import { periodHits, countStreamsThisMonth, countSongsThisMonth, countNewSongsThisMonth, buildMonthly, buildHeatmap, heatLevel, isoDate } from '../domain-compat.js';
import { getToday } from '../store.js';
import { icon } from '../icons.js';
import { openStreamViewer, playMyListInViewer } from '../player/stream-player.js';
import { getWatchHistory, clearWatchHistory } from '../player/watch-history.js';
import { chartCanvas, createChart, getColors } from '../charts.js';

export function renderDashboard() {
  const { songs, streams } = state.data;
  const sorted = [...songs].sort((a, b) => b.count - a.count);
  const top5 = sorted.slice(0, 5);
  const top5Max = top5[0]?.count || 1;
  const recent = streams.slice(0, 5);
  const today = getToday();
  const newSongs = countNewSongsThisMonth(songs, today);
  const panel = $('#panel-dashboard');
  const heatmap = buildHeatmap(streams, today);
  const monthly = buildMonthly(streams).slice(-12);
  const monthlyMax = Math.max(1, ...monthly.map(m => m.songs));

  const activityHtml = `
    <div class="card dashboard-card dashboard-activity-card">
      <div class="card-title">${icon('analytics')} 今月の活動</div>
      <div class="dashboard-metric-list">
        <div class="activity-row">
          <span class="a-date">配信</span>
          <span class="a-meta">今月の歌枠数</span>
          <strong>${countStreamsThisMonth(streams, today)}回</strong>
        </div>
        <div class="activity-row">
          <span class="a-date">歌唱</span>
          <span class="a-meta">今月の総歌唱数</span>
          <strong>${countSongsThisMonth(streams, today)}曲</strong>
        </div>
        <div class="activity-row">
          <span class="a-date">新曲</span>
          <span class="a-meta">今月の初披露曲数</span>
          <strong>${newSongs}曲</strong>
        </div>
        <div class="activity-row">
          <span class="a-date">最終</span>
          <span class="a-meta">最新歌枠から</span>
          <strong>${streams[0] ? `${daysSince(streams[0].date)}日前` : '—'}</strong>
        </div>
      </div>
    </div>
  `;

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
      <div class="dashboard-overview-grid">
        ${activityHtml}
        ${top5Html}
        <div class="card dashboard-card dashboard-genre-card">
          <div class="card-title">${icon('chart')} ジャンル分布 <span class="pill">楽曲数</span></div>
          ${renderGenreChart(songs)}
        </div>
        <div class="card dashboard-card dashboard-heatmap-card">
          <div class="card-title">${icon('calendar')} 配信ヒートマップ <span class="pill">直近1年</span></div>
          ${renderHeatmap(heatmap)}
        </div>
        <div class="card dashboard-card dashboard-monthly-card">
          <div class="card-title">${icon('music')} 月別 歌唱数 <span class="pill">直近12か月</span></div>
          ${monthly.length ? chartCanvas('chart-monthly', { class: 'short' }) : '<div class="empty-state">月別データなし</div>'}
        </div>
      </div>
      ${renderResumeSection()}
      ${renderRecapCardShell()}
      ${deferredDashboardHtml(streams, songs, recent)}
    </div>
  `;
  bindResumeSection();
  bindRecapCard(streams, songs);
  bindHitsToggle();
  drawMonthlyChart(monthly);

  // ヒートマップは直近1年を横に並べるため、初期表示で最新（右端）へ
  const heatmapWrap = panel.querySelector('.heatmap-wrap');
  if (heatmapWrap) heatmapWrap.scrollLeft = heatmapWrap.scrollWidth;
}

/* ── よく歌われた曲（今月/今年 切替） ──────────────────────────────────── */

function bindHitsToggle() {
  const toggle = $('#dashboard-hits-toggle');
  const card = toggle?.closest('.dashboard-list-card');
  if (!toggle || !card) return;
  toggle.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hits-period]');
    if (!btn) return;
    const period = btn.dataset.hitsPeriod;
    card.querySelectorAll('[data-hits-list]').forEach(list => {
      list.hidden = list.dataset.hitsList !== period;
    });
    toggle.querySelectorAll('[data-hits-period]').forEach(b => {
      const active = b.dataset.hitsPeriod === period;
      b.classList.toggle('primary', active);
      b.classList.toggle('ghost', !active);
    });
  });
}

/* ── まとめカード（年間/月間リキャップ） ────────────────────────────────── */

/** カード外枠 HTML（内容は bindRecapCard で差し込む） */
function renderRecapCardShell() {
  return `
    <div class="card dashboard-card dashboard-recap-card" id="dashboard-recap-card">
      <div class="card-title">
        ${icon('chart')} 茨むあんのまとめ
        <span class="dashboard-recap-toggle" id="dashboard-recap-toggle">
          <button class="btn ghost" type="button" data-recap-period="year" id="recap-btn-year">今年</button>
          <button class="btn ghost" type="button" data-recap-period="month" id="recap-btn-month">今月</button>
        </span>
      </div>
      <div id="dashboard-recap-body"></div>
    </div>
  `;
}

/** 期間 (year | month) に応じてリキャップを集計して HTML を返す */
function computeRecap(streams, songs, period, today) {
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed

  /** stream がその期間に含まれるか */
  function inPeriod(stream) {
    const d = stream.date instanceof Date ? stream.date : new Date(stream.date);
    if (period === 'year') return d.getFullYear() === y;
    return d.getFullYear() === y && d.getMonth() === m;
  }

  const targetStreams = streams.filter(inPeriod);
  if (!targetStreams.length) return null;

  // 配信回数
  const streamCount = targetStreams.length;

  // 総歌唱数
  const totalSongs = targetStreams.reduce((sum, s) => sum + (s.songs?.length || 0), 0);

  // distinct song key
  const distinctKeys = new Set();
  for (const s of targetStreams) {
    for (const song of (s.songs || [])) {
      if (song.key) distinctKeys.add(song.key);
    }
  }
  const distinctCount = distinctKeys.size;

  // 最多歌唱曲（期間内の出現回数でカウント）
  const countMap = new Map();
  for (const s of targetStreams) {
    for (const song of (s.songs || [])) {
      if (!song.key) continue;
      const entry = countMap.get(song.key) || { title: song.title, count: 0 };
      entry.count++;
      countMap.set(song.key, entry);
    }
  }
  let topSong = null;
  let topCount = 0;
  for (const [, entry] of countMap) {
    if (entry.count > topCount) { topCount = entry.count; topSong = entry; }
  }

  // 初披露曲数（song.firstSung がその期間内）
  let newSongCount = 0;
  for (const song of songs) {
    if (!song.firstSung) continue;
    const d = song.firstSung instanceof Date ? song.firstSung : new Date(song.firstSung);
    if (period === 'year' && d.getFullYear() === y) newSongCount++;
    else if (period === 'month' && d.getFullYear() === y && d.getMonth() === m) newSongCount++;
  }

  return { streamCount, totalSongs, distinctCount, topSong, topCount, newSongCount };
}

function recapBodyHtml(recap, periodLabel, periodShort) {
  if (!recap) {
    return `<div class="empty-state">この期間の記録はまだありません</div>`;
  }
  const topSongHtml = recap.topSong
    ? `${escapeHtml(recap.topSong.title)} <span class="recap-sub">(${recap.topCount}回)</span>`
    : '—';
  return `
    <div class="recap-period-label">${escapeHtml(periodLabel)}</div>
    <div class="recap-tiles">
      <div class="recap-tile">
        <strong>${recap.streamCount}</strong>
        <span>${escapeHtml(periodShort)}の歌枠数</span>
      </div>
      <div class="recap-tile">
        <strong>${recap.totalSongs}</strong>
        <span>${escapeHtml(periodShort)}の歌唱数</span>
      </div>
      <div class="recap-tile">
        <strong>${recap.distinctCount}</strong>
        <span>歌った曲の種類</span>
      </div>
      <div class="recap-tile">
        <strong>${recap.newSongCount}</strong>
        <span>${escapeHtml(periodShort)}の初披露曲</span>
      </div>
    </div>
    <div class="recap-top-song">
      ${icon('rank')} 最多歌唱: ${topSongHtml}
    </div>
  `;
}

function bindRecapCard(streams, songs) {
  const body = $('#dashboard-recap-body');
  const yearBtn = $('#recap-btn-year');
  const monthBtn = $('#recap-btn-month');
  if (!body) return;

  const today = getToday();
  let currentPeriod = 'year';

  function render(period) {
    currentPeriod = period;
    const y = today.getFullYear();
    const m = today.getMonth();
    const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const label = period === 'year' ? `${y}年` : `${y}年 ${monthNames[m]}`;
    const recap = computeRecap(streams, songs, period, today);
    body.innerHTML = recapBodyHtml(recap, label, period === 'year' ? '今年' : '今月');
    // ボタンの active 切替
    yearBtn?.classList.toggle('primary', period === 'year');
    yearBtn?.classList.toggle('ghost', period !== 'year');
    monthBtn?.classList.toggle('primary', period === 'month');
    monthBtn?.classList.toggle('ghost', period !== 'month');
  }

  // 初期描画
  render('year');

  // トグルボタン
  const toggle = $('#dashboard-recap-toggle');
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-recap-period]');
      if (!btn) return;
      render(btn.dataset.recapPeriod);
    });
  }
}

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

function deferredDashboardHtml(streams, songs, recent) {
  const stalePicks = songs.filter(s => s.daysSinceLast >= 180).sort((a, b) => b.count - a.count).slice(0, 5);
  const recentPicks = songs.filter(s => s.daysSinceLast != null && s.daysSinceLast <= 30).sort((a, b) => b.count - a.count).slice(0, 5);
  const monthlyHits = periodHits(streams, 'month', getToday());
  const yearlyHits = periodHits(streams, 'year', getToday());
  return `
    <div class="card dashboard-card dashboard-list-card dashboard-list-hits">
      <div class="card-title">${icon('rank')} よく歌われた曲
        <span class="dashboard-recap-toggle" id="dashboard-hits-toggle">
          <button class="btn primary" type="button" data-hits-period="month">今月</button>
          <button class="btn ghost" type="button" data-hits-period="year">今年</button>
        </span>
      </div>
      <div class="bar-list" data-hits-list="month">
        ${monthlyHits.length ? monthlyHits.slice(0, 5).map((s, i) => topBarRow(s, i, monthlyHits[0].count)).join('') : '<div class="empty-state">今月の歌唱履歴なし</div>'}
      </div>
      <div class="bar-list" data-hits-list="year" hidden>
        ${yearlyHits.length ? yearlyHits.slice(0, 5).map((s, i) => topBarRow(s, i, yearlyHits[0].count)).join('') : '<div class="empty-state">今年の歌唱履歴なし</div>'}
      </div>
    </div>

    <div class="card dashboard-card dashboard-list-card dashboard-list-stale">
      <div class="card-title">${icon('time')} 久しぶりの曲 <span class="pill">180日以上歌唱なし</span></div>
      <div class="bar-list">
        ${stalePicks.length ? stalePicks.map((s, i) => topBarRow(s, i, stalePicks[0].count)).join('') : '<div class="empty-state">該当なし</div>'}
      </div>
    </div>

    <div class="card dashboard-card dashboard-list-card dashboard-list-recent">
      <div class="card-title">${icon('sparkle')} 最近歌った定番 <span class="pill">30日以内</span></div>
      <div class="bar-list">
        ${recentPicks.length ? recentPicks.map((s, i) => topBarRow(s, i, recentPicks[0].count)).join('') : '<div class="empty-state">該当なし</div>'}
      </div>
    </div>

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

function renderGenreChart(songs) {
  const genreCounts = new Map();
  for (const s of songs) {
    const genre = s.genre || s.genreText || '未分類';
    if (!genre || genre === '未分類') continue;
    genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  }
  const rows = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  if (!rows.length) return '<div class="empty-state">ジャンルデータなし</div>';
  const totalSongs = songs.length || 0;
  const unclassified = Math.max(0, totalSongs - total);
  const topGenre = rows[0];
  const topShare = totalSongs ? Math.round((topGenre[1] / totalSongs) * 100) : 0;
  return `
    <div class="genre-meter" aria-label="ジャンル分布">
      <div class="genre-meter-track">
        ${rows.map(([genre, count], index) => `
          <span class="genre-meter-segment g${index % 8}" style="width:${Math.max(3, (count / total) * 100)}%" title="${escapeHtml(genre)}: ${count}曲"></span>
        `).join('')}
      </div>
      <div class="genre-breakdown">
        ${rows.slice(0, 8).map(([genre, count], index) => `
          <div class="genre-row">
            <span class="genre-dot g${index % 8}"></span>
            <span class="genre-name">${escapeHtml(genre)}</span>
            <strong>${count}</strong>
          </div>
        `).join('')}
      </div>
      <div class="genre-insights" aria-label="ジャンル集計">
        <div class="genre-insight">
          <span>分類済み</span>
          <strong>${total}<small>曲</small></strong>
        </div>
        <div class="genre-insight">
          <span>未分類</span>
          <strong>${unclassified}<small>曲</small></strong>
        </div>
        <div class="genre-insight">
          <span>ジャンル数</span>
          <strong>${rows.length}<small>種</small></strong>
        </div>
        <div class="genre-insight">
          <span>${escapeHtml(topGenre[0])}</span>
          <strong>${topShare}<small>%</small></strong>
        </div>
      </div>
    </div>
  `;
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
