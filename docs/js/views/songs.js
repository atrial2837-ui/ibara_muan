import { state, toggleFavorite, isFavorite } from '../store.js';
import { ensureSongsTags } from '../tagging.js';
import { $, escapeHtml, fmtDate, daysClass, debounce, highlightText } from '../utils.js';
import { search, matchReasons, getSearchHistory, addSearchHistory, removeSearchHistory, clearSearchHistory } from '../search.js';
import { writeUrlState } from '../url-state.js';
import { applyGenreFilter, applyTagFilter, applySingerMode, sortSongs } from '../domain-compat.js';
import { icon } from '../icons.js';
import {
  initSetlistPlanner,
  loadSetlist,
  restoreSetlistFromUrl,
  saveSetlist,
  renderSetlistPlanner,
  handleSetlistAction,
  addCustomToSetlist,
  toggleSetlistPlanner,
  updateSetlistToggle,
} from './songs/setlist-planner.js';

let searchInputEl, sortSelectEl, genreSelectEl, filterButtonsEl, genreChipsEl, listEl, countEl, moreBtnWrap;
let searchHistoryDropdown = null;
let currentFiltered = [];

// ── 無限スクロール（IntersectionObserver） ────────────────────────────────
let _infiniteObserver = null;

function _disconnectInfinite() {
  if (_infiniteObserver) {
    _infiniteObserver.disconnect();
    _infiniteObserver = null;
  }
}

function _setupInfinite(total) {
  _disconnectInfinite();
  if (state.songsLimit >= total) return; // 全件表示済み

  // センチネル要素を moreBtnWrap の中に埋め込む
  const sentinel = document.getElementById('songs-infinite-sentinel');
  if (!sentinel) return;

  _infiniteObserver = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    state.songsLimit += 100;
    refresh();
  }, { rootMargin: '200px' });

  _infiniteObserver.observe(sentinel);
}

export function renderSongs() {
  _disconnectInfinite(); // タブ再描画時にリーク防止
  initSetlistPlanner({
    getCandidatePool: () => (currentFiltered.length ? currentFiltered : (state.data?.songs || [])),
  });
  loadSetlist();
  restoreSetlistFromUrl();
  ensureSongsTags(state.data?.songs || []);
  const panel = $('#panel-songs');
  panel.innerHTML = `
    <div class="section-header">
      <h2>${state.singerMode ? `${icon('mic')} 選曲ボード` : `${icon('music')} 全曲リスト`}</h2>
      <span class="count-pill" id="songs-count">—</span>
    </div>
    <div id="songs-filter-panel" class="mobile-panel mobile-panel-filters is-open">
      <div class="songs-search-shell">
        <div class="search-input-wrap">
          <span class="songs-search-icon" aria-hidden="true">${icon('search')}</span>
          <input id="songs-search" class="text-input songs-search-input" type="search" placeholder="曲名・アーティスト・雰囲気で検索" value="${escapeHtml(state.songsQuery)}">
          <div id="search-history-dropdown" class="search-history-dropdown" hidden></div>
        </div>
        <button class="songs-fav-toggle ${state.favoritesFilter ? 'is-active' : ''}" type="button" data-filter="favorites" aria-pressed="${state.favoritesFilter ? 'true' : 'false'}" aria-label="お気に入りだけ表示" data-tooltip="お気に入りだけ表示">${icon('heart')}</button>
        ${state.singerMode ? '<button class="songs-setlist-mini btn primary" id="setlist-toggle-btn" type="button" aria-controls="setlist-planner" aria-expanded="' + (state.setlistExpanded ? 'true' : 'false') + '">' + (state.setlistExpanded ? 'セトリを閉じる' : 'セトリ制作') + '</button>' : ''}
      </div>
      <!-- 雰囲気サジェストチップ（常時表示・8種のみ） -->
      <div id="search-suggest" class="suggest-strip songs-suggest-strip" role="group" aria-label="雰囲気で素早く検索">
        ${[
          ['chill', 'チルな曲'],
          ['あつい', 'あつい曲'],
          ['しっとり', 'しっとり'],
          ['エモい', 'エモい'],
          ['かわいい', 'かわいい'],
        ].map(([label, q]) => `<button type="button" class="suggest-chip" data-suggest="${escapeHtml(q)}">${label}</button>`).join('')}
      </div>
      <details class="songs-advanced">
        <summary>
          <span>絞り込み</span>
          <small>並び順・ジャンル・状態</small>
        </summary>
        <div class="songs-advanced-body">
          <div class="controls songs-control-grid">
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
      <!-- 絞り込みボタン行 -->
      <div class="controls songs-filter-row" id="songs-filters">
        <button class="btn ghost" data-filter="all">すべて</button>
        <button class="btn ghost" data-filter="fresh">🟢 最近</button>
        <button class="btn ghost" data-filter="stale">🟠 久しぶり</button>
        <button class="btn ghost" data-filter="never">⚪ 未確認</button>
        <button class="btn ghost songs-favorites-filter" data-filter="favorites">${icon('heart')} お気に入り</button>
        ${state.singerMode ? '' : `<button class="btn ghost" id="recommend-btn" type="button">${icon('lightbulb')} おすすめ</button><button class="btn ghost" id="todays-song-btn" type="button">${icon('dice')} 今日の一曲</button>`}
      </div>
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
          <button class="btn ghost" id="todays-song-btn" type="button">${icon('dice')} 今日の一曲</button>
        </div>
      ` : ''}
          <div class="genre-strip" id="songs-genre-chips">${genreChipsHtml()}</div>
        </div>
      </details>
    </div>
    ${state.singerMode ? '<div id="setlist-planner" class="setlist-planner mobile-panel mobile-panel-setlist"></div>' : ''}
    <div id="todays-song-box" class="todays-song-box" hidden></div>
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
  panel.querySelector('.songs-fav-toggle')?.addEventListener('click', () => {
    state.favoritesFilter = !state.favoritesFilter;
    if (state.favoritesFilter) state.songsFilter = 'all';
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
      favBtn.innerHTML = icon('heart');
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
  const favToggle = document.querySelector('.songs-fav-toggle');
  if (favToggle) {
    favToggle.classList.toggle('is-active', state.favoritesFilter);
    favToggle.setAttribute('aria-pressed', String(state.favoritesFilter));
    favToggle.innerHTML = icon('heart');
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
    moreBtnWrap.innerHTML = `
      <div id="songs-infinite-sentinel" style="height:1px;width:100%;"></div>
      <button class="load-more-btn" id="songs-more">▼ もっと表示 (残り${filtered.length - state.songsLimit}曲)</button>
    `;
    $('#songs-more').addEventListener('click', () => {
      state.songsLimit += 200;
      refresh();
    });
    // センチネルが DOM に挿入された後に observer を設定
    _setupInfinite(filtered.length);
  } else {
    _disconnectInfinite();
    moreBtnWrap.innerHTML = '';
  }
}

function showTodaysSong() {
  const box = $('#todays-song-box');
  if (!box) return;
  if (!currentFiltered.length) {
    box.hidden = false;
    box.innerHTML = `<div class="empty-state">条件に合う曲がありません</div>`;
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
  const keyHtml = String(song.displayKey || '').split(',').map(k => k.trim()).filter(Boolean)
    .map(k => `<span class="todays-song-key">キー ${escapeHtml(k)}</span>`).join('');
  const addButton = state.singerMode
    ? `<button class="btn primary" type="button" data-setlist-action="todays-song-add" data-songkey="${escapeHtml(song.key)}">${icon('plus')} セトリに追加</button>`
    : '';
  return `
    <div class="todays-song-card">
      <div class="todays-song-header">
        <span class="todays-song-label">${icon('dice')} 今日の一曲</span>
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
        ${String(pick.displayKey || '').split(',').map(k => k.trim()).filter(Boolean).map(k => `<span>キー ${escapeHtml(k)}</span>`).join('')}
      </div>
      <button class="recommend-dismiss" type="button" data-recommend-dismiss aria-label="おすすめ選曲を閉じる">×</button>
    </div>
  `;
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
        <div class="title song-title-line"><span class="song-title-text">${titleHtml}</span><button class="fav-btn ${favActive ? 'is-active' : ''}" type="button" data-fav-toggle="${escapeHtml(song.key)}" aria-label="お気に入り" aria-pressed="${favActive ? 'true' : 'false'}" data-tooltip="お気に入り">${icon('heart')}</button></div>
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
  const addButton = `<button class="setlist-add-btn" type="button" data-setlist-action="add" data-songkey="${escapeHtml(song.key)}">${icon('plus')} セトリ</button>`;
  if (!state.data?.stats?.keyPublished) {
    return `<div class="song-key-line song-key-actions">${addButton}</div>`;
  }
  const keys = String(song.displayKey || '').split(',').map(k => k.trim()).filter(Boolean);
  if (!keys.length) {
    return `<div class="song-key-line song-key-actions"><span class="song-key-empty">キー未登録</span>${addButton}</div>`;
  }
  const badges = keys.map(k => `<button type="button" class="song-key-badge" data-tooltip="配信で使われた参考キー"><span>キー</span><strong>${escapeHtml(k)}</strong></button>`).join('');
  return `<div class="song-key-line song-key-actions">${badges}${addButton}</div>`;
}
