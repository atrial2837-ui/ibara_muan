import { state, toggleFavorite, isFavorite } from '../store.js';
import { ensureSongsTags } from '../tagging.js';
import { $, escapeHtml, fmtDate, daysClass, debounce, highlightText } from '../utils.js';
import { search, matchReasons, getSearchHistory, addSearchHistory, removeSearchHistory, clearSearchHistory } from '../search.js';
import { writeUrlState } from '../url-state.js';
import { applyGenreFilter, applyTagFilter, applySingerMode, sortSongs } from '../domain-compat.js';

let searchInputEl, sortSelectEl, genreSelectEl, filterButtonsEl, genreChipsEl, listEl, countEl, moreBtnWrap;
let searchHistoryDropdown = null;
const SETLIST_STORAGE_KEY = 'ibara-setlist-v1';
let currentFiltered = [];
let _setlistSearchClickOut = null;
let _dragCleanup = null;

export function renderSongs() {
  loadSetlist();
  restoreSetlistFromUrl();
  ensureSongsTags(state.data?.songs || []);
  const panel = $('#panel-songs');
  panel.innerHTML = `
    <div class="section-header">
      <h2>${state.singerMode ? '🎙 選曲ボード' : '🎵 全曲リスト'}</h2>
      <span class="count-pill" id="songs-count">—</span>
    </div>
    <div class="mobile-panel-switch">
      <button class="btn ghost active" type="button" data-mobile-panel-toggle="filters">絞り込み</button>
    </div>
    <div id="songs-filter-panel" class="mobile-panel mobile-panel-filters is-open">
      <div class="controls">
        <div class="search-input-wrap">
          <input id="songs-search" class="text-input" type="search" placeholder="🔍 曲名・アーティスト・雰囲気で検索（例：チルな曲 / あつい / ボカロ 定番）" value="${escapeHtml(state.songsQuery)}">
          <div id="search-history-dropdown" class="search-history-dropdown" hidden></div>
        </div>
        <select id="songs-sort" class="select-input">
          <option value="count-desc">回数（多）</option>
          <option value="count-asc">回数（少）</option>
          <option value="recent">最終披露（新）</option>
          <option value="oldest">最終披露（古）</option>
          <option value="title">曲名（あ→ん）</option>
          <option value="artist">アーティスト</option>
        </select>
        <select id="songs-genre" class="select-input genre-select" title="ジャンルで絞り込み">
          ${genreOptionsHtml()}
        </select>
      </div>
      <!-- 雰囲気サジェストチップ（常時表示・8種のみ） -->
      <div id="search-suggest" class="suggest-strip" role="group" aria-label="雰囲気で素早く検索">
        ${[
          ['😌 chill', 'チルな曲'],
          ['⚡ あつい', 'あつい曲'],
          ['🌙 しっとり', 'しっとり'],
          ['💫 エモい', 'エモい'],
          ['🔥 かっこいい', 'かっこいい'],
          ['🍂 切ない', '切ない'],
          ['📻 懐かしい', '懐かしい'],
          ['🌸 かわいい', 'かわいい'],
        ].map(([label, q]) => `<button type="button" class="suggest-chip" data-suggest="${escapeHtml(q)}">${label}</button>`).join('')}
      </div>
      <!-- 絞り込みボタン行 -->
      <div class="controls" id="songs-filters">
        <button class="btn ghost" data-filter="all">すべて</button>
        <button class="btn ghost" data-filter="fresh">🟢 最近</button>
        <button class="btn ghost" data-filter="stale">🟠 久しぶり</button>
        <button class="btn ghost" data-filter="never">⚪ 未確認</button>
        <button class="btn ghost" data-filter="favorites">❤️ お気に入り</button>
        ${state.singerMode ? '' : '<button class="btn ghost" id="recommend-btn" type="button">💡 おすすめ</button><button class="btn ghost" id="todays-song-btn" type="button">🎲 今日の一曲</button>'}
      </div>
      <p class="search-help">
        ${state.singerMode
          ? '＋でセトリに追加できます。🎲ランダム追加は現在の検索・絞り込み条件から選びます。'
          : '「チルな曲」「あつい」「ボカロ 定番」など自然語で検索できます。チップをタップで素早く絞り込み。'}
      </p>
      ${state.singerMode ? `
        <div class="songs-tools">
          <button class="btn ghost" data-singer-preset="keyed" type="button">キー確認済み</button>
          <button class="btn ghost" data-singer-preset="classic" type="button">定番</button>
          <button class="btn ghost" data-singer-preset="stale" type="button">久しぶり</button>
          <button class="btn ghost" data-singer-preset="rare" type="button">レア</button>
          <button class="btn ghost" data-singer-preset="chill" type="button">Chill</button>
          <button class="btn ghost" data-singer-preset="energetic" type="button">激しい</button>
          <button class="btn ghost" data-singer-preset="nostalgic" type="button">ノスタルジック</button>
          <button class="btn ghost" id="compact-btn" type="button">表示: ${state.songsView === 'compact' ? 'コンパクト' : '詳細'}</button>
          <button class="btn ghost" id="todays-song-btn" type="button">🎲 今日の一曲</button>
          <button class="btn primary" id="setlist-toggle-btn" type="button" aria-controls="setlist-planner" aria-expanded="${state.setlistExpanded ? 'true' : 'false'}">${state.setlistExpanded ? 'セトリ制作を閉じる' : 'セトリ制作を開く'}</button>
        </div>
      ` : ''}
    </div>
    ${state.singerMode ? '<div id="setlist-planner" class="setlist-planner mobile-panel mobile-panel-setlist"></div>' : ''}
    <div id="recommend-box" class="todays-song-box" hidden></div>
    <div id="todays-song-box" class="todays-song-box" hidden></div>
    <div class="genre-strip" id="songs-genre-chips">${genreChipsHtml()}</div>
    <div id="songs-list" class="song-list"></div>
    <div class="timeline-controls" id="songs-more-wrap"></div>
  `;

  searchInputEl = $('#songs-search');
  sortSelectEl = $('#songs-sort');
  genreSelectEl = $('#songs-genre');
  filterButtonsEl = $('#songs-filters');
  genreChipsEl = $('#songs-genre-chips');
  listEl = $('#songs-list');
  countEl = $('#songs-count');
  moreBtnWrap = $('#songs-more-wrap');

  sortSelectEl.value = state.songsSort;
  genreSelectEl.value = genreExists(state.songsGenre) ? state.songsGenre : 'all';
  state.songsGenre = genreSelectEl.value;
  refreshFilterButtons();
  refreshSuggestChips();
  refreshGenreChips();

  const suggestEl = document.getElementById('search-suggest');

  const debounced = debounce(() => {
    state.songsQuery = searchInputEl.value;
    state.songsLimit = 100;
    addSearchHistory(state.songsQuery);
    hideSearchHistory();
    writeUrlState({
      tab: 'songs',
      q: state.songsQuery,
    }, { replace: true });
    refreshSuggestChips();
    refresh();
  }, 120);
  searchInputEl.addEventListener('input', () => {
    debounced();
  });
  searchInputEl.addEventListener('focus', () => {
    showSearchHistory();
  });
  searchInputEl.addEventListener('blur', () => {
    setTimeout(() => {
      hideSearchHistory();
    }, 200);
  });

  // サジェストチップ（横スクロール常時表示）のクリック — トグル動作
  if (suggestEl) {
    suggestEl.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-suggest]');
      if (!chip) return;
      const q = chip.dataset.suggest;
      if (searchInputEl.value === q) {
        // 同じチップを押したらクリア
        searchInputEl.value = '';
        state.songsQuery = '';
      } else {
        searchInputEl.value = q;
        state.songsQuery = q;
      }
      state.songsLimit = 100;
      addSearchHistory(state.songsQuery || q);
      writeUrlState({ tab: 'songs', q: state.songsQuery }, { replace: true });
      refreshSuggestChips();
      refresh();
    });
  }
  sortSelectEl.addEventListener('change', () => { state.songsSort = sortSelectEl.value; refresh(); });
  genreSelectEl.addEventListener('change', () => {
    state.songsGenre = genreSelectEl.value;
    state.songsLimit = 100;
    refreshGenreChips();
    refresh();
  });
  filterButtonsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    if (btn.dataset.filter === 'favorites') {
      state.favoritesFilter = !state.favoritesFilter;
    } else {
      state.songsFilter = btn.dataset.filter;
      state.favoritesFilter = false;
    }
    state.songsLimit = 100;
    refreshFilterButtons();
    refresh();
  });
  genreChipsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-genre]');
    if (!btn) return;
    state.songsGenre = btn.dataset.genre;
    genreSelectEl.value = state.songsGenre;
    state.songsLimit = 100;
    refreshGenreChips();
    refresh();
  });
  for (const btn of panel.querySelectorAll('[data-singer-preset]')) {
    btn.addEventListener('click', () => {
      state.singerMode = true;
      state.singerPreset = state.singerPreset === btn.dataset.singerPreset ? 'all' : btn.dataset.singerPreset;
      state.songsLimit = 100;
      refresh();
    });
  }
  $('#compact-btn')?.addEventListener('click', () => {
    state.songsView = state.songsView === 'compact' ? 'comfortable' : 'compact';
    refresh();
  });
  $('#setlist-toggle-btn')?.addEventListener('click', () => toggleSetlistPlanner());
  $('#recommend-btn')?.addEventListener('click', () => showRecommendation());
  $('#todays-song-btn')?.addEventListener('click', () => showTodaysSong());
  for (const btn of panel.querySelectorAll('[data-mobile-panel-toggle]')) {
    btn.addEventListener('click', () => toggleMobilePanel(btn.dataset.mobilePanelToggle));
  }
  panel.onclick = (e) => {
    const clearBtn = e.target.closest('#search-history-clear');
    if (clearBtn) {
      e.preventDefault();
      e.stopPropagation();
      clearSearchHistory();
      hideSearchHistory();
      return;
    }
    const removeBtn = e.target.closest('.search-history-remove');
    if (removeBtn) {
      e.preventDefault();
      e.stopPropagation();
      removeSearchHistory(removeBtn.dataset.remove);
      showSearchHistory();
      return;
    }
    const historyItem = e.target.closest('.search-history-item');
    if (historyItem) {
      e.preventDefault();
      e.stopPropagation();
      const query = historyItem.dataset.query;
      state.songsQuery = query;
      searchInputEl.value = query;
      state.songsLimit = 100;
      hideSearchHistory();
      writeUrlState({ tab: 'songs', q: query });
      refresh();
      return;
    }
    const recommendDismiss = e.target.closest('[data-recommend-dismiss]');
    if (recommendDismiss) {
      e.preventDefault();
      e.stopPropagation();
      const box = $('#recommend-box');
      if (box) {
        box.hidden = true;
        box.innerHTML = '';
      }
      return;
    }
    const todaysSongDismiss = e.target.closest('[data-todays-song-dismiss]');
    if (todaysSongDismiss) {
      e.preventDefault();
      e.stopPropagation();
      const box = $('#todays-song-box');
      if (box) {
        box.hidden = true;
        box.innerHTML = '';
      }
      return;
    }
    const todaysSongReroll = e.target.closest('[data-todays-song-reroll]');
    if (todaysSongReroll) {
      e.preventDefault();
      e.stopPropagation();
      showTodaysSong();
      return;
    }
    const action = e.target.closest('[data-setlist-action]');
    if (action) {
      e.stopPropagation();
      handleSetlistAction(action);
      return;
    }
    const artist = e.target.closest('[data-artist-search]');
    if (artist) {
      e.stopPropagation();
      const name = String(artist.dataset.artistSearch || '').replace(/"/g, '');
      state.songsQuery = `artist:"${name}"`;
      searchInputEl.value = state.songsQuery;
      state.songsLimit = 100;
      writeUrlState({ tab: 'songs', q: state.songsQuery });
      refresh();
      return;
    }
    const favBtn = e.target.closest('[data-fav-toggle]');
    if (favBtn) {
      e.preventDefault();
      e.stopPropagation();
      const key = favBtn.dataset.favToggle;
      toggleFavorite(key);
      const isActive = isFavorite(key);
      favBtn.classList.toggle('is-active', isActive);
      favBtn.setAttribute('aria-pressed', String(isActive));
      favBtn.textContent = isActive ? '♥' : '♡';
      return;
    }
    const tag = e.target.closest('[data-tag-search]');
    if (!tag) return;
    e.stopPropagation();
    const type = tag.dataset.tagType || 'tag';
    state.songsQuery = `${type}:${tag.dataset.tagSearch}`;
    searchInputEl.value = state.songsQuery;
    state.songsLimit = 100;
    writeUrlState({ tab: 'songs', q: state.songsQuery });
    refresh();
  };
  panel.oninput = (e) => {
    if (e.target.id === 'setlist-theme') {
      state.setlist.theme = e.target.value;
      saveSetlist();
    }
  };
  panel.onchange = (e) => {
    if (e.target.id !== 'setlist-copy-format') return;
    state.setlist.copyFormat = e.target.value;
    saveSetlist();
  };
  panel.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    if (!e.target.closest('.setlist-custom-add') && !e.target.closest('.setlist-custom-details')) return;
    if (e.target.tagName === 'BUTTON') return; // ボタンは通常動作
    e.preventDefault();
    addCustomToSetlist();
  };

  refresh();
}

function showSearchHistory() {
  const history = getSearchHistory();
  const dropdown = $('#search-history-dropdown');
  if (!dropdown) return;
  searchHistoryDropdown = dropdown;
  if (!history.length) {
    dropdown.innerHTML = '<div class="search-history-empty">検索履歴がありません</div>';
  } else {
    dropdown.innerHTML = `
      <div class="search-history-header">
        <span>検索履歴</span>
        <button class="search-history-clear-btn" type="button" id="search-history-clear">すべて削除</button>
      </div>
      ${history.map(q => `
        <div class="search-history-item" data-query="${escapeHtml(q)}">
          <span class="search-history-query">${escapeHtml(q)}</span>
          <button class="search-history-remove" type="button" data-remove="${escapeHtml(q)}" aria-label="削除">×</button>
        </div>
      `).join('')}
    `;
  }
  dropdown.hidden = false;
}

function hideSearchHistory() {
  const dropdown = $('#search-history-dropdown');
  if (dropdown) dropdown.hidden = true;
}

function toggleMobilePanel(panelName) {
  const filters = $('#songs-filter-panel');
  const setlist = $('#setlist-planner');
  if (panelName === 'setlist' && !state.singerMode) {
    filters?.classList.add('is-open');
    setlist?.classList.remove('is-open');
    for (const btn of document.querySelectorAll('[data-mobile-panel-toggle]')) {
      btn.classList.toggle('active', btn.dataset.mobilePanelToggle === 'filters');
    }
    return;
  }
  if (state.singerMode) {
    filters?.classList.add('is-open');
    const target = filters;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    for (const btn of document.querySelectorAll('[data-mobile-panel-toggle]')) {
      btn.classList.toggle('active', btn.dataset.mobilePanelToggle === 'filters');
    }
    return;
  }
  const showSetlist = panelName === 'setlist';
  filters?.classList.toggle('is-open', !showSetlist);
  setlist?.classList.toggle('is-open', showSetlist);
  for (const btn of document.querySelectorAll('[data-mobile-panel-toggle]')) {
    btn.classList.toggle('active', btn.dataset.mobilePanelToggle === panelName);
  }
}

function toggleSetlistPlanner() {
  if (!state.singerMode) return;
  state.setlistExpanded = !state.setlistExpanded;
  renderSetlistPlanner();
  const wrap = $('#setlist-planner');
  if (state.setlistExpanded) {
    wrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function genreLabel(song) {
  return String(song.genre || '未分類').trim() || '未分類';
}

function genreCounts() {
  const counts = new Map();
  for (const song of state.data.songs || []) {
    const genre = genreLabel(song);
    counts.set(genre, (counts.get(genre) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'));
}

function genreExists(genre) {
  return genre === 'all' || genreCounts().some(([name]) => name === genre);
}

function genreOptionsHtml() {
  const options = [`<option value="all">全ジャンル</option>`];
  for (const [genre, count] of genreCounts()) {
    options.push(`<option value="${escapeHtml(genre)}">${escapeHtml(genre)} (${count})</option>`);
  }
  return options.join('');
}

function genreChipsHtml() {
  const chips = [`<button class="genre-chip" type="button" data-genre="all">全ジャンル</button>`];
  for (const [genre, count] of genreCounts()) {
    chips.push(`
      <button class="genre-chip" type="button" data-genre="${escapeHtml(genre)}">
        <span>${escapeHtml(genre)}</span><small>${count}</small>
      </button>
    `);
  }
  return chips.join('');
}

function refreshGenreChips() {
  for (const btn of genreChipsEl.querySelectorAll('[data-genre]')) {
    btn.classList.toggle('active', btn.dataset.genre === state.songsGenre);
  }
}

function refreshFilterButtons() {
  for (const btn of filterButtonsEl.querySelectorAll('[data-filter]')) {
    if (btn.dataset.filter === 'favorites') {
      btn.classList.toggle('primary', state.favoritesFilter);
      btn.classList.toggle('ghost', !state.favoritesFilter);
    } else {
      btn.classList.toggle('primary', btn.dataset.filter === state.songsFilter && !state.favoritesFilter);
      btn.classList.toggle('ghost', btn.dataset.filter !== state.songsFilter || state.favoritesFilter);
    }
  }
}

function refreshSuggestChips() {
  const strip = document.getElementById('search-suggest');
  if (!strip) return;
  const q = (state.songsQuery || '').trim();
  for (const chip of strip.querySelectorAll('[data-suggest]')) {
    chip.classList.toggle('is-active', chip.dataset.suggest === q);
  }
}

function refresh() {
  const { songs } = state.data;
  const genreFiltered = applyGenreFilter(songs, state.songsGenre, genreLabel);
  const modeFiltered = applySingerMode(genreFiltered, {
    singerMode: state.singerMode,
    preset: state.singerPreset,
    keyPublished: state.data?.stats?.keyPublished,
  });
  const tagFiltered = applyTagFilter(modeFiltered, state.songsFilter);
  const { results, tokens } = search(state.songsQuery, tagFiltered);
  let filtered = state.songsQuery.trim()
    ? results.filter(s => tagFiltered.includes(s))
    : tagFiltered;

  if (state.favoritesFilter) {
    filtered = filtered.filter(s => state.favorites.has(s.key));
  }

  filtered = sortSongs(filtered, state.songsSort, !!state.songsQuery.trim());
  currentFiltered = filtered;

  countEl.textContent = `${filtered.length} / ${songs.length}曲`;

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state">該当する曲がありません 🐠</div>`;
    moreBtnWrap.innerHTML = '';
    return;
  }

  const limited = filtered.slice(0, state.songsLimit);
  listEl.classList.toggle('compact', state.songsView === 'compact');
  for (const btn of document.querySelectorAll('[data-singer-preset]')) {
    const active = state.singerMode && state.singerPreset === btn.dataset.singerPreset;
    btn.classList.toggle('primary', active);
    btn.classList.toggle('ghost', !active);
  }
  if ($('#compact-btn')) $('#compact-btn').textContent = `表示: ${state.songsView === 'compact' ? 'コンパクト' : '詳細'}`;
  listEl.innerHTML = limited.map(s => rowHtml(s, tokens)).join('');
  renderSetlistPlanner();

  if (state.songsLimit < filtered.length) {
    moreBtnWrap.innerHTML = `<button class="load-more-btn" id="songs-more">▼ もっと表示 (残り${filtered.length - state.songsLimit}曲)</button>`;
    $('#songs-more').addEventListener('click', () => {
      state.songsLimit += 200;
      refresh();
    });
  } else {
    moreBtnWrap.innerHTML = '';
  }
}

function showTodaysSong() {
  const box = $('#todays-song-box');
  if (!box) return;
  if (!currentFiltered.length) {
    box.hidden = false;
    box.innerHTML = `<div class="empty-state">条件に合う曲がありません 🎲</div>`;
    return;
  }
  const pick = currentFiltered[Math.floor(Math.random() * currentFiltered.length)];
  box.hidden = false;
  box.innerHTML = renderTodaysSongCard(pick);
}

function renderTodaysSongCard(song) {
  const lastHtml = song.lastSung
    ? `${fmtDate(song.lastSung)} · ${song.daysSinceLast}日前`
    : '履歴未確認';
  const keyHtml = song.displayKey
    ? `<span class="todays-song-key">キー ${escapeHtml(song.displayKey)}</span>`
    : '';
  const addButton = state.singerMode
    ? `<button class="btn primary" type="button" data-setlist-action="todays-song-add" data-songkey="${escapeHtml(song.key)}">＋セトリに追加</button>`
    : '';
  return `
    <div class="todays-song-card">
      <div class="todays-song-header">
        <span class="todays-song-label">🎲 今日の一曲</span>
        <button class="todays-song-dismiss" type="button" data-todays-song-dismiss aria-label="閉じる">×</button>
      </div>
      <div class="todays-song-info">
        <div class="todays-song-title">${escapeHtml(song.title)}</div>
        <div class="todays-song-artist">${escapeHtml(song.artist)}</div>
        <div class="todays-song-meta">
          <span class="todays-song-count">${song.count}回</span>
          <span class="todays-song-last">${lastHtml}</span>
          ${keyHtml}
        </div>
      </div>
      <div class="todays-song-actions">
        ${addButton}
        <button class="btn ghost" type="button" data-todays-song-reroll>別のもう一回</button>
      </div>
    </div>
  `;
}

function showRecommendation() {
  const box = $('#recommend-box');
  const pool = sortSongs(
    applySingerMode(applyTagFilter(applyGenreFilter(state.data.songs, 'all', genreLabel), state.songsFilter), {
      singerMode: state.singerMode,
      preset: state.singerPreset,
      keyPublished: state.data?.stats?.keyPublished,
    })
      .filter(song => song.lastSung && (song.displayKey || !state.data.stats.keyPublished)),
    'oldest',
    false
  );
  if (!pool.length) {
    box.hidden = false;
    box.innerHTML = `<div class="empty-state">条件に合うおすすめ候補がありません</div>`;
    return;
  }
  const candidates = pool.slice(0, Math.min(80, pool.length));
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  box.hidden = false;
  box.innerHTML = `
    <div class="recommend-card" data-songkey="${escapeHtml(pick.key)}" data-songtitle="${escapeHtml(pick.title)}" data-songartist="${escapeHtml(pick.artist)}">
      <div>
        <div class="recommend-label">今日の候補</div>
        <strong>${escapeHtml(pick.title)}</strong>
        <span>/ ${escapeHtml(pick.artist)}</span>
      </div>
      <div class="recommend-meta">
        <span>${pick.count}回</span>
        <span>${pick.daysSinceLast ?? '—'}日前</span>
        ${pick.displayKey ? `<span>キー ${escapeHtml(pick.displayKey)}</span>` : ''}
      </div>
      <button class="recommend-dismiss" type="button" data-recommend-dismiss aria-label="おすすめ選曲を閉じる">×</button>
    </div>
  `;
}

function loadSetlist() {
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

function restoreSetlistFromUrl() {
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

function saveSetlist() {
  localStorage.setItem(SETLIST_STORAGE_KEY, JSON.stringify(state.setlist));
}

function songByKey(key) {
  return (state.data.songs || []).find(song => song.key === key) || null;
}

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

function addCustomToSetlist() {
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

function handleSetlistAction(action) {
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
  const pool = (currentFiltered.length ? currentFiltered : state.data.songs)
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

function setlistBalance(items) {
  const topCounts = (fn) => {
    const map = new Map();
    for (const item of items) {
      for (const value of fn(item)) {
        if (!value) continue;
        map.set(value, (map.get(value) || 0) + 1);
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  };
  return {
    genres: topCounts(item => [item.genre || '未分類']),
    moods: topCounts(item => item.moodTags || []),
    keys: items.filter(item => item.displayKey).length,
    stale: items.filter(item => item.daysSinceLast >= 180).length,
  };
}

function renderSetlistPlanner(message = '') {
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
               type="text" placeholder="🔍 曲名を入力して追加…" autocomplete="off" spellcheck="false">
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
      ${items.length ? items.map((item, i) => setlistItemHtml(item, i)).join('') : '<div class="setlist-empty">曲の「＋セトリ」かランダム追加から作れます</div>'}
    </div>
    <div class="setlist-actions">
      <select id="setlist-copy-format" class="select-input">
        <option value="simple"${state.setlist.copyFormat === 'simple' ? ' selected' : ''}>曲名 / アーティスト</option>
        <option value="timestamp"${state.setlist.copyFormat === 'timestamp' ? ' selected' : ''}>タイムスタンプ入力用</option>
      </select>
      <button class="btn ghost" type="button" data-setlist-action="random">ランダム追加</button>
      <button class="btn primary" type="button" data-setlist-action="copy">コピー</button>
      <button class="btn ghost" type="button" data-setlist-action="share">🔗 共有</button>
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
      <div class="setlist-drag-handle" title="ドラッグして並び替え" aria-label="ドラッグハンドル">⠿</div>
      <div class="setlist-no">${index + 1}</div>
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
          <span class="setlist-dd-plus">＋</span>
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
            <span class="setlist-dd-icon">🎵</span>
            <div class="setlist-dd-body">
              <div class="setlist-dd-title">${escapeHtml(s.title)}</div>
              <div class="setlist-dd-meta">${escapeHtml(s.artist || '—')} · ${s.count}回</div>
            </div>
          </div>`).join('') +
        `<div class="setlist-dd-item setlist-dd-new" data-dd-idx="${matched.length}">
          <span class="setlist-dd-plus">＋</span>
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

function initSetlistDrag() {
  if (_dragCleanup) { _dragCleanup(); _dragCleanup = null; }

  const listEl = document.querySelector('.setlist-items');
  if (!listEl) return;

  let src = null;
  let srcIndex = -1;
  let ghost = null;
  let offsetY = 0;
  let lastOver = null;

  function onMove(e) {
    if (!src) return;
    const srcRect = src.getBoundingClientRect();
    ghost.style.top  = `${e.clientY - offsetY}px`;
    ghost.style.left = `${srcRect.left}px`;
    ghost.style.width = `${srcRect.width}px`;

    // ゴーストを一時的に非表示にして下の要素を取得
    ghost.style.visibility = 'hidden';
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    ghost.style.visibility = '';

    const target = elUnder?.closest('.setlist-item:not(.is-dragging)');
    if (lastOver !== target) {
      lastOver?.classList.remove('drag-over');
      target?.classList.add('drag-over');
      lastOver = target;
    }
  }

  function finalize(e) {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', finalize);
    document.removeEventListener('pointercancel', cancel);

    const destIndex = lastOver ? Number(lastOver.dataset.index) : -1;
    ghost?.remove(); ghost = null;
    src?.classList.remove('is-dragging');
    lastOver?.classList.remove('drag-over');

    const savedSrc = srcIndex;
    src = null; srcIndex = -1; lastOver = null;

    if (destIndex !== -1 && destIndex !== savedSrc) {
      const items = state.setlist.items;
      const [moved] = items.splice(savedSrc, 1);
      const adj = destIndex > savedSrc ? destIndex - 1 : destIndex;
      items.splice(adj, 0, moved);
      saveSetlist();
      renderSetlistPlanner();
    }
  }

  function cancel() {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', finalize);
    document.removeEventListener('pointercancel', cancel);
    ghost?.remove(); ghost = null;
    src?.classList.remove('is-dragging');
    lastOver?.classList.remove('drag-over');
    src = null; srcIndex = -1; lastOver = null;
  }

  listEl.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.setlist-drag-handle')) return;
    const item = e.target.closest('.setlist-item');
    if (!item) return;
    e.preventDefault();

    src = item;
    srcIndex = Number(item.dataset.index);
    const rect = item.getBoundingClientRect();
    offsetY = e.clientY - rect.top;

    // ゴースト生成
    ghost = item.cloneNode(true);
    ghost.className = ghost.className + ' setlist-drag-ghost';
    Object.assign(ghost.style, {
      position: 'fixed',
      top:  `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      pointerEvents: 'none',
      zIndex: '9999',
    });
    document.body.appendChild(ghost);
    item.classList.add('is-dragging');

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', finalize);
    document.addEventListener('pointercancel', cancel);
  });

  _dragCleanup = cancel;
}

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

function rowHtml(song, tokens) {
  const rankClass = song.rank === 1 ? 'r1' : song.rank === 2 ? 'r2' : song.rank === 3 ? 'r3' : '';
  const lastHtml = song.lastSung
    ? `<span class="last-date">${fmtDate(song.lastSung)}</span><span class="badge ${daysClass(song.daysSinceLast)}">${song.daysSinceLast}日前</span>`
    : `<span class="last-date">履歴未確認</span><span class="badge never">要確認</span>`;
  const titleHtml = highlightText(song.title, tokens);
  const artistHtml = highlightText(song.artist, tokens);
  const reasons = matchReasons(song, state.songsQuery);
  const favActive = isFavorite(song.key);
  return `
    <div class="song-row" data-songkey="${escapeHtml(song.key)}" data-songtitle="${escapeHtml(song.title)}" data-songartist="${escapeHtml(song.artist)}" title="クリックで曲詳細を表示">
      <div class="rank ${rankClass}">${song.rank}</div>
      <div class="info">
        <div class="title song-title-line"><span class="song-title-text">${titleHtml}</span><button class="fav-btn ${favActive ? 'is-active' : ''}" type="button" data-fav-toggle="${escapeHtml(song.key)}" aria-label="お気に入り" aria-pressed="${favActive ? 'true' : 'false'}" title="お気に入り">${favActive ? '♥' : '♡'}</button></div>
        <button class="artist artist-search-btn" type="button" data-artist-search="${escapeHtml(song.artist)}">${artistHtml}</button>
        <div class="song-meta-line">
          <span class="genre-badge">${escapeHtml(genreLabel(song))}</span>
          ${tagBadges(song)}
          ${reasons.map(reason => `<span class="match-badge">${escapeHtml(reason)}一致</span>`).join('')}
        </div>
        ${keyHtml(song)}
      </div>
      <div class="song-row-side">
        <div class="count">${song.count}<small>回</small></div>
        <div class="last">${lastHtml}</div>
      </div>
    </div>
  `;
}

function updateSetlistToggle() {
  const btn = $('#setlist-toggle-btn');
  if (!btn) return;
  const items = state.setlist.items.length;
  btn.setAttribute('aria-expanded', state.setlistExpanded ? 'true' : 'false');
  btn.textContent = state.setlistExpanded
    ? `セトリ制作を閉じる${items ? ` (${items})` : ''}`
    : `セトリ制作を開く${items ? ` (${items})` : ''}`;
}

function tagBadges(song) {
  const tags = [
    ...(song.seasonTags || []).map(tag => ({ tag, type: 'season' })),
    ...(song.moodTags || []).map(tag => ({ tag, type: 'mood' })),
    ...(state.singerMode ? (song.singerTags || []).map(tag => ({ tag, type: 'tag' })) : []),
  ].slice(0, state.songsView === 'compact' ? 2 : 5);
  return tags.map(({ tag, type }) => `
    <button class="tag-badge tag-click" type="button" data-tag-type="${type}" data-tag-search="${escapeHtml(tag)}">${escapeHtml(tag)}</button>
  `).join('');
}

function keyHtml(song) {
  if (!state.singerMode) return '';
  const addButton = `<button class="setlist-add-btn" type="button" data-setlist-action="add" data-songkey="${escapeHtml(song.key)}">＋セトリ</button>`;
  if (!state.data?.stats?.keyPublished) {
    return `<div class="song-key-line song-key-actions">${addButton}</div>`;
  }
  const key = String(song.displayKey || '').trim();
  if (!key) {
    return `<div class="song-key-line song-key-actions"><span class="song-key-empty">キー未登録</span>${addButton}</div>`;
  }
  return `
    <div class="song-key-line song-key-actions">
      <button type="button" class="song-key-badge" title="統合集計 T/U列のキー">
        <span>キー</span><strong>${escapeHtml(key)}</strong>
      </button>
      ${addButton}
    </div>
  `;
}
