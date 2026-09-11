import { initTheme } from './theme.js';
import { $, fmtDate, formatNumber } from './utils.js';
import { loadAll } from './data.js';
import { CHANNELS, DEFAULT_CHANNEL } from './config.js';
import { state } from './store.js';
import { collectDatasetIssues, GENRE_LIST } from './domain-compat.js';
import {
  parseSetlistText,
  serializeSetlistRows,
  moveSetlistRow,
  removeSetlistRow,
  insertSetlistRow,
  updateSetlistRow,
} from './admin/setlist-rows.js';
import {
  COMMENT_TEMPLATES,
  DEFAULT_META_ROWS,
  formatSeconds,
  parseTimeInput,
  createMarks,
  setMark,
  nextUnmarkedIndex,
  endTargetIndex,
  findMarkIssues,
  nextAnchor,
  prevAnchor,
  nextJumpTarget,
  coverageState,
  streamOptionLabel,
  buildCommentText,
  buildSavePayload,
  marksFromItems,
} from './admin/timestamp-marker.js';
import { matchSetlist, findInversions } from './admin/timestamp-matcher.js';
import {
  defaultMusicVideoId,
  filterMusicVideos,
  nextAvailableId,
  validateMusicVideo,
} from './admin/music-video-form.js';
import {
  issueKey,
  partitionIssues,
  pruneIgnored,
  summarizeIssues,
  toggleIgnored,
} from './admin/issue-review.js';

initTheme();

const adminToken = $('#admin-token');
if (adminToken) {
  adminToken.value = localStorage.getItem('adminToken') || '';
  adminToken.addEventListener('input', () => localStorage.setItem('adminToken', adminToken.value));
}

function parseDate(value) {
  if (!value) return null;
  const text = String(value).replaceAll('/', '-');
  const m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const date = new Date(+m[1], +m[2] - 1, +m[3]);
  date.setHours(0, 0, 0, 0);
  return date;
}

function setBadge(ok, text) {
  const badge = $('#api-badge');
  badge.textContent = text;
  badge.classList.toggle('accent', ok);
}

function stat(label, value, unit = '') {
  return `
    <div class="stat-card">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}<span class="stat-unit">${unit}</span></div>
    </div>
  `;
}

function statusRow(label, value, tone = '') {
  return `<div class="admin-status-row ${tone}"><span>${label}</span><strong>${value}</strong></div>`;
}


function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

async function adminApi(path, body) {
  const res = await fetch(`/api/admin/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      'x-admin-token': adminToken?.value || '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function streamFormData() {
  return {
    channelCode: $('#channel').value,
    streamedOn: $('#streamed-on').value,
    sourceIndex: $('#source-index').value,
    title: $('#stream-title').value,
    url: $('#stream-url').value,
    songsText: $('#songs-text').value,
  };
}

function renderPreview(rows) {
  $('#preview-box').innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>#</th><th>曲</th><th>歌手</th><th>キー</th><th>ジャンル</th><th>判定</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${row.position}</td>
              <td>${escapeHtml(row.title)}</td>
              <td>${escapeHtml(row.artist || '')}</td>
              <td>${escapeHtml(row.displayKey || '')}</td>
              <td>${escapeHtml(row.genre || '')}</td>
              <td>${escapeHtml(row.match)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

const KEY_PRESETS = ['原キー', '-9', '-8', '-7', '-6', '-5', '-4', '-3', '-2', '-1', '+1', '+2', '+3', '+4', '+5', '+6', '+7', '+8', '+9'];

function renderKeyPicker(displayKey) {
  const keys = String(displayKey || '').split(',').map(k => k.trim()).filter(Boolean);
  const chips = keys.map(k => `
    <span class="key-chip">
      ${escapeHtml(k)}<button type="button" class="key-chip-remove" data-remove-key="${escapeHtml(k)}" aria-label="${escapeHtml(k)}を削除">×</button>
    </span>
  `).join('');
  const menuItems = KEY_PRESETS.map(k => `
    <button type="button" data-add-key="${escapeHtml(k)}" class="${keys.includes(k) ? 'is-selected' : ''}">${escapeHtml(k)}</button>
  `).join('');
  return `
    <div class="key-picker">
      <input type="hidden" data-field="displayKey" value="${escapeHtml(keys.join(','))}">
      ${chips}
      <button type="button" class="key-add-btn" data-key-add-btn>＋ キー</button>
      <div class="key-add-menu">${menuItems}</div>
    </div>
  `;
}

function renderSongMeta(rows) {
  $('#song-meta-box').innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>曲</th><th>歌手</th><th>キー</th><th>ジャンル</th><th></th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr data-song-id="${row.id}">
              <td><input class="admin-compact-input" data-field="title" value="${escapeHtml(row.title || '')}"></td>
              <td><input class="admin-compact-input" data-field="artist" value="${escapeHtml(row.artist || '')}"></td>
              <td>${renderKeyPicker(row.display_key || '')}</td>
              <td><input class="admin-compact-input" data-field="genre" value="${escapeHtml(row.genre || '')}"></td>
              <td><button class="btn ghost" type="button" data-save-meta>保存</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderSync(data, elapsed) {
  const stats = data.combined?.stats || {};
  const update = parseDate(stats.updateDate);
  const now = new Date();
  const ageDays = update ? Math.floor((now - update) / 86400000) : null;
  const newestStream = parseDate(stats.newestStream || stats.updateDate);
  const rows = [
    statusRow('API応答', `${formatNumber(elapsed)}ms`, elapsed < 3000 ? 'ok' : 'warn'),
    statusRow('スプシ更新日', fmtDate(update), ageDays != null && ageDays <= 3 ? 'ok' : 'warn'),
    statusRow('更新から', ageDays == null ? '—' : `${ageDays}日`, ageDays != null && ageDays <= 3 ? 'ok' : 'warn'),
    statusRow('最新歌枠日', fmtDate(newestStream), 'ok'),
  ];
  $('#sync-status').innerHTML = rows.join('');
  const ok = elapsed < 3000 && (ageDays == null || ageDays <= 3);
  $('#sync-badge').textContent = ok ? '良好' : '要確認';
  $('#sync-badge').classList.toggle('accent', ok);
}

/* ─── 確認が必要な項目 ────────────────────────────────────────────────────── */

const IGNORED_ISSUES_KEY = 'adminIgnoredIssues';

/** 直近の指摘。確認済みを付け外ししたときに再描画するため持っておく */
let _qualityIssues = [];

function _loadIgnoredIssues() {
  try {
    const raw = JSON.parse(localStorage.getItem(IGNORED_ISSUES_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((k) => typeof k === 'string') : [];
  } catch (_) {
    return [];
  }
}

function _saveIgnoredIssues(keys) {
  try { localStorage.setItem(IGNORED_ISSUES_KEY, JSON.stringify(keys)); } catch (_) { /* 保存できなくても表示は続ける */ }
}

function _issueRowHtml(issue, isIgnored) {
  const key = issueKey(issue);
  return `
    <tr${isIgnored ? ' class="is-ignored"' : ''}>
      <td>${escapeHtml(issue.type)}</td>
      <td>${escapeHtml(issue.place)}</td>
      <td>${escapeHtml(issue.detail)}</td>
      <td><button class="btn ghost issue-ack" type="button" data-issue-key="${escapeHtml(key)}">${isIgnored ? '戻す' : '確認済み'}</button></td>
    </tr>`;
}

function renderQuality(data) {
  if (data) _qualityIssues = collectDatasetIssues(data);
  const issues = _qualityIssues;

  // 直った指摘の鍵は捨てる。残すと、同じ内容が再発したときに黙って隠れてしまう
  const ignoredKeys = pruneIgnored(_loadIgnoredIssues(), issues);
  _saveIgnoredIssues(ignoredKeys);

  const { active, ignored } = partitionIssues(issues, ignoredKeys);
  const summary = summarizeIssues(active);
  const severe = active.filter(issue => ['履歴未確認', '曲数不一致'].includes(issue.type)).length;

  $('#quality-summary').innerHTML = [
    statusRow('履歴未確認', formatNumber(summary['履歴未確認'] || 0), (summary['履歴未確認'] || 0) ? 'warn' : 'ok'),
    statusRow('曲数不一致', formatNumber(summary['曲数不一致'] || 0), (summary['曲数不一致'] || 0) ? 'warn' : 'ok'),
    statusRow('ジャンル未分類', formatNumber(summary['ジャンル未分類'] || 0), (summary['ジャンル未分類'] || 0) ? 'warn' : 'ok'),
    statusRow('同一枠内重複', formatNumber(summary['同一枠内重複'] || 0), 'ok'),
  ].join('');
  $('#quality-badge').textContent = severe ? '要確認' : '良好';
  $('#quality-badge').classList.toggle('accent', !severe);
  $('#issue-count').textContent = `${active.length}件`;

  const countEl = $('#issue-ignored-count');
  if (countEl) countEl.textContent = ignored.length ? `確認済み ${ignored.length}件` : '';

  const showIgnored = !!$('#issue-show-ignored')?.checked;
  const rows = [
    ...active.slice(0, 100).map((issue) => _issueRowHtml(issue, false)),
    ...(showIgnored ? ignored.map((issue) => _issueRowHtml(issue, true)) : []),
  ];
  $('#quality-rows').innerHTML = rows.join('')
    || `<tr><td colspan="4">${ignored.length ? 'すべて確認済みです' : '大きな問題は見つかりませんでした'}</td></tr>`;
}

function initQualityReview() {
  $('#quality-rows')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-issue-key]');
    if (!btn) return;
    _saveIgnoredIssues(toggleIgnored(_loadIgnoredIssues(), btn.dataset.issueKey));
    renderQuality(null);
  });

  $('#issue-show-ignored')?.addEventListener('change', () => renderQuality(null));

  $('#issue-reset-btn')?.addEventListener('click', () => {
    if (!_loadIgnoredIssues().length) return;
    if (!confirm('確認済みをすべて戻します。よろしいですか？')) return;
    _saveIgnoredIssues([]);
    renderQuality(null);
  });
}

function loadChannels() {
  const channelSelect = $('#channel');
  const channels = Object.values(CHANNELS);
  channelSelect.innerHTML = channels.map((channel) => (
    `<option value="${escapeHtml(channel.id)}">${escapeHtml(channel.label)}</option>`
  )).join('');
  channelSelect.value = CHANNELS[DEFAULT_CHANNEL] ? DEFAULT_CHANNEL : channels[0]?.id || '';
}

async function loadStatus() {
  setBadge(false, '確認中');
  $('#api-detail').textContent = '公開用の静的データを読み込んでいます。';
  $('#channel-rows').innerHTML = '<tr><td colspan="5">読み込み中</td></tr>';
  $('#sync-status').innerHTML = '<div class="admin-note">確認中</div>';
  $('#quality-summary').innerHTML = '<div class="admin-note">確認中</div>';
  $('#quality-rows').innerHTML = '<tr><td colspan="3">読み込み中</td></tr>';

  const started = performance.now();
  try {
    const data = await loadAll();
    const elapsed = Math.round(performance.now() - started);
    const combined = data.combined || {};
    const stats = combined.stats || {};

    setBadge(true, '正常');
    $('#api-stats').innerHTML = [
      stat('曲数', formatNumber(stats.repertoire), '曲'),
      stat('歌枠', formatNumber(stats.streams), '枠'),
      stat('応答', formatNumber(elapsed), 'ms'),
    ].join('');
    $('#api-detail').textContent = `最新データ: ${fmtDate(parseDate(stats.updateDate))} / 公開サイトと同じ静的JSONを確認しています。`;
    renderSync(data, elapsed);
    renderQuality(data);

    const channels = Object.values(data.channels || {});
    $('#channel-rows').innerHTML = channels.map((channel) => {
      const s = channel.stats || {};
      return `
        <tr>
          <td>${s.channelLabel || s.channelId || '-'}</td>
          <td>${formatNumber(s.repertoire)}</td>
          <td>${formatNumber(s.streams)}</td>
          <td>${formatNumber(s.total)}</td>
          <td>${fmtDate(parseDate(s.updateDate))}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="5">チャンネルデータがありません</td></tr>';
  } catch (error) {
    setBadge(false, 'エラー');
    $('#api-stats').innerHTML = [
      stat('曲数', '-'),
      stat('歌枠', '-'),
      stat('応答', '-'),
    ].join('');
    $('#api-detail').textContent = `API確認に失敗しました: ${error.message || String(error)}`;
    $('#channel-rows').innerHTML = '<tr><td colspan="5">取得できませんでした</td></tr>';
    $('#sync-status').innerHTML = '<div class="admin-note">取得できませんでした</div>';
    $('#quality-summary').innerHTML = '<div class="admin-note">取得できませんでした</div>';
    $('#quality-rows').innerHTML = '<tr><td colspan="3">取得できませんでした</td></tr>';
  }
}

function initManagement() {
  const streamedOn = $('#streamed-on');
  if (streamedOn && !streamedOn.value) streamedOn.valueAsDate = new Date();
  loadChannels();

  $('#preview-stream')?.addEventListener('click', async () => {
    $('#stream-status').textContent = 'プレビュー中...';
    try {
      const data = await adminApi('preview-stream', streamFormData());
      renderPreview(data.songs);
      $('#stream-status').textContent = `${data.songs.length}曲を確認しました。`;
    } catch (error) {
      $('#stream-status').textContent = error.message || String(error);
    }
  });

  $('#submit-stream')?.addEventListener('click', async () => {
    if (!confirm('この歌枠をD1に登録します。よろしいですか？')) return;
    $('#stream-status').textContent = '登録中...';
    try {
      const data = await adminApi('streams', streamFormData());
      $('#stream-status').textContent = `登録しました: stream_id=${data.streamId}, ${data.songCount}曲。必要なら静的データ生成を開始してください。`;
      $('#preview-box').innerHTML = '';
      loadStatus();
    } catch (error) {
      $('#stream-status').textContent = error.message || String(error);
    }
  });

  $('#search-songs')?.addEventListener('click', async () => {
    $('#meta-status').textContent = '検索中...';
    try {
      const data = await adminApi(`songs/search?q=${encodeURIComponent($('#song-query').value)}`);
      renderSongMeta(data.songs);
      $('#meta-status').textContent = `${data.songs.length}件`;
    } catch (error) {
      $('#meta-status').textContent = error.message || String(error);
    }
  });

  $('#song-meta-box')?.addEventListener('click', async (event) => {
    // ── キーピッカー: ＋キーボタン → ドロップダウン開閉 ──────────────────
    const addBtn = event.target.closest('[data-key-add-btn]');
    if (addBtn) {
      const menu = addBtn.nextElementSibling;
      const isOpen = menu.classList.contains('is-open');
      document.querySelectorAll('.key-add-menu').forEach(m => m.classList.remove('is-open'));
      if (!isOpen) {
        const rect = addBtn.getBoundingClientRect();
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.left = rect.left + 'px';
        menu.classList.add('is-open');
      }
      return;
    }

    // ── キーピッカー: プリセットキーをトグル ────────────────────────────
    const addKeyBtn = event.target.closest('[data-add-key]');
    if (addKeyBtn) {
      const picker = addKeyBtn.closest('.key-picker');
      const hiddenInput = picker.querySelector('[data-field="displayKey"]');
      const key = addKeyBtn.dataset.addKey;
      let keys = hiddenInput.value.split(',').map(k => k.trim()).filter(Boolean);
      if (keys.includes(key)) {
        keys = keys.filter(k => k !== key);
        addKeyBtn.classList.remove('is-selected');
      } else {
        keys.push(key);
        addKeyBtn.classList.add('is-selected');
      }
      hiddenInput.value = keys.join(',');
      // チップを再描画
      picker.querySelectorAll('.key-chip').forEach(c => c.remove());
      keys.forEach(k => {
        const chip = document.createElement('span');
        chip.className = 'key-chip';
        chip.innerHTML = `${escapeHtml(k)}<button type="button" class="key-chip-remove" data-remove-key="${escapeHtml(k)}" aria-label="${escapeHtml(k)}を削除">×</button>`;
        picker.insertBefore(chip, picker.querySelector('[data-key-add-btn]'));
      });
      return;
    }

    // ── キーピッカー: チップのxで削除 ───────────────────────────────────
    const removeBtn = event.target.closest('[data-remove-key]');
    if (removeBtn) {
      const picker = removeBtn.closest('.key-picker');
      const hiddenInput = picker.querySelector('[data-field="displayKey"]');
      const key = removeBtn.dataset.removeKey;
      let keys = hiddenInput.value.split(',').map(k => k.trim()).filter(Boolean);
      keys = keys.filter(k => k !== key);
      hiddenInput.value = keys.join(',');
      removeBtn.closest('.key-chip').remove();
      // メニューの selected 状態を更新
      picker.querySelectorAll(`[data-add-key="${CSS.escape(key)}"]`).forEach(b => b.classList.remove('is-selected'));
      return;
    }

    // ── 保存ボタン ────────────────────────────────────────────────────────
    const button = event.target.closest('[data-save-meta]');
    if (!button) return;
    const row = button.closest('[data-song-id]');
    $('#meta-status').textContent = '保存中...';
    try {
      await adminApi('songs/metadata', {
        songId: row.dataset.songId,
        title: row.querySelector('[data-field="title"]').value,
        artist: row.querySelector('[data-field="artist"]').value,
        displayKey: row.querySelector('[data-field="displayKey"]').value,
        genre: row.querySelector('[data-field="genre"]').value,
      });
      $('#meta-status').textContent = '保存しました。必要なら静的データ生成を開始してください。';
    } catch (error) {
      $('#meta-status').textContent = error.message || String(error);
    }
  });

  // ドロップダウン外クリックで閉じる
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.key-picker')) {
      document.querySelectorAll('.key-add-menu').forEach(m => m.classList.remove('is-open'));
    }
  });

  $('#sync-keys')?.addEventListener('click', async () => {
    if (!confirm('SpreadsheetからD1のキー/ジャンルを同期します。よろしいですか？')) return;
    $('#meta-status').textContent = '同期中...';
    try {
      const data = await adminApi('key-reference/sync-url', { url: $('#key-sheet-url').value });
      $('#meta-status').textContent = `同期しました: updated=${data.updated}, skipped=${data.skipped}\ncolumns=${JSON.stringify(data.detectedColumns)}`;
    } catch (error) {
      $('#meta-status').textContent = error.message || String(error);
    }
  });

  $('#sync-key-csv')?.addEventListener('click', async () => {
    const file = $('#key-csv-file').files[0];
    if (!file) {
      $('#meta-status').textContent = 'CSVファイルを選んでください';
      return;
    }
    if (!confirm('CSVからD1のキー/ジャンルを同期します。よろしいですか？')) return;
    $('#meta-status').textContent = 'CSV同期中...';
    try {
      const data = await adminApi('key-reference/import-csv', { csvText: await file.text() });
      $('#meta-status').textContent = `同期しました: updated=${data.updated}, skipped=${data.skipped}\ncolumns=${JSON.stringify(data.detectedColumns)}`;
    } catch (error) {
      $('#meta-status').textContent = error.message || String(error);
    }
  });

  $('#generate-static-data')?.addEventListener('click', async () => {
    if (!confirm('GitHub Actionsで静的データ生成を開始します。よろしいですか？')) return;
    $('#static-status').textContent = 'GitHub Actionsを起動中...';
    try {
      const data = await adminApi('static-data/generate', {});
      $('#static-status').textContent = `起動しました: ${data.owner}/${data.repo} / ${data.workflow}\nGitHub Actions完了後、Pagesへ自動反映されます。`;
    } catch (error) {
      $('#static-status').textContent = error.message || String(error);
    }
  });

  $('#trigger-auto-update')?.addEventListener('click', async () => {
    const mode = $('#auto-update-mode')?.value || 'scan-only';
    const minTimestamps = Number($('#auto-update-min')?.value) || 8;
    const label = mode === 'full' ? '自動適用あり' : '試運転(D1に触れない)';
    if (!confirm(`YouTube自動更新を開始します(${label})。よろしいですか？`)) return;
    $('#auto-update-status').textContent = 'GitHub Actionsを起動中...';
    try {
      const data = await adminApi('auto-update/trigger', { mode, min_timestamps: minTimestamps });
      $('#auto-update-status').textContent = `起動しました: ${data.owner}/${data.repo} / ${data.workflow} (mode=${data.mode})\nGitHub Actions完了後、結果はIssueとArtifactsで確認できます。`;
    } catch (error) {
      $('#auto-update-status').textContent = error.message || String(error);
    }
  });
}

/* ── コミュニティタイムスタンプ審査 ──────────────────────────────────────── */

let _tsFilter  = 'pending';
let _tsData    = null; // loadAll() の結果キャッシュ（配信・曲名参照用）
let _tsItems   = [];
let _tsBusy    = false;

function fmtSeconds(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function resolveTs(item) {
  const ch     = _tsData?.channels?.[item.channelCode];
  const stream = ch?.streams?.find(s => Number(s.index) === Number(item.streamIndex));
  const song   = stream?.songs?.[item.songIndex];
  return {
    streamTitle: stream?.title || `第${item.streamIndex}枠`,
    songTitle:   song ? `${song.title} / ${song.artist || ''}` : `曲${item.songIndex + 1}`,
    date:        stream?.date || '',
  };
}

function renderTimestamps(items) {
  const wrap = $('#ts-table-wrap');
  _tsItems = Array.isArray(items) ? items : [];
  $('#ts-count').textContent = `${items.length}件`;
  const approveAllBtn = $('#ts-approve-all');
  if (approveAllBtn) {
    approveAllBtn.hidden = _tsFilter !== 'pending';
    approveAllBtn.disabled = _tsBusy || _tsFilter !== 'pending' || !_tsItems.length;
    approveAllBtn.textContent = _tsItems.length ? `表示中${_tsItems.length}件を一括承認` : '表示中を一括承認';
  }
  if (!items.length) {
    wrap.innerHTML = '<p class="admin-note">該当する申請はありません</p>';
    return;
  }
  wrap.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>ch</th><th>配信</th><th>曲</th><th>時間</th><th>コメント</th><th>申請日</th>
          ${_tsFilter === 'pending' ? '<th>操作</th>' : '<th>審査日</th>'}
        </tr>
      </thead>
      <tbody>
        ${items.map(item => {
          const { streamTitle, songTitle, date } = resolveTs(item);
          const chLabel = item.channelCode === 'main' ? '茨むあん' : (item.channelCode || '—');
          const createdAt  = item.createdAt  ? fmtDate(new Date(item.createdAt))  : '—';
          const reviewedAt = item.reviewedAt ? fmtDate(new Date(item.reviewedAt)) : '—';
          const actionCell = _tsFilter === 'pending'
            ? `<td>
                <button class="btn ghost" data-ts-approve="${item.id}" type="button" style="margin-right:4px">承認</button>
                <button class="btn ghost" data-ts-reject="${item.id}"  type="button">却下</button>
               </td>`
            : `<td>${reviewedAt}</td>`;
          return `
            <tr>
              <td>${chLabel}</td>
              <td title="${escapeHtml(streamTitle)}">${escapeHtml(streamTitle.length > 20 ? streamTitle.slice(0, 20) + '…' : streamTitle)}<br><small>${escapeHtml(date)}</small></td>
              <td>${escapeHtml(songTitle)}</td>
              <td><strong>${fmtSeconds(item.timeSeconds)}</strong></td>
              <td>${escapeHtml(item.submitterNote || '—')}</td>
              <td>${createdAt}</td>
              ${actionCell}
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

async function loadTimestamps() {
  $('#ts-status').textContent = '読み込み中…';
  $('#ts-table-wrap').innerHTML = '<p class="admin-note">読み込み中…</p>';
  const approveAllBtn = $('#ts-approve-all');
  if (approveAllBtn) approveAllBtn.disabled = true;
  try {
    const data = await adminApi(`timestamps?status=${_tsFilter}&limit=100`);
    $('#ts-status').textContent = '';
    renderTimestamps(data.items || []);
  } catch (err) {
    $('#ts-status').textContent = `エラー: ${err.message || err}`;
    $('#ts-table-wrap').innerHTML = '';
  }
}

async function initTimestamps() {
  // 配信・曲名参照用にデータをキャッシュ
  try { _tsData = await loadAll(); } catch (_) {}

  document.querySelectorAll('.ts-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (_tsBusy) return;
      document.querySelectorAll('.ts-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _tsFilter = btn.dataset.tsFilter;
      loadTimestamps();
    });
  });

  $('#ts-approve-all')?.addEventListener('click', async () => {
    const pending = _tsFilter === 'pending' ? _tsItems.slice() : [];
    if (!pending.length || _tsBusy) return;
    if (!confirm(`表示中の${pending.length}件をすべて承認しますか？`)) return;

    _tsBusy = true;
    const approveAllBtn = $('#ts-approve-all');
    const rowButtons = $('#ts-table-wrap')?.querySelectorAll('button');
    if (approveAllBtn) {
      approveAllBtn.disabled = true;
      approveAllBtn.textContent = '一括承認中…';
    }
    rowButtons?.forEach(btn => { btn.disabled = true; });

    let succeeded = 0;
    const failed = [];
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      $('#ts-status').textContent = `一括承認中… ${i + 1}/${pending.length}`;
      try {
        await adminApi(`timestamps/${item.id}/approve`, {});
        succeeded++;
      } catch (err) {
        failed.push({ item, error: err });
      }
    }

    _tsBusy = false;
    if (failed.length) {
      $('#ts-status').textContent = `${succeeded}件を承認しました。${failed.length}件は失敗しました。`;
    } else {
      $('#ts-status').textContent = `${succeeded}件を一括承認しました`;
    }
    loadTimestamps();
  });

  $('#ts-table-wrap').addEventListener('click', async (e) => {
    if (_tsBusy) return;
    const approveBtn = e.target.closest('[data-ts-approve]');
    const rejectBtn  = e.target.closest('[data-ts-reject]');
    if (!approveBtn && !rejectBtn) return;

    const id     = approveBtn ? approveBtn.dataset.tsApprove : rejectBtn.dataset.tsReject;
    const action = approveBtn ? 'approve' : 'reject';
    const label  = approveBtn ? '承認' : '却下';

    if (!confirm(`この申請を${label}しますか？`)) return;
    $('#ts-status').textContent = `${label}中…`;
    try {
      await adminApi(`timestamps/${id}/${action}`, {});
      $('#ts-status').textContent = `${label}しました`;
      loadTimestamps();
    } catch (err) {
      $('#ts-status').textContent = `エラー: ${err.message || err}`;
    }
  });

  loadTimestamps();
}

/* ─── 音楽動画管理 ───────────────────────────────────────────────────────── */

let _mvVideos = [];

function _youtubeThumb(url) {
  try {
    const id = new URL(url).searchParams.get('v') || new URL(url).pathname.split('/').pop();
    return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '';
  } catch (_) { return ''; }
}

const MV_TYPE_LABEL = { original: 'オリ曲', office: 'Re:AcT', character: 'キャラ', cover: 'カバー' };

/**
 * 一覧を1行ずつのコンパクトな表示にする。
 *
 * 48件を80pxサムネ付きの表で出すとパネルが縦に伸びて、
 * 上の入力欄に戻るだけでも延々スクロールすることになっていた。
 * 既定はサムネ無しの1行表示にして、高さも頭打ちにする。
 */
function _renderMvList() {
  const wrap = $('#mv-list-wrap');
  const badge = $('#mv-count');
  if (!wrap) return;
  if (badge) badge.textContent = _mvVideos.length;

  if (!_mvVideos.length) {
    wrap.innerHTML = '<p class="admin-note">動画が登録されていません</p>';
    return;
  }

  const showThumbs = !!$('#mv-show-thumbs')?.checked;
  const shown = filterMusicVideos(_mvVideos, {
    query: $('#mv-search')?.value || '',
    type: $('#mv-filter-type')?.value || '',
  });

  if (!shown.length) {
    wrap.innerHTML = `<p class="admin-note">条件に合う動画がありません（全${_mvVideos.length}件）。</p>`;
    return;
  }

  wrap.innerHTML = `
    <ul class="mv-list${showThumbs ? ' has-thumbs' : ''}">
      ${shown.map((v) => {
        const i = _mvVideos.indexOf(v);
        const extra = v.type === 'cover' ? v.originalArtist : v.type === 'character' ? v.character : '';
        return `
        <li class="mv-row">
          ${showThumbs && v.url ? `<img class="mv-thumb" src="${_youtubeThumb(v.url)}" width="64" height="36" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
          <span class="mv-type" data-mv-type="${escapeHtml(v.type || '')}">${escapeHtml(MV_TYPE_LABEL[v.type] || v.type || '—')}</span>
          <span class="mv-title" title="${escapeHtml(v.id || '')}">${escapeHtml(v.title || '—')}${extra ? ` <small>／ ${escapeHtml(extra)}</small>` : ''}</span>
          <span class="mv-date">${escapeHtml(v.publishedAt || '')}</span>
          <button class="btn ghost mv-del" data-mv-del="${i}" type="button">削除</button>
        </li>`;
      }).join('')}
    </ul>
    <p class="admin-note">${shown.length === _mvVideos.length ? `${_mvVideos.length}件` : `${shown.length} / ${_mvVideos.length}件を表示中`}</p>`;

  wrap.querySelectorAll('[data-mv-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.mvDel);
      if (!confirm(`「${_mvVideos[idx]?.title}」を削除しますか？`)) return;
      _mvVideos.splice(idx, 1);
      _saveMvData();
    });
  });
}

function _saveMvData() {
  // サーバーサイドAPIなし: JSONをダウンロードしてリポジトリにコミットする
  const json = JSON.stringify({ videos: _mvVideos }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'music.json'; a.click();
  URL.revokeObjectURL(url);
  const status = $('#mv-status');
  if (status) status.textContent = 'music.json をダウンロードしました。docs/data/ に上書きしてコミットしてください。';
  _renderMvList();
}

/** 入力欄の現在値を1件ぶんの形にまとめる */
function _mvFormEntry() {
  const type = $('#mv-type')?.value || 'original';
  return {
    url: $('#mv-url')?.value.trim() || '',
    title: $('#mv-title')?.value.trim() || '',
    type,
    originalArtist: $('#mv-artist')?.value.trim() || null,
    character: $('#mv-character')?.value.trim() || null,
    publishedAt: $('#mv-date')?.value || null,
    id: $('#mv-id')?.value.trim() || '',
  };
}

function _mvClearIssues() {
  const box = $('#mv-issues');
  if (!box) return;
  box.hidden = true;
  box.innerHTML = '';
}

/**
 * 検査結果を出す。errors は直さないと進めない。
 * warnings は中身を見せたうえで「このまま追加」で押し切れるようにする。
 */
function _mvShowIssues({ errors, warnings }, onForce) {
  const box = $('#mv-issues');
  if (!box) return;
  box.hidden = false;
  box.innerHTML = `
    <div class="mv-issue-box${errors.length ? ' is-error' : ' is-warn'}">
      <ul>
        ${errors.map((m) => `<li class="is-error">${escapeHtml(m)}</li>`).join('')}
        ${warnings.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}
      </ul>
      ${errors.length ? '' : '<div class="admin-actions"><button class="btn primary" id="mv-force-add" type="button">このまま追加する</button><button class="btn ghost" id="mv-cancel-add" type="button">やめる</button></div>'}
    </div>`;
  if (!errors.length) {
    $('#mv-force-add')?.addEventListener('click', () => { _mvClearIssues(); onForce(); });
    $('#mv-cancel-add')?.addEventListener('click', _mvClearIssues);
  }
}

function _mvAppend(entry) {
  const id = nextAvailableId(entry.id || defaultMusicVideoId(entry.url), _mvVideos);
  _mvVideos.push({
    id,
    title: entry.title,
    type: entry.type,
    ...(entry.type === 'cover' ? { originalArtist: entry.originalArtist } : {}),
    ...(entry.type === 'character' ? { character: entry.character } : {}),
    url: entry.url,
    publishedAt: entry.publishedAt,
  });

  ['mv-url', 'mv-title', 'mv-artist', 'mv-character', 'mv-date', 'mv-id'].forEach((field) => {
    const el = $(`#${field}`);
    if (el) el.value = '';
  });

  _renderMvList();
  const status = $('#mv-status');
  if (status) {
    const renamed = entry.id && entry.id !== id ? `（IDは "${id}" に振り直しました）` : '';
    status.textContent = `「${entry.title}」を追加しました${renamed}。準備ができたら「music.json をダウンロード」してください。`;
  }
}

function initMusicVideos() {
  const addBtn = $('#mv-add-btn');
  if (!addBtn) return;

  // music.json を読み込む
  fetch('/data/music.json')
    .then(r => r.json())
    .then(j => { _mvVideos = j.videos || []; _renderMvList(); })
    .catch(() => { _mvVideos = []; _renderMvList(); });

  $('#mv-download-btn')?.addEventListener('click', _saveMvData);

  $('#mv-search')?.addEventListener('input', _renderMvList);
  $('#mv-filter-type')?.addEventListener('change', _renderMvList);
  $('#mv-show-thumbs')?.addEventListener('change', _renderMvList);

  addBtn.addEventListener('click', () => {
    _mvClearIssues();
    const entry = _mvFormEntry();
    const result = validateMusicVideo(entry, _mvVideos);
    const status = $('#mv-status');

    if (result.errors.length || result.warnings.length) {
      if (status) status.textContent = '';
      _mvShowIssues(result, () => _mvAppend(entry));
      return;
    }
    _mvAppend(entry);
  });
}

/* ─── 歌枠・セトリ編集 ────────────────────────────────────────────────────── */

let _editStreamId = null;
/** @type {import('./admin/setlist-rows.js').SetlistRow[]} */
let _setlistRows = [];
/** ドラッグ中の行位置。ドラッグしていないときは null。 */
let _dragFrom = null;

const SETLIST_FIELDS = ['title', 'artist', 'displayKey', 'genre'];

function _setlistRowHtml(row, i, total) {
  const cell = (field, placeholder, extra = '') => `
    <td><input data-setlist-field="${field}" data-setlist-index="${i}"
      value="${escapeHtml(row[field] || '')}" placeholder="${placeholder}" ${extra}></td>`;
  return `
    <tr data-setlist-row="${i}" draggable="true">
      <td class="setlist-handle" title="ドラッグで並び替え" aria-hidden="true">⠿</td>
      <td class="setlist-pos">${i + 1}</td>
      ${cell('title', '曲名')}
      ${cell('artist', 'アーティスト')}
      ${cell('displayKey', '±0 / 原キー')}
      ${cell('genre', 'ジャンル', 'list="setlist-genre-list"')}
      <td class="setlist-ops">
        <button class="btn ghost" type="button" data-setlist-move="up" data-setlist-index="${i}"
          ${i === 0 ? 'disabled' : ''} aria-label="${i + 1}曲目を上へ">↑</button>
        <button class="btn ghost" type="button" data-setlist-move="down" data-setlist-index="${i}"
          ${i === total - 1 ? 'disabled' : ''} aria-label="${i + 1}曲目を下へ">↓</button>
        <button class="btn ghost" type="button" data-setlist-insert="${i}"
          aria-label="${i + 1}曲目の下に追加" title="この下に追加">＋</button>
        <button class="btn ghost setlist-remove" type="button" data-setlist-remove="${i}"
          aria-label="${i + 1}曲目を削除" title="削除">✕</button>
      </td>
    </tr>`;
}

/**
 * セトリ行を描画する。
 * @param {string} [focus] - 描画後にフォーカスを戻す要素のセレクタ（連続クリック用）。
 */
function _renderSetlistRows(focus) {
  const wrap = $('#setlist-rows-wrap');
  if (!wrap) return;

  if (!_setlistRows.length) {
    wrap.innerHTML = '<p class="admin-note">曲がありません。「＋ 曲を追加」かテキスト一括編集から追加してください。</p>';
  } else {
    wrap.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table setlist-table">
          <thead>
            <tr><th></th><th>#</th><th>曲名</th><th>アーティスト</th><th>キー</th><th>ジャンル</th><th>操作</th></tr>
          </thead>
          <tbody>${_setlistRows.map((row, i) => _setlistRowHtml(row, i, _setlistRows.length)).join('')}</tbody>
        </table>
      </div>
      <datalist id="setlist-genre-list">
        ${GENRE_LIST.map((g) => `<option value="${escapeHtml(g)}"></option>`).join('')}
      </datalist>`;
  }

  const count = $('#setlist-count');
  if (count) count.textContent = `曲リスト — ${_setlistRows.length}曲`;
  if (focus) /** @type {HTMLElement|null} */ (wrap.querySelector(focus))?.focus();
}

/** 行配列を差し替えて描画する。 */
function _setSetlistRows(rows, focus) {
  _setlistRows = rows;
  _renderSetlistRows(focus);
  const status = $('#setlist-status');
  if (status) status.textContent = '未保存の変更があります。「セトリを保存」で確定します。';
}

function _initSetlistRowEvents() {
  const wrap = $('#setlist-rows-wrap');
  if (!wrap) return;

  // 入力は state だけ更新する（再描画するとフォーカスが飛ぶため）
  wrap.addEventListener('input', (event) => {
    const input = event.target.closest('[data-setlist-field]');
    if (!input) return;
    const field = input.dataset.setlistField;
    if (!SETLIST_FIELDS.includes(field)) return;
    _setlistRows = updateSetlistRow(_setlistRows, Number(input.dataset.setlistIndex), field, input.value);
    const status = $('#setlist-status');
    if (status) status.textContent = '未保存の変更があります。「セトリを保存」で確定します。';
  });

  wrap.addEventListener('click', (event) => {
    const move = event.target.closest('[data-setlist-move]');
    if (move) {
      const from = Number(move.dataset.setlistIndex);
      const to = move.dataset.setlistMove === 'up' ? from - 1 : from + 1;
      // 押したボタンを追いかけてフォーカスし、連続で押せるようにする
      _setSetlistRows(moveSetlistRow(_setlistRows, from, to),
        `[data-setlist-move="${move.dataset.setlistMove}"][data-setlist-index="${to}"]`);
      return;
    }
    const insert = event.target.closest('[data-setlist-insert]');
    if (insert) {
      const at = Number(insert.dataset.setlistInsert) + 1;
      _setSetlistRows(insertSetlistRow(_setlistRows, at),
        `[data-setlist-field="title"][data-setlist-index="${at}"]`);
      return;
    }
    const remove = event.target.closest('[data-setlist-remove]');
    if (remove) {
      const i = Number(remove.dataset.setlistRemove);
      const label = _setlistRows[i]?.title || `${i + 1}曲目`;
      if (!confirm(`「${label}」をセトリから外します。よろしいですか？`)) return;
      _setSetlistRows(removeSetlistRow(_setlistRows, i));
    }
  });

  // ドラッグ&ドロップでの並び替え（↑↓ でも同じことができる）
  wrap.addEventListener('dragstart', (event) => {
    const tr = event.target.closest('[data-setlist-row]');
    if (!tr) return;
    _dragFrom = Number(tr.dataset.setlistRow);
    event.dataTransfer.effectAllowed = 'move';
    // Firefox はデータをセットしないと dragover が発火しない
    event.dataTransfer.setData('text/plain', String(_dragFrom));
  });
  wrap.addEventListener('dragover', (event) => {
    if (_dragFrom === null) return;
    const tr = event.target.closest('[data-setlist-row]');
    if (!tr) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    tr.classList.add('is-drop-target');
  });
  wrap.addEventListener('dragleave', (event) => {
    event.target.closest('[data-setlist-row]')?.classList.remove('is-drop-target');
  });
  wrap.addEventListener('drop', (event) => {
    const tr = event.target.closest('[data-setlist-row]');
    if (_dragFrom === null || !tr) return;
    event.preventDefault();
    const to = Number(tr.dataset.setlistRow);
    const from = _dragFrom;
    _dragFrom = null;
    if (from !== to) _setSetlistRows(moveSetlistRow(_setlistRows, from, to));
    else tr.classList.remove('is-drop-target');
  });
  wrap.addEventListener('dragend', () => {
    _dragFrom = null;
    wrap.querySelectorAll('.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
  });
}

/**
 * 歌枠の選択肢を描く。
 * 枠は200件以上あり、表で全件並べるとパネルが縦に伸びて
 * 下の編集フォームまで遠くなるため、打刻ツールと同じプルダウンに揃えている。
 */
function _renderStreamOptions(streams) {
  const select = $('#edit-stream');
  if (!select) return;
  if (!streams.length) {
    select.innerHTML = '<option value="">歌枠がありません</option>';
    return;
  }
  select.innerHTML = streams.map((stream) =>
    `<option value="${stream.id}">${escapeHtml(streamOptionLabel(stream, null))}</option>`
  ).join('');
}

async function _loadStreamForEdit(streamId) {
  $('#stream-edit-status').textContent = '読み込み中…';
  try {
    const data = await adminApi(`streams/${streamId}/songs`);
    const s = data.stream;
    _editStreamId = streamId;

    $('#edit-streamed-on').value = s.streamed_on || '';
    $('#edit-source-index').value = s.source_index != null ? s.source_index : '';
    $('#edit-stream-title').value = s.title || '';
    $('#edit-stream-url').value = s.url || '';
    $('#edit-songs-text').value = data.songsText || '';
    _setlistRows = parseSetlistText(data.songsText || '');
    _renderSetlistRows();
    $('#edit-preview-box').innerHTML = '';
    $('#stream-info-status').textContent = '';
    $('#setlist-status').textContent = '';
    $('#stream-edit-heading').textContent = `歌枠情報 — ${s.streamed_on} ${s.title || ''}`;
    $('#stream-edit-form').style.display = '';
    $('#stream-edit-badge').textContent = `編集中: #${streamId}`;
    $('#stream-edit-status').textContent = '';
    $('#stream-edit-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    $('#stream-edit-status').textContent = `エラー: ${err.message || err}`;
  }
}

function initStreamEdit() {
  const editChannel = $('#edit-channel');
  const channels = Object.values(CHANNELS);
  editChannel.innerHTML = channels.map((ch) =>
    `<option value="${escapeHtml(ch.id)}">${escapeHtml(ch.label)}</option>`
  ).join('');
  editChannel.value = CHANNELS[DEFAULT_CHANNEL] ? DEFAULT_CHANNEL : channels[0]?.id || '';

  $('#load-streams-btn')?.addEventListener('click', async () => {
    $('#stream-edit-status').textContent = '読み込み中…';
    $('#edit-stream').innerHTML = '<option value="">読み込み中…</option>';
    $('#stream-edit-form').style.display = 'none';
    _editStreamId = null;
    $('#stream-edit-badge').textContent = '選択中なし';
    try {
      const data = await adminApi(`streams?channelCode=${encodeURIComponent(editChannel.value)}`);
      const streams = data.streams || [];
      _renderStreamOptions(streams);
      $('#stream-edit-status').textContent = streams.length
        ? `${streams.length}件。編集する枠を選んで「この枠を編集」を押してください。`
        : '歌枠がありません。';
    } catch (err) {
      $('#edit-stream').innerHTML = '<option value="">取得に失敗しました</option>';
      $('#stream-edit-status').textContent = `エラー: ${err.message || err}`;
    }
  });

  $('#edit-open-btn')?.addEventListener('click', () => {
    const id = Number($('#edit-stream')?.value);
    if (!id) { $('#stream-edit-status').textContent = '先に歌枠を読み込んで選択してください。'; return; }
    _loadStreamForEdit(id);
  });

  // チャンネルを変えたら前の一覧は当てにならないので選び直させる
  editChannel.addEventListener('change', () => {
    $('#edit-stream').innerHTML = '<option value="">先に読み込んでください</option>';
    $('#stream-edit-form').style.display = 'none';
    _editStreamId = null;
    $('#stream-edit-badge').textContent = '選択中なし';
    $('#stream-edit-status').textContent = '';
  });

  $('#save-stream-info-btn')?.addEventListener('click', async () => {
    if (!_editStreamId) return;
    if (!confirm('歌枠情報を更新します。よろしいですか？')) return;
    $('#stream-info-status').textContent = '保存中…';
    try {
      await adminApi(`streams/${_editStreamId}`, {
        title: $('#edit-stream-title').value,
        url: $('#edit-stream-url').value,
        streamedOn: $('#edit-streamed-on').value,
        sourceIndex: $('#edit-source-index').value || null,
      });
      $('#stream-info-status').textContent = '歌枠情報を保存しました。必要なら静的データ生成を実行してください。';
    } catch (err) {
      $('#stream-info-status').textContent = `エラー: ${err.message || err}`;
    }
  });

  _initSetlistRowEvents();

  $('#add-setlist-row-btn')?.addEventListener('click', () => {
    _setSetlistRows(insertSetlistRow(_setlistRows),
      `[data-setlist-field="title"][data-setlist-index="${_setlistRows.length}"]`);
  });

  // テキスト一括編集は開いたときに現在の行内容を流し込み、閉じるまで一覧と切り離す
  $('#toggle-setlist-text-btn')?.addEventListener('click', (event) => {
    const box = $('#setlist-text-box');
    const opening = box.hidden;
    if (opening) $('#edit-songs-text').value = serializeSetlistRows(_setlistRows);
    box.hidden = !opening;
    event.currentTarget.setAttribute('aria-expanded', String(opening));
    event.currentTarget.textContent = opening ? 'テキスト編集を閉じる' : 'テキストで一括編集';
  });

  $('#apply-setlist-text-btn')?.addEventListener('click', () => {
    _setSetlistRows(parseSetlistText($('#edit-songs-text').value));
    $('#setlist-status').textContent = `テキストから ${_setlistRows.length}曲を取り込みました。「セトリを保存」で確定します。`;
  });

  $('#preview-edit-stream-btn')?.addEventListener('click', async () => {
    $('#setlist-status').textContent = 'プレビュー中…';
    try {
      const channelCode = $('#edit-channel').value;
      const data = await adminApi('preview-stream', {
        channelCode,
        streamedOn: $('#edit-streamed-on').value,
        title: $('#edit-stream-title').value,
        url: $('#edit-stream-url').value,
        songsText: serializeSetlistRows(_setlistRows),
      });
      $('#edit-preview-box').innerHTML = `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>#</th><th>曲</th><th>歌手</th><th>キー</th><th>ジャンル</th><th>判定</th></tr></thead>
            <tbody>
              ${data.songs.map((row) => `
                <tr>
                  <td>${row.position}</td>
                  <td>${escapeHtml(row.title)}</td>
                  <td>${escapeHtml(row.artist || '')}</td>
                  <td>${escapeHtml(row.displayKey || '')}</td>
                  <td>${escapeHtml(row.genre || '')}</td>
                  <td>${escapeHtml(row.match)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
      $('#setlist-status').textContent = `${data.songs.length}曲を確認しました。`;
    } catch (err) {
      $('#setlist-status').textContent = `エラー: ${err.message || err}`;
    }
  });

  $('#save-setlist-btn')?.addEventListener('click', async () => {
    if (!_editStreamId) return;
    const songsText = serializeSetlistRows(_setlistRows);
    if (!songsText) {
      $('#setlist-status').textContent = '曲が1件もありません。曲名が空の行は保存されません。';
      return;
    }
    const dropped = _setlistRows.length - songsText.split('\n').length;
    const note = dropped > 0 ? `\n（曲名が空の${dropped}行は除外されます）` : '';
    if (!confirm(`このセトリ ${songsText.split('\n').length}曲に完全に置き換えます。よろしいですか？${note}`)) return;
    $('#setlist-status').textContent = '保存中…';
    try {
      const data = await adminApi(`streams/${_editStreamId}/setlist`, { songsText });
      $('#setlist-status').textContent = `セトリを保存しました: ${data.count}曲。必要なら静的データ生成を実行してください。`;
    } catch (err) {
      $('#setlist-status').textContent = `エラー: ${err.message || err}`;
    }
  });
}

/* ─── タイムスタンプ打刻 ─────────────────────────────────────────────────── */

/**
 * 固定コメントが無い歌枠に時刻を付けるためのツール。
 * 曲の開始と終了を打刻し、コメント用テキストは両方を、D1 へは開始だけを保存する
 * （community_timestamps は1曲1時刻で、サイトが使うのは開始地点のため）。
 */

const MK_SEEK_STEPS = { normal: 5, shift: 30, ctrl: 300 };

let _mkStream = null;      // { id, sourceIndex, channelCode, videoId, title }
let _mkSongs = [];         // [{ title, artist }]
let _mkMarks = [];         // [{ start, end }]
let _mkMeta = { start: null, voice: null };
let _mkTarget = 0;         // 打刻対象の曲
let _mkAnchors = [];       // チャットの山（秒）
let _mkCoverage = {};      // 枠番号 → D1 に入っている曲数（プルダウンの済/未表示用）
let _mkStreams = [];       // 読み込んだ歌枠一覧（絞り込みの切り替えで再描画するため保持）
let _mkPlayer = null;
let _mkTicker = null;
let _mkCommentDirty = false; // プレビューを手直ししたら自動再生成しない

const _mkVideoId = (url) => (String(url || '').match(/(?:live\/|v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/) || [])[1] || '';
const _mkDuration = () => (_mkPlayer?.getDuration ? Math.floor(_mkPlayer.getDuration()) : 0);

// seekTo の直後は getCurrentTime() がしばらく前の値を返すため、
// 指示した位置を覚えておき、キー連打でシークが積み上がるようにする。
let _mkPendingSeek = null;
let _mkPendingTimer = null;

/** いま何秒地点にいるか。シーク直後は指示値を優先する。 */
function _mkTime() {
  if (_mkPendingSeek != null) return _mkPendingSeek;
  return _mkPlayer?.getCurrentTime ? Math.floor(_mkPlayer.getCurrentTime()) : 0;
}

function _mkSeek(seconds) {
  if (!_mkPlayer?.seekTo) return;
  const duration = _mkDuration();
  const to = Math.max(0, duration ? Math.min(seconds, duration) : seconds);
  _mkPendingSeek = to;
  _mkPlayer.seekTo(to, true);
  _mkRenderNow(to);
  // プレイヤーが追いついたら実測値に戻す
  clearTimeout(_mkPendingTimer);
  _mkPendingTimer = setTimeout(() => { _mkPendingSeek = null; }, 700);
}

function _mkRenderNow(seconds) {
  const el = $('#marker-current');
  if (el) el.textContent = formatSeconds(seconds ?? _mkTime());
}

/** YouTube IFrame API を読み込む（1度だけ）。 */
function _mkLoadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (!_mkLoadYouTubeApi._promise) {
    _mkLoadYouTubeApi._promise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
  }
  return _mkLoadYouTubeApi._promise;
}

/**
 * 歌枠プルダウンを描き直す。
 * 「未登録のみ」が入っていれば、全曲そろっている枠を隠して選びやすくする。
 * 打ち直したいときのためにチェックを外せば全件出る。
 */
function _mkRenderStreamOptions() {
  const select = $('#marker-stream');
  const status = $('#marker-status');
  if (!select) return;

  const counts = { done: 0, partial: 0, none: 0 };
  const rows = _mkStreams.map((s) => {
    const covered = _mkCoverage[s.source_index] ?? 0;
    const state = coverageState(s.song_count, covered).state;
    counts[state]++;
    return { stream: s, covered, state };
  });

  const onlyUnregistered = !!$('#marker-unregistered-only')?.checked;
  const shown = onlyUnregistered ? rows.filter((r) => r.state !== 'done') : rows;

  const keep = select.value;
  select.innerHTML = shown.map((r) =>
    `<option value="${r.stream.id}">${escapeHtml(streamOptionLabel(r.stream, r.covered))}</option>`
  ).join('');
  // 絞り込みを切り替えても、選んでいた枠が残っていれば選択を維持する
  if (keep && shown.some((r) => String(r.stream.id) === keep)) select.value = keep;

  if (!status) return;
  const summary = `✓済み ${counts.done} / △一部 ${counts.partial} / 未 ${counts.none}`;
  if (!_mkStreams.length) {
    status.textContent = '歌枠がありません。';
  } else if (!shown.length) {
    status.textContent = `全${_mkStreams.length}件すべて登録済みです（${summary}）。打ち直すにはチェックを外してください。`;
  } else {
    status.textContent = `${shown.length}件を表示中（全${_mkStreams.length}件: ${summary}）。打刻する枠を選んで「この枠を開く」を押してください。`;
  }
}

function _mkRowHtml(song, i) {
  const mark = _mkMarks[i] || {};
  const isTarget = i === _mkTarget;
  return `
    <tr data-mk-row="${i}" class="${isTarget ? 'is-target' : ''}">
      <td class="marker-pos">${i + 1}</td>
      <td class="marker-song">
        <div class="marker-title">${escapeHtml(song.title)}</div>
        ${song.artist ? `<div class="marker-artist">${escapeHtml(song.artist)}</div>` : ''}
      </td>
      <td><input class="marker-time" data-mk-field="start" data-mk-index="${i}"
        value="${formatSeconds(mark.start)}" placeholder="開始" inputmode="numeric"></td>
      <td><input class="marker-time" data-mk-field="end" data-mk-index="${i}"
        value="${formatSeconds(mark.end)}" placeholder="終了" inputmode="numeric"></td>
      <td class="marker-ops">
        <button class="btn ghost" type="button" data-mk-goto="${i}" title="この時刻へ移動"
          ${mark.start == null ? 'disabled' : ''}>▶</button>
        <button class="btn ghost" type="button" data-mk-clear="${i}" title="この曲の打刻を消す">✕</button>
      </td>
    </tr>`;
}

function _mkRenderRows() {
  const wrap = $('#marker-rows-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table marker-table">
        <thead><tr><th>#</th><th>曲</th><th>開始</th><th>終了</th><th></th></tr></thead>
        <tbody>${_mkSongs.map(_mkRowHtml).join('')}</tbody>
      </table>
    </div>`;

  const meta = $('#marker-meta');
  if (meta) {
    meta.innerHTML = DEFAULT_META_ROWS.map((row) => `
      <label class="marker-meta-item">${escapeHtml(row.label)}
        <input class="marker-time" data-mk-meta="${row.key}" value="${formatSeconds(_mkMeta[row.key])}" placeholder="—">
        <button class="btn ghost" type="button" data-mk-meta-set="${row.key}" title="現在位置を入れる">打刻</button>
      </label>`).join('');
  }

  // 打刻の矛盾を出す（保存はできるが気付けるようにする）
  const issues = findMarkIssues(_mkMarks);
  const issueEl = $('#marker-issues');
  if (issueEl) {
    const done = _mkMarks.filter((m) => m.start != null).length;
    issueEl.textContent = issues.length
      ? `⚠ ${issues.map((x) => `${x.index + 1}曲目: ${x.reason}`).join(' / ')}`
      : `${done}/${_mkSongs.length}曲を打刻済み`;
    issueEl.classList.toggle('is-warn', issues.length > 0);
  }

  const row = wrap.querySelector(`[data-mk-row="${_mkTarget}"]`);
  row?.scrollIntoView({ block: 'nearest' });
  _mkRenderComment();
}

/** 打刻内容からコメント用テキストを作り直す。手直し済みなら触らない。 */
function _mkRenderComment(force = false) {
  const box = $('#marker-comment');
  if (!box) return;
  if (_mkCommentDirty && !force) return;
  box.value = buildCommentText(_mkSongs, _mkMarks, {
    template: COMMENT_TEMPLATES[$('#marker-template')?.value]?.template,
    timeFormat: $('#marker-time-format')?.value || 'auto',
    meta: _mkMeta,
    footer: $('#marker-footer')?.value || '',
  });
  _mkCommentDirty = false;
}

function _mkSetTarget(index) {
  if (!_mkSongs.length) return;
  _mkTarget = Math.max(0, Math.min(index, _mkSongs.length - 1));
  _mkRenderRows();
}

/** 現在位置を対象曲の開始/終了に記録する。 */
function _mkMark(field) {
  if (!_mkSongs.length) return;
  if (field === 'end') {
    // 開始を打つと対象は次へ進むので、終了はいま歌い終わった曲に入れる
    const at = endTargetIndex(_mkMarks, _mkTarget);
    if (at < 0) return;
    _mkMarks = setMark(_mkMarks, at, 'end', _mkTime());
    _mkRenderRows();
    return;
  }
  // 打刻するだけで対象は動かさない。
  // 開始→終了を同じ行に続けて入れられるようにし、押し間違えたら押し直せるようにする。
  // 次の曲へは ↓ で移る。
  const marked = _mkTime();
  _mkMarks = setMark(_mkMarks, _mkTarget, 'start', marked);
  _mkRenderRows();
  if ($('#marker-auto-jump')?.checked) _mkJump(marked);
}

/**
 * 次の手がかりへ飛ぶ。
 * チャットの山があれば「いま打った曲の終わり際」に、無ければ等間隔の当たりに着地する。
 *
 * 予測は「次の曲」を基準にする。Space は打刻するだけで対象を動かさないため、
 * 対象そのものを渡すと、いま打った曲の位置を計算してしまう。
 */
function _mkJump(from) {
  const nextIndex = Math.min(_mkTarget + 1, Math.max(0, _mkSongs.length - 1));
  const jump = nextJumpTarget(_mkMarks, nextIndex, _mkDuration(), _mkAnchors, from ?? _mkTime());
  const status = $('#marker-anchor-status');
  if (!jump) {
    if (status) status.textContent = '飛び先を決められませんでした（配信の長さが取れないか、最後の曲です）。';
    return;
  }
  _mkSeek(jump.seconds);
  const how = jump.by === 'anchor' ? 'チャットの山' : '残り時間の等分';
  if (status) status.textContent = `${formatSeconds(jump.seconds)} へ移動しました（${how}）。ズレていたら矢印キーで調整してください。`;
}

function _mkKeydown(event) {
  if ($('#marker-workspace')?.hidden) return;
  const tag = event.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return;

  const step = event.ctrlKey ? MK_SEEK_STEPS.ctrl : event.shiftKey ? MK_SEEK_STEPS.shift : MK_SEEK_STEPS.normal;
  const key = event.key;
  const handlers = {
    ' ': () => _mkMark('start'),
    e: () => _mkMark('end'),
    E: () => _mkMark('end'),
    ArrowRight: () => _mkSeek(_mkTime() + step),
    ArrowLeft: () => _mkSeek(_mkTime() - step),
    ArrowDown: () => _mkSetTarget(_mkTarget + 1),
    ArrowUp: () => _mkSetTarget(_mkTarget - 1),
    n: () => { const a = nextAnchor(_mkAnchors, _mkTime()); if (a != null) _mkSeek(a); },
    N: () => { const a = nextAnchor(_mkAnchors, _mkTime()); if (a != null) _mkSeek(a); },
    p: () => { const a = prevAnchor(_mkAnchors, _mkTime()); if (a != null) _mkSeek(a); },
    P: () => { const a = prevAnchor(_mkAnchors, _mkTime()); if (a != null) _mkSeek(a); },
    j: () => _mkJump(),
    J: () => _mkJump(),
    Backspace: () => {
      _mkMarks = setMark(setMark(_mkMarks, _mkTarget, 'start', null), _mkTarget, 'end', null);
      _mkRenderRows();
    },
    k: () => { const s = _mkPlayer?.getPlayerState?.(); s === 1 ? _mkPlayer.pauseVideo() : _mkPlayer?.playVideo?.(); },
    K: () => { const s = _mkPlayer?.getPlayerState?.(); s === 1 ? _mkPlayer.pauseVideo() : _mkPlayer?.playVideo?.(); },
  };
  const handler = handlers[key];
  if (!handler) return;
  event.preventDefault();
  handler();
}

/* ─── 固定コメントの貼り付け取り込み ───────────────────────────────────────── */

/** 直近の照合結果。反映ボタンで打刻表へ書き込むまで持っておく */
let _mkPasteMatched = null;

function _mkPasteReset() {
  _mkPasteMatched = null;
  const apply = $('#marker-paste-apply-btn');
  if (apply) apply.disabled = true;
  const preview = $('#marker-paste-preview');
  if (preview) preview.innerHTML = '';
  const status = $('#marker-paste-status');
  if (status) status.textContent = '';
}

/** 貼り付けた固定コメントをセトリと照合し、結果を表で見せる（まだ反映はしない）。 */
function _mkPasteMatch() {
  const status = $('#marker-paste-status');
  const apply = $('#marker-paste-apply-btn');
  const preview = $('#marker-paste-preview');
  if (apply) apply.disabled = true;

  if (!_mkSongs.length) { status.textContent = '先に歌枠を開いてください。'; return; }
  const comment = $('#marker-paste')?.value || '';
  if (!comment.trim()) { status.textContent = '固定コメントを貼り付けてください。'; return; }

  _mkPasteMatched = matchSetlist(_mkSongs, comment);
  const inversions = new Set(findInversions(_mkPasteMatched).map((v) => v.index));
  const matched = _mkPasteMatched.filter((m) => m.seconds != null).length;

  preview.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>#</th><th>曲名</th><th>アーティスト</th><th>現在</th><th>照合結果</th><th>方法</th></tr></thead>
        <tbody>${_mkSongs.map((song, i) => {
          const m = _mkPasteMatched[i];
          const now = _mkMarks[i]?.start;
          const warn = inversions.has(i);
          const changed = m.seconds != null && now != null && m.seconds !== now;
          return `
          <tr${warn ? ' class="is-warn"' : ''}>
            <td>${i + 1}</td>
            <td>${escapeHtml(song.title)}</td>
            <td>${escapeHtml(song.artist || '')}</td>
            <td>${now != null ? escapeHtml(formatSeconds(now)) : '—'}</td>
            <td><strong>${m.seconds != null ? escapeHtml(formatSeconds(m.seconds)) : '—'}</strong>${changed ? ' <small>(変更)</small>' : ''}</td>
            <td>${warn ? '⚠️ 時刻が前後している' : escapeHtml(m.how || '未割当')}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;

  const warnText = inversions.size
    ? `　⚠️ 時刻の逆転が${inversions.size}件あります（コメントの誤記か、セトリの並びが実際の歌唱順とずれている可能性）。`
    : '';
  status.textContent = `${matched} / ${_mkSongs.length}曲に割り当てました。${warnText}`;
  if (apply) apply.disabled = matched === 0;
}

/**
 * 照合結果を打刻表へ書き込む。
 * ここでは D1 に保存しない。表で直してから既存の「サイトに開始時刻を保存」で確定させる。
 */
function _mkPasteApply() {
  if (!_mkPasteMatched) return;
  let applied = 0;
  _mkPasteMatched.forEach((m, i) => {
    if (m.seconds == null) return;
    _mkMarks = setMark(_mkMarks, i, 'start', m.seconds);
    applied++;
  });
  _mkTarget = Math.max(0, nextUnmarkedIndex(_mkMarks, 0));
  _mkCommentDirty = false;
  _mkRenderRows();
  $('#marker-paste-status').textContent =
    `${applied}曲を打刻表に反映しました。内容を確認して「サイトに開始時刻を保存」を押すと D1 に保存されます。`;
}

async function _mkOpenStream(streamId, channelCode) {
  const status = $('#marker-status');
  status.textContent = '読み込み中…';
  try {
    const data = await adminApi(`streams/${streamId}/songs`);
    const s = data.stream;
    const videoId = _mkVideoId(s.url);
    if (!videoId) throw new Error('この歌枠のURLから動画IDを取り出せません');

    _mkStream = { id: streamId, sourceIndex: s.source_index, channelCode, videoId, title: s.title, streamedOn: s.streamed_on };
    _mkSongs = parseSetlistText(data.songsText || '').map((r) => ({ title: r.title, artist: r.artist }));
    if (!_mkSongs.length) throw new Error('セトリが空です。先にセトリを登録してください');

    // 打ち直しのため、既に保存済みの開始時刻を読み戻す
    let existing = [];
    try {
      const got = await adminApi(`timestamps/approved?channelCode=${encodeURIComponent(channelCode)}&streamIndex=${s.source_index}`);
      existing = got.items || [];
    } catch (_) { /* 未保存なら空のままでよい */ }

    _mkMarks = marksFromItems(existing, _mkSongs.length);
    _mkMeta = { start: null, voice: null };
    _mkTarget = Math.max(0, nextUnmarkedIndex(_mkMarks, 0));
    _mkCommentDirty = false;
    // 別の枠を開いたら、前の枠の貼り付け内容と照合結果は捨てる
    const pasteBox = $('#marker-paste');
    if (pasteBox) pasteBox.value = '';
    _mkPasteReset();

    $('#marker-workspace').hidden = false;
    $('#marker-badge').textContent = `茨むあん #${s.source_index}`;
    status.textContent = existing.length
      ? `${s.streamed_on} ${s.title || ''}（保存済み ${existing.length}曲を読み込みました）`
      : `${s.streamed_on} ${s.title || ''}`;

    await _mkLoadYouTubeApi();
    if (_mkPlayer?.destroy) { _mkPlayer.destroy(); _mkPlayer = null; }
    $('#marker-player').innerHTML = '';
    _mkPlayer = new window.YT.Player($('#marker-player'), {
      videoId,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: () => {
          const dur = _mkDuration();
          $('#marker-duration').textContent = dur ? `/ 全体 ${formatSeconds(dur)}` : '';
          _mkRenderNow(0);
        },
      },
    });

    clearInterval(_mkTicker);
    _mkTicker = setInterval(() => { if (!$('#marker-workspace').hidden) _mkRenderNow(); }, 250);
    _mkRenderRows();
  } catch (err) {
    status.textContent = `エラー: ${err.message || err}`;
  }
}

function initTimestampMarker() {
  const channelSel = $('#marker-channel');
  if (!channelSel) return;

  channelSel.innerHTML = Object.values(CHANNELS)
    .map((ch) => `<option value="${escapeHtml(ch.id)}">${escapeHtml(ch.label)}</option>`).join('');
  channelSel.value = CHANNELS[DEFAULT_CHANNEL] ? DEFAULT_CHANNEL : Object.values(CHANNELS)[0]?.id || '';

  $('#marker-template').innerHTML = Object.entries(COMMENT_TEMPLATES)
    .map(([key, t]) => `<option value="${key}">${escapeHtml(t.label)}</option>`).join('');

  $('#marker-load-streams-btn')?.addEventListener('click', async () => {
    const status = $('#marker-status');
    status.textContent = '読み込み中…';
    try {
      const channelCode = channelSel.value;
      // 枠一覧と「どの枠が何曲入っているか」を同時に取る（1件ずつ問い合わせない）
      const [data, cov] = await Promise.all([
        adminApi(`streams?channelCode=${encodeURIComponent(channelCode)}`),
        adminApi(`timestamps/coverage?channelCode=${encodeURIComponent(channelCode)}`).catch(() => ({ coverage: {} })),
      ]);
      _mkStreams = data.streams || [];
      _mkCoverage = cov.coverage || {};
      _mkRenderStreamOptions();
    } catch (err) {
      status.textContent = `エラー: ${err.message || err}`;
    }
  });

  $('#marker-unregistered-only')?.addEventListener('change', _mkRenderStreamOptions);

  $('#marker-paste-match-btn')?.addEventListener('click', _mkPasteMatch);
  $('#marker-paste-apply-btn')?.addEventListener('click', _mkPasteApply);

  $('#marker-open-btn')?.addEventListener('click', () => {
    const id = Number($('#marker-stream')?.value);
    if (!id) { $('#marker-status').textContent = '先に歌枠一覧を読み込んで選択してください。'; return; }
    _mkOpenStream(id, channelSel.value);
  });

  // 行の操作（時刻の直接入力・移動・消去）
  $('#marker-rows-wrap')?.addEventListener('change', (event) => {
    const input = event.target.closest('[data-mk-field]');
    if (!input) return;
    const seconds = parseTimeInput(input.value);
    if (input.value.trim() && seconds == null) { input.classList.add('is-invalid'); return; }
    input.classList.remove('is-invalid');
    _mkMarks = setMark(_mkMarks, Number(input.dataset.mkIndex), input.dataset.mkField, seconds);
    _mkRenderRows();
  });

  $('#marker-rows-wrap')?.addEventListener('click', (event) => {
    const goto = event.target.closest('[data-mk-goto]');
    if (goto) {
      const mark = _mkMarks[Number(goto.dataset.mkGoto)];
      if (mark?.start != null) _mkSeek(mark.start);
      return;
    }
    const clear = event.target.closest('[data-mk-clear]');
    if (clear) {
      const i = Number(clear.dataset.mkClear);
      _mkMarks = setMark(setMark(_mkMarks, i, 'start', null), i, 'end', null);
      _mkRenderRows();
      return;
    }
    const row = event.target.closest('[data-mk-row]');
    if (row) _mkSetTarget(Number(row.dataset.mkRow));
  });

  // 配信の頭（start / 声入り）
  $('#marker-meta')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-mk-meta-set]');
    if (!btn) return;
    _mkMeta = { ..._mkMeta, [btn.dataset.mkMetaSet]: _mkTime() };
    _mkRenderRows();
  });
  $('#marker-meta')?.addEventListener('change', (event) => {
    const input = event.target.closest('[data-mk-meta]');
    if (!input) return;
    _mkMeta = { ..._mkMeta, [input.dataset.mkMeta]: parseTimeInput(input.value) };
    _mkRenderRows();
  });

  // チャットの山を読み込む
  $('#marker-anchor-file')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      // 拍手の山（曲の終わり）を主に、全体の山も混ぜて移動先を細かくする
      const seconds = [...(json.applausePeaks || []), ...(json.allPeaks || [])]
        .map((p) => Number(p.seconds)).filter(Number.isFinite);
      _mkAnchors = [...new Set(seconds)].sort((a, b) => a - b);
      $('#marker-anchor-status').textContent = `チャットの山 ${_mkAnchors.length}箇所を読み込みました。N / P キーで前後に飛べます。`;
    } catch (err) {
      $('#marker-anchor-status').textContent = `読み込めませんでした: ${err.message || err}`;
    }
  });

  // コメント書き出し
  for (const id of ['#marker-template', '#marker-time-format', '#marker-footer']) {
    $(id)?.addEventListener('change', () => _mkRenderComment(true));
  }
  $('#marker-comment')?.addEventListener('input', () => { _mkCommentDirty = true; });
  $('#marker-regen-btn')?.addEventListener('click', () => {
    _mkCommentDirty = false;
    _mkRenderComment(true);
    $('#marker-copy-status').textContent = '打刻内容から作り直しました。';
  });
  $('#marker-copy-btn')?.addEventListener('click', async () => {
    const text = $('#marker-comment').value;
    try {
      await navigator.clipboard.writeText(text);
      $('#marker-copy-status').textContent = `コピーしました（${text.split('\n').length}行）。`;
    } catch (_) {
      $('#marker-comment').select();
      $('#marker-copy-status').textContent = 'コピーできなかったので選択しました。Ctrl+C を押してください。';
    }
  });

  // 保存（サイト用は開始時刻だけ）
  $('#marker-save-btn')?.addEventListener('click', async () => {
    if (!_mkStream) return;
    const items = buildSavePayload(_mkMarks);
    const issues = findMarkIssues(_mkMarks);
    const warn = issues.length ? `\n\n⚠ ${issues.map((x) => `${x.index + 1}曲目: ${x.reason}`).join('\n')}` : '';
    if (!confirm(`${items.length}曲の開始時刻をサイトに保存します（この枠の既存の承認済みは置き換わります）。${warn}`)) return;
    $('#marker-save-status').textContent = '保存中…';
    try {
      const res = await adminApi('timestamps/bulk', {
        channelCode:  _mkStream.channelCode,
        streamIndex:  _mkStream.sourceIndex,
        items,
        reviewerNote: '管理画面の打刻ツール',
      });
      $('#marker-save-status').textContent = `保存しました: ${res.count}曲。サイトの曲詳細から各曲の開始地点へ飛べるようになります。`;
      // プルダウンの表示を保存結果に合わせる（読み込み直さずに済むように）。
      // 「未登録のみ」表示中なら、埋まった枠はここで一覧から外れる。
      _mkCoverage[_mkStream.sourceIndex] = res.count;
      _mkRenderStreamOptions();
    } catch (err) {
      $('#marker-save-status').textContent = `エラー: ${err.message || err}`;
    }
  });

  $('#marker-clear-btn')?.addEventListener('click', () => {
    if (!confirm('この枠の打刻をすべて消します（保存はまだ行いません）。よろしいですか？')) return;
    _mkMarks = createMarks(_mkSongs.length);
    _mkMeta = { start: null, voice: null };
    _mkTarget = 0;
    _mkCommentDirty = false;
    _mkRenderRows();
  });

  document.addEventListener('keydown', _mkKeydown);
}

/* ─── 起動 ───────────────────────────────────────────────────────────────── */

$('#refresh-status').addEventListener('click', loadStatus);
initManagement();
initQualityReview();
loadStatus();
initTimestamps();
initMusicVideos();
initStreamEdit();
initTimestampMarker();
