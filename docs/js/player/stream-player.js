// ストリームビューワー / ミニプレイヤー / YouTube IFrame API 管理のプレイヤーサブシステム。
// main.js から P3 で機械的に移動(挙動不変)。シェル機能(activateTab 等)は
// initPlayerShell() で注入され、このモジュールから main.js への import は存在しない。
import { state } from '../store.js';
import { $, $$, escapeHtml, fmtDate, streamKey, youtubeThumb, youtubeThumbTiny, youtubeVideoId } from '../utils.js';
import { readUrlState, writeUrlState } from '../url-state.js';
import { icon } from '../icons.js';
import { _matchSongIdx, _normForMatch, _parseTs, _parseTsCommentLine } from './timestamps/parser.js';

// ─── playerMode 状態機械 ─────────────────────────────────────────────────────
// 再生サブシステムの表示状態を activeTab(URLルート)から分離して一元管理する。
// idle: 非表示 / embedded: ビューワー埋め込み / fullscreen: ビューワー全画面
// mini: ミニプレイヤー(ビューワー退避 or インライン再生) / music-bar: 音楽バー退避
let _playerMode = 'idle';
const _MODE_TRANSITIONS = {
  idle: ['embedded', 'mini'],
  embedded: ['fullscreen', 'mini', 'music-bar', 'idle'],
  fullscreen: ['embedded', 'idle'],
  mini: ['embedded', 'idle'],
  'music-bar': ['embedded', 'idle'],
};
export function getPlayerMode() { return _playerMode; }

// グローバルキー操作(Space/←→)のうちビューワー再生操作を処理する。消費したら true。
// シェルが YT.Player・共有モーダル DOM に直接触れないための公開 API。
export function handleViewerKeyboard(key) {
  if (!['embedded', 'fullscreen'].includes(_playerMode)) return false;
  if ($('#sv-share-modal')?.hidden === false) return false;
  if (!_svPlayer) return false;
  if (key === ' ') {
    try {
      const st = _svPlayer.getPlayerState?.();
      if (st === window.YT?.PlayerState?.PLAYING) _svPlayer.pauseVideo();
      else _svPlayer.playVideo();
    } catch (_) {}
    return true;
  }
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    try {
      const cur = _svPlayer.getCurrentTime?.() ?? 0;
      _svPlayer.seekTo(Math.max(0, cur + (key === 'ArrowRight' ? 10 : -10)), true);
    } catch (_) {}
    return true;
  }
  return false;
}
function _setPlayerMode(next) {
  if (next === _playerMode) return;
  if (!_MODE_TRANSITIONS[_playerMode]?.includes(next)) {
    console.warn(`[player] 不正なモード遷移: ${_playerMode} → ${next}`);
  }
  _playerMode = next;
}
import { _saveWatchEntry, _saveWatchEntryThrottled } from './watch-history.js';
import { getPlaylists } from './playlists-store.js';
import { fetchCommunityTimestamps, submitCommunityTimestamp } from './timestamps/repository.js';
import { _svBuildShareUrl, _youtubeExternalUrl } from './share-url.js';

// ─── プレイヤー→シェル依存の注入点 ──────────────────────────────────────────
// P3 でプレイヤーをモジュール分離する際に player 側から main.js を import しない
// ための境界。シェル機能は起動時に initPlayerShell() で注入される。
let _shellDeps = null;

export function initPlayerShell(deps) { _shellDeps = deps; }

// シェル側からプレイヤー内部変数(_epPrevTab / _pendingTabOptions)へ書き込むための setter
export function _epSetPrevTab(tab) { _epPrevTab = tab; }

export function _epSetPendingTabOptions(options) { _pendingTabOptions = options; }

function _isResponsivePlaybackDisabled() {
  return window.matchMedia('(max-width: 700px)').matches;
}

// ─── ミニプレイヤー 進捗バー ──────────────────────────────────────────────────

function _miniStopProgress() {
  if (_miniProgressInterval) { clearInterval(_miniProgressInterval); _miniProgressInterval = null; }
}

function _miniStartProgress() {
  _miniStopProgress();
  _miniProgressInterval = setInterval(() => {
    _syncMiniPos(); // ミニ化中の座標ずれを常時補正（非ミニ化時は no-op）
    if (!_miniPlayer) return;
    try {
      const dur = _miniPlayer.getDuration?.() || 0;
      const cur = _miniPlayer.getCurrentTime?.() || 0;
      if (_svLastStream) _saveWatchEntryThrottled(_svLastStream, cur); // 視聴履歴
      const pct = dur > 0 ? Math.min((cur / dur) * 100, 100) : 0;
      const fill = $('#yt-mini-progress-fill');
      if (fill) fill.style.width = `${pct}%`;
      const st = _miniPlayer.getPlayerState?.();
      const isPlaying = st === window.YT?.PlayerState?.PLAYING;
      const playBtn = $('#yt-mini-play');
      if (playBtn) playBtn.setAttribute('data-playing', isPlaying ? '1' : '0');
    } catch (_) {}
  }, 400);
}

function _miniDestroyPlayer() {
  _miniStopProgress();
  if (_miniPlayer) { try { _miniPlayer.destroy(); } catch (_) {} _miniPlayer = null; }
  const container = $('#yt-player-container');
  if (container) container.innerHTML = '';
}

// ─── ミニプレイヤー 復帰 ─────────────────────────────────────────────────────

function _miniResumeAt() {
  if (_miniPlayer?.getCurrentTime) {
    try { return _miniPlayer.getCurrentTime(); } catch (_) {}
  }
  return Math.max(0, _svMiniStartAt + (Date.now() - _svMiniStartWallTime) / 1000);
}

function _svIsDocked(viewer = $('#stream-viewer')) {
  return !!viewer && (
    viewer.classList.contains('sv-minified') ||
    viewer.classList.contains('sv-music-minified')
  );
}

// ─── ストリームビューワーのミニ化 ────────────────────────────────────────────
// iframe を作り直すと読み込み+バッファで数秒のラグが出るため、プレイヤーは
// 破棄せず CSS でミニパネルの動画エリア位置に固定表示する（全画面と同じ
// DOM 非移動テクニック）。音声・映像ともに一切途切れない。

/** ミニ化中の動画ラップをミニパネルの動画エリアに重ねる（座標同期） */
function _syncMiniPos() {
  const viewer = $('#stream-viewer');
  if (!_svIsDocked(viewer)) return;
  const wrap = $('#sv-player-wrap');
  const target = viewer.classList.contains('sv-music-minified')
    ? document.querySelector('#music-bar .mbar-video-wrap')
    : document.querySelector('#yt-player-panel .yt-mini-video-wrap');
  if (!wrap || !target) return;
  const r = target.getBoundingClientRect();
  wrap.style.left = `${r.left}px`;
  wrap.style.top = `${r.top}px`;
  wrap.style.width = `${r.width}px`;
  wrap.style.height = `${r.height}px`;
}

/** ビューワー → ミニ化（プレイヤーをそのままミニ側コントロールに引き継ぐ） */
function _svMinify() {
  const viewer = $('#stream-viewer');
  const stream = viewer?._currentStream;
  if (!viewer || !stream || !_svPlayer) return false;
  initYouTubePlayer();
  const panel = $('#yt-player-panel');
  if (!panel) return false;

  _svLastStream = stream;
  try { _svMiniStartAt = Math.floor(_svPlayer.getCurrentTime?.() ?? 0); } catch (_) { _svMiniStartAt = 0; }
  _svMiniStartWallTime = Date.now();

  const titleEl = $('#yt-mini-title');
  if (titleEl) titleEl.textContent = stream.title || '';
  const hintEl = $('#yt-mini-hint');
  if (hintEl) hintEl.innerHTML = `${icon('chevronUp')} タップして配信ビューワーへ戻る`;
  panel.classList.add('has-stream');
  panel.hidden = false;

  // プレイヤーインスタンスごと引き継ぐ（iframe は DOM 移動しない＝リロードなし）
  _miniPlayer = _svPlayer;
  _svPlayer = null;

  viewer.classList.add('sv-minified');
  document.body.classList.add('has-sv-mini');
  document.body.style.overflow = '';

  _setPlayerMode('mini');
  hidePlayerPanel();
  _svUpdateUrl();

  // タブ切替直後のリフローやアニメーションで座標がずれるため多段同期
  _syncMiniPos();
  requestAnimationFrame(_syncMiniPos);
  setTimeout(_syncMiniPos, 120);
  setTimeout(_syncMiniPos, 400);
  window.addEventListener('resize', _syncMiniPos);
  _miniStartProgress();
  try {
    const st = _miniPlayer.getPlayerState?.();
    $('#yt-mini-play')?.setAttribute('data-playing', st === window.YT?.PlayerState?.PLAYING ? '1' : '0');
  } catch (_) {}
  _applyVol($('#yt-mini-vol-slider'), $('#yt-mini-vol-btn'), null, _storedVol());
  return true;
}

/** ミニ化 → ビューワー復帰（こちらもリロードなし） */
function _svUnminify() {
  const viewer = $('#stream-viewer');
  if (!viewer?.classList.contains('sv-minified')) return false;
  window.removeEventListener('resize', _syncMiniPos);
  _miniStopProgress();
  viewer.classList.remove('sv-minified');
  document.body.classList.remove('has-sv-mini');
  const wrap = $('#sv-player-wrap');
  if (wrap) wrap.style.cssText = '';
  _svPlayer = _miniPlayer;
  _miniPlayer = null;
  const panel = $('#yt-player-panel');
  if (panel) panel.hidden = true;
  showPlayerPanel();
  _svUpdateUrl();
  setTimeout(() => { $('#sv-close')?.focus({ preventScroll: true }); }, 50);
  return true;
}

function _svRestoreFromMusicBar() {
  const viewer = $('#stream-viewer');
  if (!viewer?.classList.contains('sv-music-minified')) return false;
  window.removeEventListener('resize', _syncMiniPos);
  _miniStopProgress();
  viewer.classList.remove('sv-music-minified');
  document.body.classList.remove('has-sv-music');
  const wrap = $('#sv-player-wrap');
  if (wrap) wrap.style.cssText = '';
  _svPlayer = _miniPlayer;
  _miniPlayer = null;
  showPlayerPanel();
  _svUpdateUrl();
  setTimeout(() => { $('#sv-close')?.focus({ preventScroll: true }); }, 50);
  return true;
}

function _svDiscardMusicBar() {
  const viewer = $('#stream-viewer');
  if (!viewer?.classList.contains('sv-music-minified')) return false;
  window.removeEventListener('resize', _syncMiniPos);
  _miniStopProgress();
  _svStopEndedWatch();
  ++_svGen;
  viewer.classList.remove('sv-music-minified');
  document.body.classList.remove('has-sv-music');
  viewer.hidden = true;
  viewer._currentStream = null;
  const wrap = $('#sv-player-wrap');
  if (wrap) { wrap.style.cssText = ''; wrap.innerHTML = ''; }
  _miniDestroyPlayer();
  _svLastStream = null;
  _setPlayerMode('idle');
  _svUpdateUrl();
  return true;
}

/** ビューワー → 音楽プレイヤーバーへ移動（現在位置を引き継ぐ） */
function _svMoveToMusicBar() {
  const viewer = $('#stream-viewer');
  const stream = viewer?._currentStream;
  if (!viewer || viewer.hidden || !stream?.url) return;
  const t = _svCurrentTime(readUrlState().t);
  const musicTrack = {
    ...stream,
    title: stream.title || (stream.isMv ? '動画' : '歌枠'),
    type: stream.isMv ? (stream.type || 'original') : 'stream',
    sub: stream.isMv
      ? (stream.originalArtist || stream.character || stream.sub || '')
      : `${fmtDate(stream.date)} 第${stream.index}枠`,
    _stream: stream,
  };

  if (!_svPlayer) {
    // YT API ready 前に移譲すると、ビューワー側の待機中コールバックも後で走って
    // プレイヤーが二重生成されるため、待機を無効化しビューワーを閉じてから
    // 生成権を音楽バーへ渡す
    ++_svGen;
    _svStopEndedWatch();
    // 全画面はプレイヤー生成前でも入れるため、全画面状態も併せて解除する
    _svFullscreen = false;
    viewer.classList.remove('sv-fullscreen');
    document.body.classList.remove('has-sv-fullscreen');
    $('#sv-fullscreen-btn')?.setAttribute('aria-pressed', 'false');
    viewer.hidden = true;
    viewer._currentStream = null;
    const wrap = $('#sv-player-wrap');
    if (wrap) wrap.innerHTML = '';
    document.body.style.overflow = '';
    _svLastStream = null;
    _setPlayerMode('idle');
    _shellDeps.setSidebarHidden(false); // サイドバーは常時表示
    hidePlayerPanel();
    _svUpdateUrl();
    // ビューワーを閉じた後に再生要求が消えないよう、bridge の登録完了を待ってから移譲する
    _ensureMusicBridge().then(b => b?.playVideo?.(musicTrack, t));
    return;
  }

  try { _svMiniStartAt = Math.floor(_svPlayer.getCurrentTime?.() ?? t); } catch (_) { _svMiniStartAt = t; }
  _svMiniStartWallTime = Date.now();
  _miniPlayer = _svPlayer;
  _svPlayer = null;
  _svLastStream = null;
  _svFullscreen = false;
  viewer.classList.remove('sv-fullscreen', 'sv-minified');
  _setPlayerMode('music-bar');
  viewer.classList.add('sv-music-minified');
  document.body.classList.remove('has-sv-fullscreen', 'has-sv-mini');
  document.body.classList.add('has-sv-music');
  document.body.style.overflow = '';
  viewer.hidden = false;

  const panel = $('#yt-player-panel');
  if (panel) panel.hidden = true;
  hidePlayerPanel();
  _svUpdateUrl();
  _syncMiniPos();
  requestAnimationFrame(_syncMiniPos);
  setTimeout(_syncMiniPos, 120);
  setTimeout(_syncMiniPos, 400);
  window.addEventListener('resize', _syncMiniPos);
  _miniStartProgress();

  _musicBridge?.adoptExternalPlayer?.(musicTrack, _miniPlayer, {
    restore: _svRestoreFromMusicBar,
    close: _svDiscardMusicBar,
  });
  _syncMiniPos();
  requestAnimationFrame(_syncMiniPos);
  setTimeout(_syncMiniPos, 120);
  setTimeout(_syncMiniPos, 400);
}

/** ミニ化状態を完全破棄（別動画を開く・ミニを閉じる時） */
function _svDiscardMini() {
  const viewer = $('#stream-viewer');
  if (viewer?.classList.contains('sv-music-minified')) return _svDiscardMusicBar();
  if (!viewer?.classList.contains('sv-minified')) return false;
  window.removeEventListener('resize', _syncMiniPos);
  _svStopEndedWatch();
  ++_svGen;
  viewer.classList.remove('sv-minified');
  document.body.classList.remove('has-sv-mini');
  viewer.hidden = true;
  viewer._currentStream = null;
  const wrap = $('#sv-player-wrap');
  if (wrap) { wrap.style.cssText = ''; wrap.innerHTML = ''; }
  _miniDestroyPlayer();
  const panel = $('#yt-player-panel');
  if (panel) panel.hidden = true;
  _svLastStream = null;
  _setPlayerMode('idle');
  _shellDeps.setSidebarHidden(false); // サイドバーは常時表示
  _svUpdateUrl();
  return true;
}

// ─── ビューワーの URL 同期・共有 ─────────────────────────────────────────────

let _svUrlTimer = null; // 視聴中に再生位置を URL へ定期反映するタイマー

function _svCurrentTime(fallback = 0) {
  const players = [_svPlayer, _miniPlayer];
  for (const player of players) {
    try {
      const value = player?.getCurrentTime?.();
      if (Number.isFinite(value)) return Math.max(0, Math.floor(value));
    } catch (_) {}
  }
  return Math.max(0, Math.floor(Number(fallback) || 0));
}

/** ビューワーの表示状態を URL の ?v= / ?t= に反映する。
 *  視聴中は 5 秒ごとに再生位置も更新するため、リロードしても続きから再生できる */
function _svUpdateUrl() {
  const viewer = $('#stream-viewer');
  const open = viewer && !viewer.hidden && !_svIsDocked(viewer);
  const id = open && viewer._currentStream?.url ? youtubeVideoId(viewer._currentStream.url) : '';
  const t = id ? _svCurrentTime(readUrlState().t) : 0;
  writeUrlState({ v: id || '', t: t > 5 ? t : 0 }, { replace: true });
  if (id) _saveWatchEntry(viewer._currentStream, t); // 視聴履歴（続きから見る）
  if (id && !_svUrlTimer) _svUrlTimer = setInterval(_svUpdateUrl, 5000);
  if (!id && _svUrlTimer) { clearInterval(_svUrlTimer); _svUrlTimer = null; }
}

/** 現在の動画・再生位置の共有 URL を生成 */
function _svShareUrl() {
  const viewer = $('#stream-viewer');
  const stream = viewer?._currentStream;
  if (!stream?.url) return null;
  const id = youtubeVideoId(stream.url);
  if (!id) return null;
  const t = _svCurrentTime(readUrlState().t);
  return { url: _svBuildShareUrl(id, t), title: stream.title || '' };
}

// ─── 共有モーダル ────────────────────────────────────────────────────────────

function _svInitShareModal() {
  if ($('#sv-share-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'sv-share-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="sv-share-backdrop"></div>
    <div class="sv-share-dialog" role="dialog" aria-modal="true" aria-label="動画を共有">
      <div class="sv-share-head">
        <span class="sv-share-head-icon">${icon('heart')}</span>
        <span class="sv-share-head-title">この歌枠をおすそわけ</span>
        <button class="sv-share-close" id="sv-share-close" type="button" aria-label="閉じる">${icon('close')}</button>
      </div>
      <div class="sv-share-charm" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="sv-share-video">
        <span class="sv-share-video-icon">${icon('music')}</span>
        <span class="sv-share-video-title" id="sv-share-video-title"></span>
      </div>
      <label class="sv-share-ts" id="sv-share-ts-row">
        <input type="checkbox" id="sv-share-ts-check">
        <span class="sv-share-ts-toggle" aria-hidden="true"></span>
        <span class="sv-share-ts-text"><strong id="sv-share-ts-label">0:00</strong> から聴いてもらう</span>
      </label>
      <div class="sv-share-url-row">
        <input class="sv-share-url" id="sv-share-url" type="text" readonly aria-label="共有リンク">
        <button class="sv-share-copy" id="sv-share-copy" type="button">リンクをコピー</button>
      </div>
      <div class="sv-share-sns">
        <a class="sv-share-sns-btn sv-share-x" id="sv-share-x" href="#" target="_blank" rel="noopener">Xにのせる</a>
        <a class="sv-share-sns-btn sv-share-line" id="sv-share-line" href="#" target="_blank" rel="noopener">LINEで送る</a>
        <button class="sv-share-sns-btn sv-share-native" id="sv-share-native" type="button" hidden>ほかにも共有</button>
      </div>
      <div class="sv-share-foot">好きなところから、そっと届けられます</div>
    </div>`;
  document.body.appendChild(modal);

  const close = () => { modal.hidden = true; };
  modal.querySelector('.sv-share-backdrop').addEventListener('click', close);
  $('#sv-share-close').addEventListener('click', close);
  // Esc は capture で先取りし、ビューワー側の Esc 処理（閉じる）を抑止する
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }, { capture: true });

  const rebuild = () => {
    const st = modal._shareState;
    if (!st) return;
    const useT = $('#sv-share-ts-check')?.checked && st.t > 0;
    const url = _svBuildShareUrl(st.id, st.t, { includeTime: useT });
    const input = $('#sv-share-url');
    if (input) input.value = url;
    const text = st.title ? `${st.title}` : '茨むあん 歌唱データベース';
    const x = $('#sv-share-x');
    if (x) x.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    const line = $('#sv-share-line');
    if (line) line.href = `https://line.me/R/share?text=${encodeURIComponent(`${text}\n${url}`)}`;
    return url;
  };
  $('#sv-share-ts-check').addEventListener('change', rebuild);
  modal._rebuild = rebuild;

  $('#sv-share-url').addEventListener('focus', (e) => e.target.select());

  $('#sv-share-copy').addEventListener('click', async () => {
    const url = $('#sv-share-url')?.value;
    if (!url) return;
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; }
    catch (_) {
      try {
        const input = $('#sv-share-url');
        input.select();
        ok = document.execCommand('copy');
      } catch (_) {}
    }
    const btn = $('#sv-share-copy');
    if (btn) {
      btn.textContent = ok ? 'コピーできました' : 'コピーできません';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'リンクをコピー'; btn.classList.remove('copied'); }, 1600);
    }
  });

  const nativeBtn = $('#sv-share-native');
  if (navigator.share && nativeBtn) {
    nativeBtn.hidden = false;
    nativeBtn.addEventListener('click', async () => {
      const st = modal._shareState;
      const url = $('#sv-share-url')?.value;
      if (!url) return;
      try { await navigator.share({ title: st?.title || '', url }); } catch (_) {}
    });
  }
}

/** 共有モーダルを開く */
function _svOpenShareModal() {
  const viewer = $('#stream-viewer');
  const stream = viewer?._currentStream;
  if (!stream?.url) return;
  const id = youtubeVideoId(stream.url);
  if (!id) return;
  _svInitShareModal();
  const modal = $('#sv-share-modal');
  const t = _svCurrentTime(readUrlState().t);
  modal._shareState = { id, t, title: stream.title || '' };

  const titleEl = $('#sv-share-video-title');
  if (titleEl) titleEl.textContent = stream.title || '(タイトルなし)';
  const tsRow = $('#sv-share-ts-row');
  const tsCheck = $('#sv-share-ts-check');
  const tsLabel = $('#sv-share-ts-label');
  if (tsRow) tsRow.hidden = t <= 5;
  if (tsCheck) tsCheck.checked = t > 5;
  if (tsLabel) tsLabel.textContent = _fmtTs(t);

  modal._rebuild?.();
  modal.hidden = false;
}

// モジュール読み込み時に共有プレイリストパラメータを退避（URL 正規化で消える前に）
const _sharedPlParam = new URLSearchParams(location.search).get('pl');

/** URL の ?pl= から共有プレイリストを取り込む */
export async function _maybeImportSharedPlaylist() {
  if (!_sharedPlParam) return;
  let payload = null;
  try {
    const b64 = _sharedPlParam.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch (_) { return; }
  if (!payload || typeof payload.n !== 'string' || !Array.isArray(payload.s)) return;
  const name = payload.n.slice(0, 60) || '共有プレイリスト';
  const items = payload.s.filter(k => typeof k === 'string' && k.length < 100).slice(0, 300);
  if (!items.length) return;
  if (!confirm(`共有されたプレイリスト「${name}」（${items.length}件）を取り込みますか？`)) {
    writeUrlState({}, { replace: true }); // pl パラメータを除去
    return;
  }
  try {
    const m = await import('../views/playlists.js');
    const pl = m.createPlaylist(name);
    for (const k of items) m.addStreamToPlaylist(pl.id, k);
    writeUrlState({ tab: 'playlists' }, { replace: true });
    _shellDeps.activateTab('playlists', { updateUrl: false });
  } catch (_) {}
}

/** URL の ?v= から配信/MV を探して開く（初回ロード時のディープリンク） */
export async function _maybeOpenSharedVideo() {
  const url = readUrlState();
  if (!url.v) return false;
  const v = url.v;
  const t = url.t;

  // 配信データから探す（全チャンネル横断）
  try { await _shellDeps.ensureFullData(); } catch (_) {}
  const dsets = [];
  if (state.channelData?.combined) dsets.push(state.channelData.combined);
  Object.values(state.channelData?.channels || {}).forEach(d => { if (d) dsets.push(d); });
  for (const ds of dsets) {
    const found = (ds.streams || []).find(s => youtubeVideoId(s.url) === v);
    if (found) { openStreamViewer(found, t); return true; }
  }

  // MV（music.json）から探す
  try {
    const res = await fetch('data/music.json');
    const music = await res.json();
    const mv = (music?.videos || []).find(m => youtubeVideoId(m.url) === v);
    if (mv) { openStreamViewer({ url: mv.url, title: mv.title, isMv: true }, t); return true; }
  } catch (_) {}

  // データに無い動画でも MV モードで再生
  openStreamViewer({ url: `https://www.youtube.com/watch?v=${v}`, title: '', isMv: true }, t);
  return true;
}

// ─── YouTube IFrame API ───────────────────────────────────────────────────────

function playYouTubeInline(url, startAt = 0, streamTitle = '') {
  const id = youtubeVideoId(url);
  if (!id) return;
  if (_isResponsivePlaybackDisabled()) {
    window.open(_youtubeExternalUrl(url, startAt), '_blank', 'noopener');
    return;
  }

  // 埋め込みモードでビューワーが開いていたら、ミニプレイヤーへの引き継ぎなしで閉じる
  {
    const svViewer = $('#stream-viewer');
    if (svViewer && !svViewer.hidden && !_svFullscreen) {
      if (_svIsDocked(svViewer)) {
        _svDiscardMini();
      } else {
        ++_svGen;
        svViewer.hidden = true;
        svViewer._currentStream = null;
        _svPlayer = null;
        const wrap = $('#sv-player-wrap');
        if (wrap) wrap.innerHTML = '';
        document.body.style.overflow = '';
        _svLastStream = null;
        _pendingTabOptions = {};
        _setPlayerMode('idle');
        hidePlayerPanel();
        _svUpdateUrl();
      }
    }
  }

  _loadYtApi();
  initYouTubePlayer();
  const container = $('#yt-player-container');
  const panel = $('#yt-player-panel');
  if (!container || !panel) return;

  // 前のミニプレイヤーを破棄
  _miniDestroyPlayer();

  // UI 更新
  const titleEl = $('#yt-mini-title');
  if (titleEl) titleEl.textContent = streamTitle || 'インライン再生';
  const hintEl = $('#yt-mini-hint');
  if (hintEl) hintEl.innerHTML = _svLastStream ? `${icon('chevronUp')} タップして配信ビューワーへ戻る` : '';
  panel.classList.toggle('has-stream', !!_svLastStream);
  panel.hidden = false;
  _setPlayerMode('mini');

  // YT.Player を生成（API 準備完了後）
  _onYtReady(() => {
    const playerDiv = document.createElement('div');
    container.appendChild(playerDiv);
    try {
      _miniPlayer = new window.YT.Player(playerDiv, {
        videoId: id,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          ...(startAt > 0 ? { start: Math.floor(startAt) } : {}),
        },
        events: {
          onReady: (event) => {
            const v = _storedVol();
            try { event.target.setVolume(v); } catch (_) {}
            _applyVol($('#yt-mini-vol-slider'), $('#yt-mini-vol-btn'), null, v);
            if (startAt > 5) { try { event.target.seekTo(startAt, true); } catch (_) {} }
            _miniStartProgress();
          },
          onStateChange: (event) => {
            const isPlaying = event.data === window.YT.PlayerState.PLAYING;
            const playBtn = $('#yt-mini-play');
            if (playBtn) playBtn.setAttribute('data-playing', isPlaying ? '1' : '0');
          },
        },
      });
    } catch (_) {
      // フォールバック: iframe
      const startParam = startAt > 0 ? `&start=${Math.floor(startAt)}` : '';
      container.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1${startParam}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`;
    }
  });
}

export function initYouTubePlayer() {
  if ($('#yt-player-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'yt-player-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="yt-mini-video-wrap">
      <div id="yt-player-container"></div>
    </div>
    <div class="yt-mini-progress-wrap">
      <div class="yt-mini-progress-bar" id="yt-mini-progress-bar" title="クリックでシーク">
        <div class="yt-mini-progress-fill" id="yt-mini-progress-fill"></div>
      </div>
    </div>
    <div class="yt-mini-bar">
      <button class="yt-mini-play-btn" id="yt-mini-play" type="button" data-playing="0" aria-label="再生/停止"></button>
      <button class="yt-mini-info yt-mini-restore" id="yt-mini-restore" type="button" aria-label="配信ビューワーへ戻る">
        <span class="yt-mini-stream-title" id="yt-mini-title">インライン再生</span>
        <span class="yt-mini-hint" id="yt-mini-hint"></span>
      </button>
      <div class="yt-mini-vol-wrap">
        <button class="vol-btn" id="yt-mini-vol-btn" type="button" aria-label="音量">${icon('volume')}</button>
        <input class="vol-slider" id="yt-mini-vol-slider" type="range" min="0" max="100" value="100" aria-label="音量">
      </div>
      <button id="yt-player-close" type="button" class="yt-mini-close-btn" aria-label="閉じる">${icon('close')}</button>
    </div>
  `;
  document.body.appendChild(panel);

  // 閉じる
  $('#yt-player-close').addEventListener('click', () => {
    panel.hidden = true;
    if (_svDiscardMini()) return;
    _miniDestroyPlayer();
    _svLastStream = null;
    _setPlayerMode('idle');
  });

  // 再生 / 停止トグル
  $('#yt-mini-play').addEventListener('click', () => {
    if (!_miniPlayer) return;
    try {
      const st = _miniPlayer.getPlayerState?.();
      if (st === window.YT?.PlayerState?.PLAYING) { _miniPlayer.pauseVideo(); }
      else { _miniPlayer.playVideo(); }
    } catch (_) {}
  });

  // タイトルバークリック → 配信ビューワーへ戻る
  $('#yt-mini-restore').addEventListener('click', () => {
    if (_svUnminify()) return; // ミニ化中 → そのまま復帰（リロードなし）
    if (!_svLastStream) return;
    openStreamViewer(_svLastStream, _miniResumeAt());
  });

  // プログレスバークリック → シーク
  $('#yt-mini-progress-bar').addEventListener('click', (e) => {
    if (!_miniPlayer) return;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    try {
      const dur = _miniPlayer.getDuration?.() || 0;
      if (dur > 0) _miniPlayer.seekTo(pct * dur, true);
    } catch (_) {}
  });

  // 音量
  const miniVolSlider = $('#yt-mini-vol-slider');
  const miniVolBtn    = $('#yt-mini-vol-btn');
  if (miniVolSlider) {
    const v0 = _storedVol();
    miniVolSlider.value = v0;
    miniVolSlider.style.setProperty('--pct', `${v0}%`);
    if (miniVolBtn) miniVolBtn.innerHTML = _volIcon(v0);
    miniVolSlider.addEventListener('input', e => {
      const v = parseInt(e.target.value);
      e.target.style.setProperty('--pct', `${v}%`);
      _saveVol(v);
      if (miniVolBtn) miniVolBtn.innerHTML = _volIcon(v);
      if (_miniPlayer) try { _miniPlayer.setVolume(v); } catch (_) {}
    });
  }
  if (miniVolBtn) {
    let _preMute = 80;
    miniVolBtn.addEventListener('click', () => {
      if (!miniVolSlider) return;
      const cur = parseInt(miniVolSlider.value);
      const newV = cur > 0 ? 0 : (_preMute || 80);
      if (cur > 0) _preMute = cur;
      _applyVol(miniVolSlider, miniVolBtn, _miniPlayer, newV);
    });
  }
}

// ─── YouTube IFrame API ───────────────────────────────────────────────────────

let _ytApiReady = false;

const _ytApiQueue = [];

window.onYouTubeIframeAPIReady = () => {
  _ytApiReady = true;
  _ytApiQueue.splice(0).forEach(fn => fn());
  // 音楽プレイヤーモジュールに YT API 準備完了を通知
  import('../music-player.js').then(m => m.notifyYtReady()).catch(() => {});
};

export function _loadYtApi() {
  if (document.getElementById('yt-iframe-api-script')) return;
  const s = document.createElement('script');
  s.id = 'yt-iframe-api-script';
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(s);
}

function _onYtReady(fn) {
  if (_ytApiReady && window.YT?.Player) { fn(); return; }
  _ytApiQueue.push(fn);
}

// ─── Stream Viewer ────────────────────────────────────────────────────────────

const _storedVol = () => Math.max(0, Math.min(100, parseInt(localStorage.getItem('ibaraVol') ?? '100') || 100));

const _saveVol   = v  => localStorage.setItem('ibaraVol', String(v));

const _volIcon   = () => icon('volume');

function _applyVol(slider, btn, player, v) {
  if (slider) { slider.value = v; slider.style.setProperty('--pct', `${v}%`); }
  if (btn) btn.innerHTML = _volIcon(v);
  if (player) try { player.setVolume(v); } catch (_) {}
}

let _svPlayer = null;

let _svGen = 0;

let _svLastStream = null;     // stream currently loaded in mini player

let _svMiniStartAt = 0;       // seconds into video when mini player started

let _svMiniStartWallTime = 0; // Date.now() when mini player started

let _svFullscreen = false;    // stream viewer が全画面モードか(playerMode='fullscreen' と同期)

let _epPrevTab = 'timeline';  // 埋め込みプレイヤーを開く前のタブ

let _pendingTabOptions = {};  // activateTab → closeStreamViewer → hidePlayerPanel に引き継ぐ options

/** @type {Object<number, Array<{timeSeconds: number, note: string|null}>>} */
let _svCommunityTs = {};      // songIndex → 承認済みコミュニティタイムスタンプ

const _svCommunityTsCache = new Map();

let _svAutoPlay = false;      // 連続再生フラグ

let _svRepeat = false;        // ビューワーのリピート再生フラグ

let _miniPlayer = null;           // ミニプレイヤーの YT.Player インスタンス

let _miniProgressInterval = null; // 進捗バー更新タイマー

let _svEndedWatchInterval = null;

const SV_SETLIST_COLLAPSED_KEY = 'ibaraViewerSetlistCollapsed';

let _svSetlistCollapsed = false;

/** 埋め込みプレイヤーパネルを表示（タブバーの active はリセット） */
function showPlayerPanel() {
  _epPrevTab = state.activeTab || 'timeline';
  // activeTab は URL ルートのまま維持し、表示状態は playerMode で表す。
  // パネル/タブUIの切替はシェル(syncActiveTabUi)が playerMode を見て行う。
  _setPlayerMode('embedded');
  _shellDeps.syncTabUi();
}

/** 前のタブに戻る */
function hidePlayerPanel() {
  const opts = _pendingTabOptions;
  _pendingTabOptions = {};
  _shellDeps.activateTab(_epPrevTab || 'timeline', opts);
}

/** 埋め込み → 全画面に切り替え
 *  DOM を移動すると iframe がリロードされ再生位置がリセットされるため、
 *  DOM は動かさず body クラスで .container の stacking context を解除して
 *  position:fixed が root レベルで機能するようにする */
function enterStreamFullscreen() {
  _svFullscreen = true;
  _setPlayerMode('fullscreen');
  const viewer = $('#stream-viewer');
  if (!viewer) return;
  viewer.classList.add('sv-fullscreen');
  document.body.classList.add('has-sv-fullscreen');
  document.body.style.overflow = 'hidden';
  const closeBtn = $('#sv-close');
  if (closeBtn) closeBtn.setAttribute('data-tooltip', '通常表示に戻る（Esc）');
  const fsBtn = $('#sv-fullscreen-btn');
  if (fsBtn) fsBtn.setAttribute('aria-pressed', 'true');
}

function _fmtTs(sec) {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${m}:${String(ss).padStart(2, '0')}`;
}

function _svTsKey(stream) {
  return `ibara-ts-${stream.channel || ''}-${stream.index || ''}`;
}

function _svLoadTs(stream) {
  try { return JSON.parse(localStorage.getItem(_svTsKey(stream)) || 'null') || {}; }
  catch (_) { return {}; }
}

function _svSaveTs(stream, ts) {
  try { localStorage.setItem(_svTsKey(stream), JSON.stringify(ts)); }
  catch (_) { /* quota */ }
}

let _svCurSongIdx = -1; // 現在再生中の曲インデックス

function _svSongRow(song, i, ts, currentIdx) {
  const isCurrent = i === currentIdx;
  const time = ts[i];                          // 自分のメモ（localStorage）
  // 承認済み（固定コメントの集計・管理者の打刻）。
  // API 応答を待つ間も出せるよう、streams.json に埋め込んだ t を初期値に使う。
  const ctsItems = _svCommunityTs[i]
    || (song.t != null ? [{ timeSeconds: song.t, note: null }] : []);
  const primary = ctsItems[0] || null;

  // 行の先頭には「この曲の頭」を1つだけ出す。承認済みがあればそれを、
  // 無ければ自分のメモを使う。どちらも無ければ位置だけ確保して桁を揃える。
  let leadBadge;
  if (primary) {
    leadBadge = `<button class="sv-cts-main" data-idx="${i}" data-action="cts-seek" data-cts-seconds="${primary.timeSeconds}" title="この曲の頭（${escapeHtml(_fmtTs(primary.timeSeconds))}）へ移動">${escapeHtml(_fmtTs(primary.timeSeconds))}</button>`;
  } else if (time != null) {
    leadBadge = `<button class="sv-ts-badge" data-idx="${i}" data-action="seek" title="自分のメモ（${escapeHtml(_fmtTs(time))}）へ移動">${escapeHtml(_fmtTs(time))}</button>`;
  } else {
    leadBadge = '<span class="sv-cts-main is-empty" aria-hidden="true">–</span>';
  }

  // 自分のメモと承認済みが両方あるときだけ、メモを控えめに併記する
  const memoChip = (primary && time != null)
    ? `<button class="sv-ts-badge is-memo" data-idx="${i}" data-action="seek" title="自分のメモ（${escapeHtml(_fmtTs(time))}）へ移動">${escapeHtml(_fmtTs(time))}</button>`
    : '';
  const delBtn = time != null
    ? `<button class="sv-ts-del" data-idx="${i}" data-action="del-ts" aria-label="自分のメモを削除">${icon('close')}</button>`
    : '';

  // 2件目以降の承認済みは予備扱い。通常は無いので、あるときだけ2行目を出す
  const extras = ctsItems.slice(1).map(ct =>
    `<button class="sv-cts-badge" data-idx="${i}" data-action="cts-seek" data-cts-seconds="${ct.timeSeconds}" title="別候補: ${escapeHtml(_fmtTs(ct.timeSeconds))}">${escapeHtml(_fmtTs(ct.timeSeconds))}</button>`
  ).join('');
  const extraRow = extras ? `<div class="sv-cts-row">${extras}</div>` : '';

  return `<div class="sv-song${isCurrent ? ' is-current' : ''}" data-idx="${i}">
    <span class="sv-song-num">${i + 1}</span>
    <div class="sv-song-lead">${leadBadge}</div>
    <div class="sv-song-info">
      <span class="sv-song-title" title="${escapeHtml(song.title)}">${escapeHtml(song.title)}</span>
      <span class="sv-song-artist" title="${escapeHtml(song.artist)}">${escapeHtml(song.artist)}</span>
    </div>
    <div class="sv-song-actions">${memoChip}${delBtn}<button class="sv-ts-set" data-idx="${i}" data-action="set-ts" title="現在の再生時刻を自分用にメモする">${icon('time')}</button><button class="sv-cts-propose" data-idx="${i}" data-action="cts-propose" type="button" title="この曲の正しい開始時刻を提案する" aria-label="開始時刻を提案">${icon('plus')}</button></div>
    ${extraRow}
  </div>`;
}

/**
 * 特定の配信枠の承認済みコミュニティタイムスタンプを取得し _svCommunityTs に格納する。
 * 取得後に sv-setlist を再描画する。
 *
 * @param {object} stream
 */
async function _svLoadCommunityTs(stream) {
  _svCommunityTs = {};
  if (!stream?.channel || stream?.index == null) return;
  const cacheKey = `${stream.channel}:${stream.index}`;
  if (_svCommunityTsCache.has(cacheKey)) {
    _svCommunityTs = _svCommunityTsCache.get(cacheKey) || {};
    const el = $('#stream-viewer');
    if (!el || el._currentStream !== stream) return;
    const setlistEl = $('#sv-setlist');
    if (setlistEl) _svRefreshSetlist(setlistEl, stream.songs, _svLoadTs(stream), _svCurSongIdx);
    _svUpdateBulkBtn(stream);
    return;
  }
  try {
    const items = await fetchCommunityTimestamps(stream.channel, stream.index);
    if (!items) return;
    for (const item of items) {
      if (!_svCommunityTs[item.songIndex]) _svCommunityTs[item.songIndex] = [];
      _svCommunityTs[item.songIndex].push({ timeSeconds: item.timeSeconds, note: item.note ?? null });
    }
    _svCommunityTsCache.set(cacheKey, _svCommunityTs);
  } catch (_) { /* ネットワークエラーは無視 */ }
  // 再描画（stream-viewer が同じ配信のままの場合のみ）
  const el = $('#stream-viewer');
  if (!el || el._currentStream !== stream) return;
  const setlistEl = $('#sv-setlist');
  if (setlistEl) _svRefreshSetlist(setlistEl, stream.songs, _svLoadTs(stream), _svCurSongIdx);
  _svUpdateBulkBtn(stream);
}

/**
 * コミュニティタイムスタンプを提案するモーダルを表示する。
 *
 * @param {object} stream
 * @param {number} songIdx
 * @param {string} songTitle
 */
function _svShowProposeModal(stream, songIdx, songTitle) {
  // 既存モーダルがあれば除去
  $('#sv-cts-modal')?.remove();

  const currentTime = _svPlayer?.getCurrentTime?.() ?? 0;
  const defaultTime = _fmtTs(Math.floor(currentTime));

  const modal = document.createElement('div');
  modal.id = 'sv-cts-modal';
  modal.className = 'sv-cts-modal-overlay';
  modal.innerHTML = `
    <div class="sv-cts-modal-box" role="dialog" aria-modal="true" aria-label="タイムスタンプを提案">
      <div class="sv-cts-modal-head">
        <span class="sv-cts-modal-title">タイムスタンプを提案</span>
        <button class="sv-cts-modal-close" type="button" aria-label="閉じる">${icon('close')}</button>
      </div>
      <p class="sv-cts-modal-song">${escapeHtml(songTitle)}</p>
      <label class="sv-cts-modal-label">
        タイムスタンプ（MM:SS または H:MM:SS）
        <input class="sv-cts-modal-input" id="sv-cts-ts-input" type="text" value="${escapeHtml(defaultTime)}" placeholder="0:00" autocomplete="off">
      </label>
      <label class="sv-cts-modal-label">
        コメント（任意・200文字以内）
        <input class="sv-cts-modal-input" id="sv-cts-note-input" type="text" maxlength="200" placeholder="">
      </label>
      <p class="sv-cts-modal-hint">提案は管理者の審査後に公開されます。</p>
      <div class="sv-cts-modal-btns">
        <button class="sv-cts-modal-submit" id="sv-cts-submit" type="button">提案する</button>
        <button class="sv-cts-modal-cancel" type="button">キャンセル</button>
      </div>
      <p class="sv-cts-modal-status" id="sv-cts-status" hidden></p>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.sv-cts-modal-close').addEventListener('click', close);
  modal.querySelector('.sv-cts-modal-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  modal.querySelector('#sv-cts-submit').addEventListener('click', async () => {
    const tsStr = modal.querySelector('#sv-cts-ts-input').value.trim();
    const note  = modal.querySelector('#sv-cts-note-input').value.trim() || null;
    const parsedSec = _parseTs(tsStr);
    const statusEl = modal.querySelector('#sv-cts-status');
    if (parsedSec === null) {
      statusEl.textContent = 'タイムスタンプの形式が正しくありません（例: 1:23 または 1:23:45）';
      statusEl.className = 'sv-cts-modal-status error';
      statusEl.hidden = false;
      return;
    }
    const submitBtn = modal.querySelector('#sv-cts-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中…';
    try {
      const res = await submitCommunityTimestamp(stream.channel, stream.index, {
        songIndex: songIdx,
        timeSeconds: parsedSec,
        submitterNote: note,
      });
      if (res.ok) {
        statusEl.textContent = '提案を送信しました！審査後に公開されます。';
        statusEl.className = 'sv-cts-modal-status success';
        statusEl.hidden = false;
        submitBtn.hidden = true;
        modal.querySelector('.sv-cts-modal-cancel').textContent = '閉じる';
      } else {
        statusEl.textContent = `送信に失敗しました: ${res.error}`;
        statusEl.className = 'sv-cts-modal-status error';
        statusEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = '提案する';
      }
    } catch (err) {
      statusEl.textContent = `送信に失敗しました: ${err.message}`;
      statusEl.className = 'sv-cts-modal-status error';
      statusEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = '提案する';
    }
  });

  // フォーカス
  setTimeout(() => modal.querySelector('#sv-cts-ts-input')?.focus(), 50);
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
}

// ─── Bulk community timestamp proposal ───────────────────────────────────────

/** セトリ登録ボタンのテキスト・表示状態を更新する */
function _svUpdateBulkBtn(stream) {
  const btn = $('#sv-cts-bulk-btn');
  if (!btn || !stream?.songs?.length) return;
  const registeredCount = Object.keys(_svCommunityTs).length;
  const allRegistered   = registeredCount >= stream.songs.length;
  btn.textContent = allRegistered ? '修正申請' : 'セトリ登録';
  btn.hidden = false;
}

/** 全曲まとめてタイムスタンプを申請するモーダルを表示する */
function _svShowBulkProposeModal(stream) {
  $('#sv-bulk-modal')?.remove();

  const localTs = _svLoadTs(stream); // 一括入力で保存済みのタイムスタンプ
  const registeredCount = Object.keys(_svCommunityTs).length;
  const allRegistered   = registeredCount >= stream.songs.length;
  const isRevise = allRegistered;

  const rows = stream.songs.map((song, idx) => {
    const localVal = localTs[idx] != null ? _fmtTs(localTs[idx]) : '';
    const communityVal = _svCommunityTs[idx]?.[0]?.timeSeconds != null
      ? _fmtTs(_svCommunityTs[idx][0].timeSeconds) : '';
    const prefill = localVal || communityVal;
    return `
      <div class="sv-bulk-row" data-idx="${idx}">
        <span class="sv-bulk-num">${idx + 1}</span>
        <span class="sv-bulk-title" title="${escapeHtml(song.title)}">${escapeHtml(song.title)}</span>
        <input class="sv-bulk-ts-input" type="text" value="${escapeHtml(prefill)}"
          placeholder="0:00" autocomplete="off" data-bulk-ts-idx="${idx}">
        <button class="sv-bulk-ts-now" type="button" title="現在時刻を入力" data-bulk-now="${idx}">${icon('time')}</button>
      </div>`;
  }).join('');

  const modal = document.createElement('div');
  modal.id = 'sv-bulk-modal';
  modal.className = 'sv-cts-modal-overlay';
  modal.innerHTML = `
    <div class="sv-cts-modal-box sv-bulk-modal-box" role="dialog" aria-modal="true"
      aria-label="${isRevise ? '修正申請' : 'セトリ登録'}">
      <div class="sv-cts-modal-head">
        <span class="sv-cts-modal-title">${isRevise ? '修正申請' : 'セトリ登録'}</span>
        <button class="sv-cts-modal-close" type="button" aria-label="閉じる">${icon('close')}</button>
      </div>
      <details class="sv-paste-area">
        <summary class="sv-paste-summary">配信コメントから一括入力</summary>
        <textarea class="sv-paste-textarea" placeholder="配信のタイムスタンプコメントを貼り付け&#10;例: 23:16　微かなカオリ / Perfume　27:58"></textarea>
        <div class="sv-paste-btns">
          <button class="sv-paste-apply btn ghost" type="button">解析して入力</button>
          <span class="sv-paste-result" hidden></span>
        </div>
      </details>
      <p class="sv-bulk-hint">タイムスタンプを入力して一括申請できます。空欄の曲はスキップされます。</p>
      <div class="sv-bulk-rows">${rows}</div>
      <label class="sv-cts-modal-label" style="margin-top:10px">
        共通コメント（任意・200文字以内）
        <input class="sv-cts-modal-input" id="sv-bulk-note" type="text" maxlength="200" placeholder="">
      </label>
      <p class="sv-cts-modal-hint">提案は管理者の審査後に公開されます。</p>
      <div class="sv-cts-modal-btns">
        <button class="sv-cts-modal-submit" id="sv-bulk-submit" type="button">一括申請する</button>
        <button class="sv-cts-modal-cancel" type="button">キャンセル</button>
      </div>
      <p class="sv-cts-modal-status" id="sv-bulk-status" hidden></p>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.sv-cts-modal-close').addEventListener('click', close);
  modal.querySelector('.sv-cts-modal-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  // 配信コメント貼り付け → タイムスタンプ一括入力
  modal.querySelector('.sv-paste-apply').addEventListener('click', () => {
    const text = modal.querySelector('.sv-paste-textarea')?.value || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let matched = 0;
    for (const line of lines) {
      const parsed = _parseTsCommentLine(line);
      if (!parsed) continue;
      const idx = _matchSongIdx(parsed.title, parsed.artist, stream.songs);
      if (idx >= 0) {
        const input = modal.querySelector(`[data-bulk-ts-idx="${idx}"]`);
        if (input) { input.value = parsed.start; matched++; }
      }
    }
    const result = modal.querySelector('.sv-paste-result');
    if (result) {
      result.textContent = matched > 0
        ? `${lines.length}行を解析 → ${matched}曲に入力しました`
        : '一致する曲が見つかりませんでした';
      result.hidden = false;
    }
  });

  // ⏱ ボタン：現在時刻を入力欄にセット
  modal.querySelector('.sv-bulk-rows').addEventListener('click', e => {
    const btn = e.target.closest('[data-bulk-now]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.bulkNow, 10);
    const time = _svPlayer?.getCurrentTime?.();
    if (time != null) {
      const input = modal.querySelector(`[data-bulk-ts-idx="${idx}"]`);
      if (input) input.value = _fmtTs(Math.floor(time));
    }
  });

  modal.querySelector('#sv-bulk-submit').addEventListener('click', async () => {
    const note = modal.querySelector('#sv-bulk-note').value.trim() || null;
    const statusEl = modal.querySelector('#sv-bulk-status');
    const submitBtn = modal.querySelector('#sv-bulk-submit');

    // 入力値を収集
    const entries = [];
    modal.querySelectorAll('[data-bulk-ts-idx]').forEach(input => {
      const idx = parseInt(input.dataset.bulkTsIdx, 10);
      const sec = _parseTs(input.value.trim());
      if (sec !== null) entries.push({ songIndex: idx, timeSeconds: sec });
    });

    if (!entries.length) {
      statusEl.textContent = 'タイムスタンプが1つも入力されていません';
      statusEl.className = 'sv-cts-modal-status error';
      statusEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = `申請中… (0/${entries.length})`;
    statusEl.hidden = true;

    let succeeded = 0;
    let failed = 0;
    await Promise.all(entries.map(async entry => {
      try {
        const res = await submitCommunityTimestamp(stream.channel, stream.index, {
          songIndex: entry.songIndex,
          timeSeconds: entry.timeSeconds,
          submitterNote: note,
        });
        if (res.ok) succeeded++; else failed++;
      } catch (_) { failed++; }
      submitBtn.textContent = `申請中… (${succeeded + failed}/${entries.length})`;
    }));

    if (failed === 0) {
      statusEl.textContent = `${succeeded}曲分のタイムスタンプを申請しました！審査後に公開されます。`;
      statusEl.className = 'sv-cts-modal-status success';
      submitBtn.hidden = true;
      modal.querySelector('.sv-cts-modal-cancel').textContent = '閉じる';
    } else {
      statusEl.textContent = `${succeeded}件成功 / ${failed}件失敗。失敗分を再試行してください。`;
      statusEl.className = 'sv-cts-modal-status error';
      submitBtn.disabled = false;
      submitBtn.textContent = '一括申請する';
    }
    statusEl.hidden = false;
  });

  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
}

// ─── マイリスト再生キュー（ビューワー内） ────────────────────────────────────
// プレイリストの ▶ から起動し、配信・動画を混在キューとして順に再生する。
// item: { kind: 'stream'|'mv', key, stream?, video? }

const SV_QUEUE_COLLAPSED_KEY = 'ibaraViewerQueueCollapsed';

let _svListQueue = null;        // { name, items, idx, repeat, collapsed }

let _svQueueNavigating = false; // キュー内ナビゲーション中はキューを解除しない

function _svListQueueOpen(idx) {
  const q = _svListQueue;
  const item = q?.items?.[idx];
  if (!item) return;
  q.idx = idx;
  _svQueueNavigating = true;
  try {
    if (item.kind === 'mv') {
      openStreamViewer({ url: item.video.url, title: item.video.title, isMv: true });
    } else {
      openStreamViewer(item.stream);
    }
  } finally {
    _svQueueNavigating = false;
  }
}

export function playMyListInViewer(queue) {
  if (!queue?.items?.length) return;
  _svListQueue = {
    name: queue.name || 'マイリスト',
    items: queue.items,
    idx: 0,
    repeat: localStorage.getItem('ibaraListRepeat') === '1',
    collapsed: localStorage.getItem(SV_QUEUE_COLLAPSED_KEY) === '1',
  };
  _svListQueueOpen(Math.max(0, Math.min(queue.idx || 0, queue.items.length - 1)));
}

export function openMusicQueueInViewer(videos, idx = 0, resumeAt = 0) {
  if (!videos?.length) return false;
  const items = videos
    .filter(v => v?.url)
    .map((v, i) => {
      if (v._stream) return { kind: 'stream', key: v._stream.url || `stream:${i}`, stream: v._stream };
      return { kind: 'mv', key: `mv:${youtubeVideoId(v.url) || i}`, video: { ...v, isMv: true } };
    });
  if (!items.length) return false;
  _svListQueue = {
    name: '音楽プレイヤーのキュー',
    items,
    idx: Math.max(0, Math.min(idx, items.length - 1)),
    repeat: localStorage.getItem('ibaraListRepeat') === '1',
    collapsed: localStorage.getItem(SV_QUEUE_COLLAPSED_KEY) === '1',
  };
  const item = _svListQueue.items[_svListQueue.idx];
  _svQueueNavigating = true;
  try {
    if (item.kind === 'mv') openStreamViewer({ ...item.video, isMv: true }, resumeAt);
    else openStreamViewer(item.stream, resumeAt);
  } finally {
    _svQueueNavigating = false;
  }
  return true;
}

/** プレイヤー下に挿入するキューセクションの HTML（キュー非アクティブ時は空文字） */
function _svQueueSectionHtml() {
  const q = _svListQueue;
  if (!q?.items?.length) return '';
  const current = q.items[q.idx];
  const currentTitle = current?.kind === 'mv'
    ? (current.video?.title || '動画')
    : (current?.stream?.title || '配信');
  return `
    <div class="sv-bp-section sv-queue-section${q.collapsed ? ' is-collapsed' : ''}">
      <div class="sv-bp-sh sv-queue-head">${icon('playlist')} ${escapeHtml(q.name)}
        <span class="sv-bp-sh-sub">（${q.idx + 1} / ${q.items.length}）</span>
        <span class="sv-queue-current">${escapeHtml(currentTitle)}</span>
        <button class="sv-queue-toggle" type="button"
          data-svq-action="toggle" aria-expanded="${!q.collapsed}"
          title="${q.collapsed ? 'キューを開く' : 'キューを閉じる'}">${q.collapsed ? '開く' : '閉じる'}</button>
        <button class="sv-queue-repeat${q.repeat ? ' is-on' : ''}" type="button"
          data-svq-action="repeat" aria-pressed="${q.repeat}"
          title="リストリピート（ON: 最後まで再生したら先頭へ戻る）">${icon('repeat')} リピート</button>
      </div>
      <div class="sv-queue-list">
        ${q.items.map((it, i) => {
          const title = it.kind === 'mv' ? (it.video?.title || '動画') : (it.stream?.title || '配信');
          // アイコンは SVG 文字列なので escapeHtml せず、テキスト部分だけエスケープする
          const metaIcon = it.kind === 'mv' ? icon('video') : icon('calendar');
          const metaText = it.kind === 'mv'
            ? '動画'
            : `${fmtDate(it.stream?.date)}　第${it.stream?.index}枠`;
          return `<button class="sv-queue-row${i === q.idx ? ' is-current' : ''}" type="button"
            data-svq-action="jump" data-svq-idx="${i}">
            <span class="sv-queue-num">${i + 1}</span>
            <span class="sv-queue-title">${escapeHtml(title)}</span>
            <span class="sv-queue-meta">${metaIcon} ${escapeHtml(metaText)}</span>
          </button>`;
        }).join('')}
      </div>
    </div>`;
}

/** キューセクション内クリックを処理。処理した場合 true を返す */
function _svHandleQueueClick(e) {
  const btn = e.target.closest('[data-svq-action]');
  if (!btn || !_svListQueue) return false;
  if (btn.dataset.svqAction === 'jump') {
    const i = parseInt(btn.dataset.svqIdx, 10);
    if (!Number.isNaN(i) && i !== _svListQueue.idx) _svListQueueOpen(i);
    return true;
  }
  if (btn.dataset.svqAction === 'repeat') {
    _svListQueue.repeat = !_svListQueue.repeat;
    try { localStorage.setItem('ibaraListRepeat', _svListQueue.repeat ? '1' : '0'); } catch (_) {}
    btn.classList.toggle('is-on', _svListQueue.repeat);
    btn.setAttribute('aria-pressed', String(_svListQueue.repeat));
    return true;
  }
  if (btn.dataset.svqAction === 'toggle') {
    _svListQueue.collapsed = !_svListQueue.collapsed;
    try { localStorage.setItem(SV_QUEUE_COLLAPSED_KEY, _svListQueue.collapsed ? '1' : '0'); } catch (_) {}
    const section = btn.closest('.sv-queue-section');
    if (section) section.outerHTML = _svQueueSectionHtml();
    _svQueueAfterRender($('#sv-below-player'));
    return true;
  }
  return false;
}

/** キュー描画後の後処理: 現在の行をリスト内スクロールで中央へ（ページはスクロールさせない） */
function _svQueueAfterRender(el) {
  if (_svListQueue?.collapsed) return;
  const listEl = el?.querySelector?.('.sv-queue-list');
  const cur = listEl?.querySelector('.sv-queue-row.is-current');
  if (listEl && cur) listEl.scrollTop = Math.max(0, cur.offsetTop - listEl.clientHeight / 2);
}

/** 連続再生: 現在より1つ古い配信（配列の次のインデックス）を開く */
function _svPlayNext() {
  const streams = state.data?.streams || [];
  const viewer = $('#stream-viewer');
  const stream = viewer?._currentStream;
  if (!stream) return;
  const idx = streams.findIndex(s => s.channel === stream.channel && s.index === stream.index);
  if (idx < 0 || idx >= streams.length - 1) return;
  openStreamViewer(streams[idx + 1]);
}

async function _svPlayNextMv(stream) {
  const videos = await _mvFetchVideos();
  const curId = youtubeVideoId(stream?.url);
  if (!curId || !videos.length) return;
  const idx = videos.findIndex(v => youtubeVideoId(v.url) === curId);
  if (idx < 0 || idx >= videos.length - 1) return;
  const next = videos[idx + 1];
  openStreamViewer({ ...next, isMv: true });
}

async function _svPlayPrevMv(stream) {
  const videos = await _mvFetchVideos();
  const curId = youtubeVideoId(stream?.url);
  if (!curId || !videos.length) return;
  const idx = videos.findIndex(v => youtubeVideoId(v.url) === curId);
  if (idx <= 0) return;
  openStreamViewer({ ...videos[idx - 1], isMv: true });
}

function _svHandleEnded(viewer) {
  if (!viewer || _svIsDocked(viewer)) return;
  const player = _svPlayer || _miniPlayer;
  if (_svRepeat && player) {
    try { player.seekTo(0, true); player.playVideo(); } catch (_) {}
    return;
  }
  // マイリストキュー再生中 → 次のアイテムへ（リピート ON なら末尾から先頭へ）
  if (_svListQueue?.items?.length) {
    const q = _svListQueue;
    if (q.idx < q.items.length - 1) _svListQueueOpen(q.idx + 1);
    else if (q.repeat) _svListQueueOpen(0);
    return;
  }
  if (!_svAutoPlay) return;
  const stream = viewer._currentStream;
  if (stream?.isMv) _svPlayNextMv(stream);
  else _svPlayNext();
}

function _svStopEndedWatch() {
  if (_svEndedWatchInterval) {
    clearInterval(_svEndedWatchInterval);
    _svEndedWatchInterval = null;
  }
}

function _svStartEndedWatch(gen, viewer) {
  _svStopEndedWatch();
  let seenEnded = false;
  _svEndedWatchInterval = setInterval(() => {
    if (gen !== _svGen || viewer.hidden || !_svPlayer) {
      _svStopEndedWatch();
      return;
    }
    try {
      const st = _svPlayer.getPlayerState?.();
      if (st === window.YT?.PlayerState?.ENDED) {
        if (!seenEnded) _svHandleEnded(viewer);
        seenEnded = true;
      } else if (st === window.YT?.PlayerState?.PLAYING) {
        seenEnded = false;
      }
      // 現在再生中の曲インデックスを更新
      const curTime = _svPlayer.getCurrentTime?.() ?? 0;
      const stream = viewer._currentStream;
      if (stream?.songs?.length) {
        const ts = _svLoadTs(stream);
        let found = -1;
        for (let i = 0; i < stream.songs.length; i++) {
          if (ts[i] != null && curTime >= ts[i]) found = i;
        }
        if (found !== _svCurSongIdx) {
          _svCurSongIdx = found;
          _svHighlightCurrentSong(found);
        }
      }
    } catch (_) {}
  }, 700);
}

/** セットリスト内で現在再生中の曲をハイライト（DOM更新なし） */
function _svHighlightCurrentSong(idx) {
  const setlistEl = $('#sv-setlist');
  if (!setlistEl) return;
  const songs = setlistEl.querySelectorAll('.sv-song');
  songs.forEach((el, i) => el.classList.toggle('is-current', i === idx));
}

function _svSetSetlistCollapsed(collapsed) {
  _svSetlistCollapsed = !!collapsed;
  try { localStorage.setItem(SV_SETLIST_COLLAPSED_KEY, _svSetlistCollapsed ? '1' : '0'); } catch (_) {}
  const panel = $('#stream-viewer .sv-panel');
  const btn = $('#sv-setlist-toggle');
  if (panel) panel.classList.toggle('is-setlist-collapsed', _svSetlistCollapsed);
  if (btn) {
    btn.textContent = _svSetlistCollapsed ? '開く' : '畳む';
    btn.setAttribute('data-tooltip', _svSetlistCollapsed ? 'セットリストを開く' : 'セットリストを折りたたむ');
    btn.setAttribute('aria-expanded', String(!_svSetlistCollapsed));
  }
}

function _svApplySetlistCollapsed() {
  try { _svSetlistCollapsed = localStorage.getItem(SV_SETLIST_COLLAPSED_KEY) === '1'; } catch (_) {}
  _svSetSetlistCollapsed(_svSetlistCollapsed);
}

function _svPlayPrev() {
  const streams = state.data?.streams || [];
  const viewer = $('#stream-viewer');
  const stream = viewer?._currentStream;
  if (!stream) return;
  const idx = streams.findIndex(s => s.channel === stream.channel && s.index === stream.index);
  if (idx <= 0) return;
  openStreamViewer(streams[idx - 1]);
}

function _svTogglePlayback() {
  const player = _svPlayer || _miniPlayer;
  if (!player) return;
  try {
    const stateCode = player.getPlayerState?.();
    if (stateCode === window.YT?.PlayerState?.PLAYING) player.pauseVideo?.();
    else player.playVideo?.();
  } catch (_) {}
}

function _svUpdatePlayToggle(isPlaying) {
  $$('.sv-bp-control-btn[data-bp-action="toggle-play"]').forEach(btn => {
    btn.innerHTML = isPlaying ? icon('pause') : icon('play');
    btn.setAttribute('data-tooltip', isPlaying ? '一時停止' : '再生');
    btn.setAttribute('aria-label', isPlaying ? '一時停止' : '再生');
    btn.setAttribute('aria-pressed', String(isPlaying));
  });
}

function _svBookmarkSvg() {
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/></svg>';
}

function _svIsSavedInAnyPlaylist(skey) {
  return getPlaylists().some(pl => (pl.streams || []).includes(skey));
}

function _svOpenPlaylistModal(skey, title, button) {
  import('../views/playlists.js').then(m => {
    m.showAddToPlaylistModal(skey, title, {
      onChange: (saved) => {
        button?.classList.toggle('is-saved', !!saved);
        button?.setAttribute('aria-pressed', String(!!saved));
        if (button) button.setAttribute('data-tooltip', saved ? 'プレイリストに保存済み' : 'プレイリストに保存');
      },
    });
  }).catch(() => {});
}

function _svRelatedHtml(related) {
  if (!related.length) {
    return '<div class="sv-side-empty">同じ曲を歌った配信はまだありません</div>';
  }
  return related.map(r => {
    const rthumb = youtubeThumbTiny(r.stream.url) || youtubeThumb(r.stream.url);
    return `<button class="sv-side-rel-card" type="button" data-bp-action="open-stream" data-bp-channel="${escapeHtml(r.stream.channel)}" data-bp-index="${r.stream.index}">
      ${rthumb ? `<img class="sv-side-rel-thumb" src="${escapeHtml(rthumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="sv-side-rel-thumb sv-side-rel-thumb--empty"></span>'}
      <span class="sv-side-rel-body">
        <span class="sv-side-rel-title">${escapeHtml(r.stream.title || '配信')}</span>
        <span class="sv-side-rel-meta">${fmtDate(r.stream.date)} / ${r.overlap}曲一致</span>
        <span class="sv-side-rel-songs">${r.sharedSongs.map(t => escapeHtml(t)).join('、')}</span>
      </span>
    </button>`;
  }).join('');
}

function _svRenderSideRelated(related) {
  const el = $('#sv-side-related');
  if (!el) return;
  el.innerHTML = `
    <div class="sv-side-related-head">
      <span>関連配信</span>
      <span>${related.length ? `${related.length}件` : ''}</span>
    </div>
    <div class="sv-side-related-list">${_svRelatedHtml(related)}</div>
  `;
}

/** プレイヤー下のナビカードHTMLを返す */
function _svIsVerticalStream(stream) {
  return /縦型|たて配信|タテ|#?shorts|ショート|vertical/i.test(stream?.title || '')
    || /\/shorts\//.test(stream?.url || '');
}

function _svNavCard(s, dir) {
  if (!s) {
    const label = dir === 'newer' ? '最新配信' : '最初の配信';
    return `<div class="sv-bp-nav-card sv-bp-nav-empty">${escapeHtml(label)}</div>`;
  }
  const thumb = youtubeThumb(s.url);
  const label = dir === 'newer' ? '新しい配信 →' : '← 古い配信';
  const layoutClass = _svIsVerticalStream(s) ? 'sv-bp-nav-card--portrait' : 'sv-bp-nav-card--landscape';
  return `<button class="sv-bp-nav-card ${layoutClass}" type="button" data-bp-action="open-stream" data-bp-channel="${escapeHtml(s.channel)}" data-bp-index="${s.index}">
    <div class="sv-bp-nav-dir">${escapeHtml(label)}</div>
    ${thumb ? `<img class="sv-bp-nav-thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<div class="sv-bp-nav-thumb sv-bp-nav-thumb--empty"></div>'}
    <div class="sv-bp-nav-info">
      <div class="sv-bp-nav-title">${escapeHtml(s.title || '配信')}</div>
      <div class="sv-bp-nav-meta">${fmtDate(s.date)}　${s.songs.length}曲</div>
    </div>
  </button>`;
}

/**
 * プレイヤー下エリアを描画する。
 * 前後ナビ / 連続再生トグル / 配信統計 / 関連配信 / プレイリスト追加
 *
 * @param {object} stream
 */
function _svRenderBelowPlayer(stream) {
  const el = $('#sv-below-player');
  if (!el) return;

  const streams = state.data?.streams || [];
  const idx = streams.findIndex(s => s.channel === stream.channel && s.index === stream.index);

  // streams[0] = 最新, streams[n] = 最古
  // "古い" = idx+1, "新しい" = idx-1
  const olderStream = idx >= 0 && idx < streams.length - 1 ? streams[idx + 1] : null;
  const newerStream = idx > 0 ? streams[idx - 1] : null;

  // 関連配信: 曲かぶりが多い順
  const songTitles = new Set(stream.songs.map(s => s.title));
  const related = streams
    .filter((_, i) => i !== idx)
    .map(s => {
      const shared = s.songs.filter(sg => songTitles.has(sg.title));
      return { stream: s, overlap: shared.length, sharedSongs: shared.slice(0, 3).map(sg => sg.title) };
    })
    .filter(r => r.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 8);

  const skey = streamKey(stream);
  const saved = _svIsSavedInAnyPlaylist(skey);

  el.innerHTML = `
    <div class="sv-bp-wrap">
      ${_svQueueSectionHtml()}

      <!-- 操作 + 前後ナビ -->
      <div class="sv-bp-section sv-bp-section--nav">
        <div class="sv-bp-control-bar">
          <button class="sv-bp-control-btn" type="button" data-bp-action="prev-stream"
            ${newerStream ? '' : 'disabled'} data-tooltip="前の配信" aria-label="前の配信">${icon('previous')}</button>
          <button class="sv-bp-control-btn sv-bp-control-btn--play" type="button" data-bp-action="toggle-play"
            data-tooltip="再生 / 一時停止" aria-label="再生 / 一時停止">${icon('play')}</button>
          <button class="sv-bp-control-btn" type="button" data-bp-action="next-stream"
            ${olderStream ? '' : 'disabled'} data-tooltip="次の配信" aria-label="次の配信">${icon('next')}</button>
          <label class="sv-bp-ap-label" for="sv-ap-check">
            <span class="sv-bp-ap-switch${_svAutoPlay ? ' sv-bp-ap-switch--on' : ''}">
              <input type="checkbox" id="sv-ap-check" class="sv-bp-ap-check"${_svAutoPlay ? ' checked' : ''}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            連続再生
          </label>
          <label class="sv-bp-ap-label" for="sv-repeat-check">
            <span class="sv-bp-ap-switch${_svRepeat ? ' sv-bp-ap-switch--on' : ''}">
              <input type="checkbox" id="sv-repeat-check" class="sv-bp-ap-check"${_svRepeat ? ' checked' : ''}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            リピート
          </label>
          <button class="sv-bp-control-btn sv-bp-bookmark-btn${saved ? ' is-saved' : ''}" type="button"
            data-bp-action="bookmark-stream" aria-pressed="${saved}" data-tooltip="${saved ? 'プレイリストに保存済み' : 'プレイリストに保存'}"
            aria-label="${saved ? 'プレイリストに保存済み' : 'プレイリストに保存'}">${_svBookmarkSvg()}</button>
        </div>
        <div class="sv-bp-next-hint">
          ${olderStream
            ? `次：${escapeHtml(olderStream.title || '次の配信')}`
            : '最後の配信です'}
        </div>
        <div class="sv-bp-nav-cards">
          ${_svNavCard(newerStream, 'newer')}
          ${_svNavCard(olderStream, 'older')}
        </div>
        <div class="sv-bp-info-compact">
          <span>${fmtDate(stream.date)}</span>
          <span>第${stream.index}枠</span>
          <span>${stream.songs.length}曲</span>
        </div>
      </div>

    </div>
  `;
  _svRenderSideRelated(related);

  // イベント委譲（el.onXxx で上書きして重複防止）
  el.onchange = (e) => {
    const apCheck = e.target.closest('#sv-ap-check');
    const repeatCheck = e.target.closest('#sv-repeat-check');
    if (apCheck) {
      _svAutoPlay = apCheck.checked;
      const sw = apCheck.closest('.sv-bp-ap-switch');
      if (sw) sw.classList.toggle('sv-bp-ap-switch--on', _svAutoPlay);
    }
    if (repeatCheck) {
      _svRepeat = repeatCheck.checked;
      const sw = repeatCheck.closest('.sv-bp-ap-switch');
      if (sw) sw.classList.toggle('sv-bp-ap-switch--on', _svRepeat);
    }
  };

  el.onclick = (e) => {
    if (_svHandleQueueClick(e)) return;
    const btn = e.target.closest('[data-bp-action]');
    if (!btn) return;
    const action = btn.dataset.bpAction;

    if (action === 'open-stream') {
      const ch = btn.dataset.bpChannel;
      const targetIdx = parseInt(btn.dataset.bpIndex, 10);
      const target = (state.data?.streams || []).find(s => s.channel === ch && s.index === targetIdx);
      if (target) openStreamViewer(target);
    } else if (action === 'prev-stream') {
      _svPlayPrev();
    } else if (action === 'next-stream') {
      _svPlayNext();
    } else if (action === 'toggle-play') {
      _svTogglePlayback();
    } else if (action === 'bookmark-stream') {
      _svOpenPlaylistModal(skey, stream.title || '配信', btn);
    }
  };

  _svQueueAfterRender(el);
  try {
    const isPlaying = (_svPlayer || _miniPlayer)?.getPlayerState?.() === window.YT?.PlayerState?.PLAYING;
    _svUpdatePlayToggle(isPlaying);
  } catch (_) {}
}

// ─── MV モード: プレイヤー下コンテンツ ──────────────────────────────────────

let _mvVideosCache = null; // music.json の動画リストキャッシュ

async function _mvFetchVideos() {
  if (_mvVideosCache) return _mvVideosCache;
  try {
    const res = await fetch('data/music.json');
    _mvVideosCache = (await res.json())?.videos || [];
  } catch (_) {
    _mvVideosCache = [];
  }
  return _mvVideosCache;
}

/** MV タイトルから曲名部分を推定（「MV⌇曲名/歌い手」「【歌ってみた】曲名 / …」等） */
function _mvSongTitleGuess(title) {
  let t = String(title || '');
  t = t.replace(/【[^】]*】/g, ' ');               // 【歌ってみた】等の角括弧
  t = t.replace(/^\s*MV[⌇|｜♪♬:：\-\s]*/i, ' ');  // 先頭の MV⌇
  t = t.split(/[\/／|｜]/)[0];                     // 区切り以降（歌い手名など）を捨てる
  t = t.replace(/歌ってみた|covered?\s*(by.*)?$/gi, ' ');
  return t.trim();
}

/** MV モードのプレイヤー下: 関連歌枠 + ほかの動画 */
async function _svRenderBelowPlayerMv(stream) {
  const el = $('#sv-below-player');
  if (!el) return;

  try { await _shellDeps.ensureFullData(); } catch (_) {}
  const videos = await _mvFetchVideos();
  // 描画前に別の動画へ切り替わっていたら何もしない
  if ($('#stream-viewer')?._currentStream !== stream) return;

  // ── 関連歌枠: タイトルから曲名を推定して歌枠を検索 ──
  const streams = state.channelData?.combined?.streams || state.data?.streams || [];
  const guess = _normForMatch(_mvSongTitleGuess(stream.title));
  const related = [];
  if (guess.length > 1) {
    for (const s of streams) {
      const hit = (s.songs || []).find(sg => {
        const n = _normForMatch(sg.title);
        return n === guess || (n.length > 1 && (n.includes(guess) || guess.includes(n)));
      });
      if (hit) related.push({ stream: s, songTitle: hit.title });
    }
  }
  const relatedShown = related.slice(0, 8);

  // ── ほかの動画: 同タイプ優先で最大12件 ──
  const typeLabels = { original: 'オリジナル', office: 'Re:AcT', character: 'キャラソン', cover: 'カバー' };
  const cur = videos.find(v => v.url === stream.url);
  const others = videos
    .filter(v => v.url !== stream.url)
    .sort((a, b) => {
      const sameA = cur && a.type === cur.type ? 1 : 0;
      const sameB = cur && b.type === cur.type ? 1 : 0;
      if (sameA !== sameB) return sameB - sameA;
      return (b.publishedAt || '').localeCompare(a.publishedAt || '');
    })
    .slice(0, 12);
  const curIdx = videos.findIndex(v => youtubeVideoId(v.url) === youtubeVideoId(stream.url));
  const nextVideo = curIdx >= 0 && curIdx < videos.length - 1 ? videos[curIdx + 1] : null;
  const prevVideo = curIdx > 0 ? videos[curIdx - 1] : null;
  // 現在の動画のプレイリストキー（保存済み判定・栞用）
  const curVidObj = cur || videos.find(v => youtubeVideoId(v.url) === youtubeVideoId(stream.url));
  const mvKey = curVidObj ? 'mv:' + curVidObj.id : '';
  const mvSaved = mvKey ? _svIsSavedInAnyPlaylist(mvKey) : false;
  // キュー再生中はキューの前後を優先
  const q = _svListQueue;
  const qActive = !!q?.items?.length;
  const canPrev = (qActive && q.idx > 0) || !!prevVideo;
  const canNext = (qActive && q.idx < q.items.length - 1) || !!nextVideo;

  el.innerHTML = `
    <div class="sv-bp-wrap">
      ${_svQueueSectionHtml()}
      <!-- 操作（歌枠ビューワーと同じ: 前へ / 再生停止 / 次へ / 連続再生 / リピート / 栞）-->
      <div class="sv-bp-section sv-bp-section--nav">
        <div class="sv-bp-control-bar">
          <button class="sv-bp-control-btn" type="button" data-mv-action="mv-prev"
            ${canPrev ? '' : 'disabled'} data-tooltip="前の動画" aria-label="前の動画">${icon('previous')}</button>
          <button class="sv-bp-control-btn sv-bp-control-btn--play" type="button" data-mv-action="toggle-play"
            data-tooltip="再生 / 一時停止" aria-label="再生 / 一時停止">${icon('play')}</button>
          <button class="sv-bp-control-btn" type="button" data-mv-action="mv-next"
            ${canNext ? '' : 'disabled'} data-tooltip="次の動画" aria-label="次の動画">${icon('next')}</button>
          <label class="sv-bp-ap-label" for="sv-ap-check">
            <span class="sv-bp-ap-switch${_svAutoPlay ? ' sv-bp-ap-switch--on' : ''}">
              <input type="checkbox" id="sv-ap-check" class="sv-bp-ap-check"${_svAutoPlay ? ' checked' : ''}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            連続再生
          </label>
          <label class="sv-bp-ap-label" for="sv-repeat-check">
            <span class="sv-bp-ap-switch${_svRepeat ? ' sv-bp-ap-switch--on' : ''}">
              <input type="checkbox" id="sv-repeat-check" class="sv-bp-ap-check"${_svRepeat ? ' checked' : ''}>
              <span class="sv-bp-ap-knob"></span>
            </span>
            リピート
          </label>
          <button class="sv-bp-control-btn sv-bp-bookmark-btn${mvSaved ? ' is-saved' : ''}" type="button"
            data-mv-action="bookmark-mv" data-mv-key="${escapeHtml(mvKey)}" aria-pressed="${mvSaved}"
            data-tooltip="${mvSaved ? 'プレイリストに保存済み' : 'プレイリストに保存'}"
            aria-label="${mvSaved ? 'プレイリストに保存済み' : 'プレイリストに保存'}">${_svBookmarkSvg()}</button>
        </div>
        <div class="sv-bp-next-hint">
          ${nextVideo
            ? `次：${escapeHtml(nextVideo.title || '次の動画')}`
            : `<span class="sv-bp-ap-hint--end">（最後の動画）</span>`}
        </div>
      </div>
      ${relatedShown.length ? `
      <div class="sv-bp-section">
        <div class="sv-bp-sh">${icon('mic')} この曲が歌われた歌枠 <span class="sv-bp-sh-sub">（全${related.length}回）</span></div>
        <div class="sv-bp-related-list">
          ${relatedShown.map(r => {
            const rthumb = youtubeThumb(r.stream.url);
            return `<button class="sv-bp-rel-card" type="button" data-mv-action="open-stream" data-mv-channel="${escapeHtml(r.stream.channel)}" data-mv-index="${r.stream.index}">
              ${rthumb ? `<img class="sv-bp-rel-thumb" src="${escapeHtml(rthumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<div class="sv-bp-rel-thumb sv-bp-rel-thumb--empty"></div>'}
              <div class="sv-bp-rel-info">
                <div class="sv-bp-rel-title">${escapeHtml(r.stream.title || '配信')}</div>
                <div class="sv-bp-rel-meta">${fmtDate(r.stream.date)}　第${r.stream.index}枠</div>
                <div class="sv-bp-rel-songs">${icon('music')} ${escapeHtml(r.songTitle)}</div>
              </div>
            </button>`;
          }).join('')}
        </div>
      </div>
      ` : ''}

      ${others.length ? `
      <div class="sv-bp-section">
        <div class="sv-bp-sh">${icon('video')} ほかの動画 <button class="sv-mv-all-btn" type="button" data-mv-action="all-videos">すべて見る →</button></div>
        <div class="sv-mv-grid">
          ${others.map(v => {
            const thumb = youtubeThumb(v.url);
            return `<button class="sv-mv-card" type="button" data-mv-action="open-mv" data-mv-url="${escapeHtml(v.url)}" data-mv-title="${escapeHtml(v.title)}">
              ${thumb ? `<img class="sv-mv-card-thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<div class="sv-mv-card-thumb"></div>'}
              <div class="sv-mv-card-body">
                <div class="sv-mv-card-title">${escapeHtml(v.title)}</div>
                <div class="sv-mv-card-type">${typeLabels[v.type] || 'オリジナル'}</div>
              </div>
            </button>`;
          }).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  el.onchange = (e) => {
    const apCheck = e.target.closest('#sv-ap-check');
    const repeatCheck = e.target.closest('#sv-repeat-check');
    if (apCheck) {
      _svAutoPlay = apCheck.checked;
      const sw = apCheck.closest('.sv-bp-ap-switch');
      if (sw) sw.classList.toggle('sv-bp-ap-switch--on', _svAutoPlay);
    }
    if (repeatCheck) {
      _svRepeat = repeatCheck.checked;
      const sw = repeatCheck.closest('.sv-bp-ap-switch');
      if (sw) sw.classList.toggle('sv-bp-ap-switch--on', _svRepeat);
    }
  };

  el.onclick = (e) => {
    if (_svHandleQueueClick(e)) return;
    const btn = e.target.closest('[data-mv-action]');
    if (!btn) return;
    const action = btn.dataset.mvAction;
    if (action === 'open-stream') {
      const ch = btn.dataset.mvChannel;
      const targetIdx = parseInt(btn.dataset.mvIndex, 10);
      const all = state.channelData?.combined?.streams || state.data?.streams || [];
      const target = all.find(s => s.channel === ch && s.index === targetIdx);
      if (target) openStreamViewer(target);
    } else if (action === 'open-mv') {
      openStreamViewer({ url: btn.dataset.mvUrl, title: btn.dataset.mvTitle, isMv: true });
    } else if (action === 'all-videos') {
      _shellDeps.activateTab('playlists');
    } else if (action === 'toggle-play') {
      _svTogglePlayback();
    } else if (action === 'mv-prev') {
      if (qActive && q.idx > 0) _svListQueueOpen(q.idx - 1);
      else _svPlayPrevMv(stream);
    } else if (action === 'mv-next') {
      if (qActive && q.idx < q.items.length - 1) _svListQueueOpen(q.idx + 1);
      else _svPlayNextMv(stream);
    } else if (action === 'bookmark-mv') {
      _svOpenPlaylistModal(btn.dataset.mvKey, stream.title || '動画', btn);
    }
  };

  _svQueueAfterRender(el);
  try {
    const isPlaying = (_svPlayer || _miniPlayer)?.getPlayerState?.() === window.YT?.PlayerState?.PLAYING;
    _svUpdatePlayToggle(isPlaying);
  } catch (_) {}
}

function _svRefreshSetlist(setlistEl, songs, ts, currentIdx) {
  setlistEl.innerHTML = songs.map((s, i) => _svSongRow(s, i, ts, currentIdx)).join('');
}

export function initStreamViewer() {
  if ($('#stream-viewer')) return;
  const panel = $('#panel-player');
  if (!panel) return;
  const el = document.createElement('div');
  el.id = 'stream-viewer';
  el.hidden = true;
  el.setAttribute('aria-label', '配信プレイヤー');
  el.innerHTML = `
    <div class="sv-container">
      <div class="sv-header">
        <button class="sv-close-btn" id="sv-close" type="button" data-tooltip="ミニプレイヤーで再生を続けながら戻ります（Esc）">
          ${icon('arrowLeft')} <span class="sv-close-label">戻る</span><span class="sv-esc-hint">Esc</span>
        </button>
        <div class="sv-title-area">
          <nav class="sv-breadcrumb" aria-label="現在地">
            <button class="sv-bc-btn" type="button" data-bc-tab="dashboard">ホーム</button>
            <span class="sv-bc-sep" aria-hidden="true">/</span>
            <button class="sv-bc-btn" type="button" data-bc-tab="timeline">タイムライン</button>
            <span class="sv-bc-sep" aria-hidden="true">/</span>
            <span class="sv-bc-current" id="sv-bc-title"></span>
          </nav>
          <div class="sv-stream-meta" id="sv-stream-meta"></div>
        </div>
        <button class="sv-fullscreen-btn" id="sv-fullscreen-btn" type="button"
          data-tooltip="大画面で再生" aria-label="大画面で再生" aria-pressed="false">${icon('external')}</button>
        <div class="sv-volume-wrap">
          <button class="vol-btn" id="sv-vol-btn" type="button" aria-label="音量">${icon('volume')}</button>
          <input class="vol-slider" id="sv-vol-slider" type="range" min="0" max="100" value="100" aria-label="音量">
        </div>
        <button class="sv-music-btn" id="sv-music-btn" type="button" data-tooltip="現在位置から音楽プレイヤーで聴く">
          <span class="sv-music-icon">${icon('music')}</span><span class="sv-music-label">音楽プレイヤーで聴く</span>
        </button>
        <button class="sv-share-btn" id="sv-share-btn" type="button" data-tooltip="この動画の共有リンクをコピー">
          <span class="sv-share-icon">${icon('link')}</span><span class="sv-share-label">共有</span>
        </button>
        <a class="sv-yt-link" id="sv-yt-link" href="#" target="_blank" rel="noopener" data-tooltip="YouTubeで開く">
          <span class="sv-yt-icon">${icon('external')}</span><span class="sv-yt-label">YouTubeで開く</span>
        </a>
      </div>
      <div class="sv-body">
        <div class="sv-player-section">
          <div class="sv-player-wrap" id="sv-player-wrap">
            <div class="sv-player-loading">読み込み中…</div>
          </div>
          <div class="sv-below-player" id="sv-below-player"></div>
        </div>
        <div class="sv-panel">
          <div class="sv-panel-head">
            <span>セットリスト</span>
            <div class="sv-panel-head-right">
              <button class="sv-setlist-toggle" id="sv-setlist-toggle" type="button" aria-expanded="true">畳む</button>
              <button class="sv-import-toggle" id="sv-import-toggle" type="button">一括入力</button>
              <button class="sv-cts-bulk-btn" id="sv-cts-bulk-btn" type="button" hidden>セトリ登録</button>
              <span class="sv-song-count" id="sv-song-count"></span>
            </div>
          </div>
          <div class="sv-import-area" id="sv-import-area" hidden>
            <p class="sv-import-desc">タイムスタンプを1行に1つ入力（上から順に曲へ割り当て）</p>
            <textarea class="sv-import-input" id="sv-import-input" rows="6"
              placeholder="例:&#10;15:59&#10;21:12&#10;25:57&#10;1:08:13"></textarea>
            <div class="sv-import-btns">
              <button class="sv-import-apply" id="sv-import-apply" type="button">適用</button>
              <button class="sv-import-cancel" id="sv-import-cancel" type="button">キャンセル</button>
            </div>
          </div>
      <div class="sv-panel-hint">${icon('time')} で現在時刻をメモ ／ バッジをタップで移動</div>
          <div class="sv-setlist" id="sv-setlist"></div>
          <div class="sv-side-related" id="sv-side-related"></div>
        </div>
      </div>
    </div>
  `;
  panel.appendChild(el);

  $('#sv-close').addEventListener('click', () => closeStreamViewer());

  $('#sv-share-btn').addEventListener('click', _svOpenShareModal);
  $('#sv-music-btn').addEventListener('click', _svMoveToMusicBar);

  // 全画面ボタン
  $('#sv-fullscreen-btn').addEventListener('click', enterStreamFullscreen);
  $('#sv-setlist-toggle')?.addEventListener('click', () => _svSetSetlistCollapsed(!_svSetlistCollapsed));
  $('#sv-side-related')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bp-action="open-stream"]');
    if (!btn) return;
    const ch = btn.dataset.bpChannel;
    const targetIdx = parseInt(btn.dataset.bpIndex, 10);
    const target = (state.data?.streams || []).find(s => s.channel === ch && s.index === targetIdx);
    if (target) openStreamViewer(target);
  });

  // 音量
  const svVolSlider = $('#sv-vol-slider');
  const svVolBtn    = $('#sv-vol-btn');
  if (svVolSlider) {
    const v0 = _storedVol();
    svVolSlider.value = v0;
    svVolSlider.style.setProperty('--pct', `${v0}%`);
    if (svVolBtn) svVolBtn.innerHTML = _volIcon(v0);
    svVolSlider.addEventListener('input', e => {
      const v = parseInt(e.target.value);
      e.target.style.setProperty('--pct', `${v}%`);
      _saveVol(v);
      if (svVolBtn) svVolBtn.innerHTML = _volIcon(v);
      if (_svPlayer) try { _svPlayer.setVolume(v); } catch (_) {}
    });
  }
  if (svVolBtn) {
    let _preMute = 80;
    svVolBtn.addEventListener('click', () => {
      if (!svVolSlider) return;
      const cur = parseInt(svVolSlider.value);
      const newV = cur > 0 ? 0 : (_preMute || 80);
      if (cur > 0) _preMute = cur;
      _applyVol(svVolSlider, svVolBtn, _svPlayer, newV);
      _saveVol(newV);
    });
  }

  // パンくずナビゲーション
  el.querySelectorAll('[data-bc-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      // ダッシュボード内セクション誘導は body 委譲が担う（viewer close 含む）
      if (btn.dataset.dashboardSection) return;
      _epPrevTab = btn.dataset.bcTab;
      closeStreamViewer();
    });
  });

  // 一括インポート
  $('#sv-import-toggle').addEventListener('click', () => {
    const area = $('#sv-import-area');
    if (!area) return;
    area.hidden = !area.hidden;
    if (!area.hidden) $('#sv-import-input')?.focus();
  });
  $('#sv-import-cancel').addEventListener('click', () => {
    const area = $('#sv-import-area');
    if (area) { area.hidden = true; }
    const input = $('#sv-import-input');
    if (input) input.value = '';
  });
  $('#sv-import-apply').addEventListener('click', () => {
    const stream = el._currentStream;
    if (!stream) return;
    const input = $('#sv-import-input');
    if (!input) return;
    const lines = input.value.split('\n');
    const times = lines.map(l => _parseTs(l)).filter(t => t !== null);
    if (!times.length) return;
    const ts = _svLoadTs(stream);
    times.forEach((t, i) => { if (i < stream.songs.length) ts[i] = t; });
    _svSaveTs(stream, ts);
    _svRefreshSetlist($('#sv-setlist'), stream.songs, ts, _svCurSongIdx);
    const area = $('#sv-import-area');
    if (area) area.hidden = true;
    input.value = '';
  });

  $('#sv-cts-bulk-btn').addEventListener('click', () => {
    const stream = el._currentStream;
    if (stream) _svShowBulkProposeModal(stream);
  });

  $('#sv-setlist').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    const stream = el._currentStream;
    if (!stream) return;
    const ts = _svLoadTs(stream);

    if (btn.dataset.action === 'seek') {
      if (ts[idx] != null && _svPlayer?.seekTo) {
        _svPlayer.seekTo(ts[idx], true);
        try { _svPlayer.playVideo(); } catch (_) {}
      }
    } else if (btn.dataset.action === 'set-ts') {
      const time = _svPlayer?.getCurrentTime?.();
      if (time != null) {
        ts[idx] = Math.floor(time);
        _svSaveTs(stream, ts);
        _svRefreshSetlist($('#sv-setlist'), stream.songs, ts, _svCurSongIdx);
      }
    } else if (btn.dataset.action === 'del-ts') {
      delete ts[idx];
      _svSaveTs(stream, ts);
      _svRefreshSetlist($('#sv-setlist'), stream.songs, ts, _svCurSongIdx);
    } else if (btn.dataset.action === 'cts-seek') {
      const sec = Number(btn.dataset.ctsSeconds);
      if (!isNaN(sec) && _svPlayer?.seekTo) {
        _svPlayer.seekTo(sec, true);
        try { _svPlayer.playVideo(); } catch (_) {}
      }
    } else if (btn.dataset.action === 'cts-propose') {
      const song = stream.songs[idx];
      _svShowProposeModal(stream, idx, song?.title || `曲 ${idx + 1}`);
    }
  });
}

export function openStreamViewer(stream, resumeAt = 0) {
  if (!stream?.url) return;
  const id = youtubeVideoId(stream.url);
  if (!id) { playYouTubeInline(stream.url); return; }
  if (_isResponsivePlaybackDisabled()) {
    window.open(_youtubeExternalUrl(stream.url, resumeAt), '_blank', 'noopener');
    return;
  }

  initStreamViewer();
  _loadYtApi();
  _svStopEndedWatch();

  // キュー外から動画を開いた場合はマイリストキューを解除
  if (!_svQueueNavigating) _svListQueue = null;

  // 退避中で同じ動画 → そのまま復帰（リロードなし）
  const curViewer = $('#stream-viewer');
  if (_svIsDocked(curViewer)) {
    if (curViewer._currentStream?.url === stream.url) {
      if (!_svUnminify() && !_musicBridge?.restoreExternalPlayer?.()) _svRestoreFromMusicBar();
      if (resumeAt > 0) {
        try { _svPlayer?.seekTo(Math.floor(resumeAt), true); _svPlayer?.playVideo(); } catch (_) {}
      }
      return;
    }
    _svDiscardMini(); // 別の動画 → 退避中のプレイヤーを破棄して通常オープン
  }

  const musicHandoff = _musicBridge?.takeOverVideo?.(stream.url) || null;
  if (!musicHandoff) {
    // 同一動画の2プレイヤー競合で再生が壊れるのを防ぐ。
    (_musicBridge?.releaseVideo || _musicBridge?.pause)?.();
  }

  // ミニプレイヤーが表示中なら即時破棄（同一ページで2プレイヤー競合を防ぐ）
  const miniPanel = $('#yt-player-panel');
  if (miniPanel && !miniPanel.hidden) {
    try { _miniPlayer?.pauseVideo(); } catch (_) {}
    miniPanel.hidden = true;
    _miniDestroyPlayer();
  }
  _svLastStream = null;

  // 全画面中なら埋め込みに戻してから開く
  if (_svFullscreen) {
    _svFullscreen = false;
    const existingViewer = $('#stream-viewer');
    if (existingViewer) existingViewer.classList.remove('sv-fullscreen');
    document.body.classList.remove('has-sv-fullscreen');
    document.body.style.overflow = '';
  }
  _svFullscreen = false;

  // 埋め込みプレイヤーパネルを表示
  showPlayerPanel();

  const viewer = $('#stream-viewer');
  viewer.classList.remove('sv-fullscreen');
  viewer.classList.toggle('sv-mv-mode', !!stream.isMv);
  // 縦型配信/ショートはタイトル・URL から判定し、縦長プレイヤーで黒帯を抑える
  const _vertical = _svIsVerticalStream(stream);
  viewer.classList.toggle('sv-portrait', _vertical);
  viewer._currentStream = stream;
  _svApplySetlistCollapsed();
  const gen = ++_svGen;

  // パンくずリンクを用途に合わせて切り替え（MV: プレイリスト / 配信: タイムライン）
  const bcBtns = viewer.querySelectorAll('[data-bc-tab]');
  if (bcBtns[1]) {
    if (stream.isMv) {
      bcBtns[1].dataset.bcTab = 'playlists';
      bcBtns[1].textContent = 'プレイリスト';
    } else {
      bcBtns[1].dataset.bcTab = 'timeline';
      bcBtns[1].textContent = 'タイムライン';
    }
  }

  // パンくずタイトルを更新
  const bcTitleEl = $('#sv-bc-title');
  if (bcTitleEl) bcTitleEl.textContent = stream.title || '配信';
  const metaEl = $('#sv-stream-meta');
  if (metaEl) metaEl.innerHTML = stream.isMv ? '' : `${fmtDate(stream.date)}　第${stream.index}枠　${icon('mic')} ${stream.songs.length}曲`;
  const ytLink = $('#sv-yt-link');
  if (ytLink) ytLink.href = stream.url;
  const songCount = $('#sv-song-count');
  if (songCount) songCount.textContent = stream.isMv ? '' : `${stream.songs.length}曲`;

  _svCommunityTs = {};
  if (stream.isMv) {
    // MV モード: セットリスト不要。プレイヤー下は関連歌枠+ほかの動画で埋める
    const setlist = $('#sv-setlist');
    if (setlist) setlist.innerHTML = '';
    const belowPlayer = $('#sv-below-player');
    if (belowPlayer) belowPlayer.innerHTML = '';
    const sideRelated = $('#sv-side-related');
    if (sideRelated) sideRelated.innerHTML = '';
    _svRenderBelowPlayerMv(stream);
  } else {
    const ts = _svLoadTs(stream);
    _svRefreshSetlist($('#sv-setlist'), stream.songs, ts, _svCurSongIdx);
    _svLoadCommunityTs(stream);
    _svRenderBelowPlayer(stream);
  }

  viewer.hidden = false;
  // 標準サイドバーは常時表示（ビューワー表示中も隠さない。全画面時は overlay が覆う）
  document.body.style.overflow = ''; // 埋め込みモードではスクロールロックしない
  _svUpdateUrl();
  // 集中表示: ヒーロー/タブは CSS で隠れるので、プレイヤーを画面上部に出す
  window.scrollTo({ top: 0, behavior: 'auto' });
  // フォーカス先: 埋め込み時はスクロールを引き起こさないよう遅延
  setTimeout(() => { $('#sv-close')?.focus({ preventScroll: true }); }, 50);

  try { _svPlayer?.destroy(); } catch (_) {} // 動画切替時の旧プレイヤーを破棄(リーク防止)
  _svPlayer = null;
  const wrap = $('#sv-player-wrap');
  wrap.innerHTML = '<div class="sv-player-loading">読み込み中…</div>';

  const startSec = Math.floor(resumeAt || musicHandoff?.currentTime || 0);

  if (musicHandoff?.player) {
    wrap.innerHTML = '';
    if (musicHandoff.iframe) {
      musicHandoff.iframe.style.width = '100%';
      musicHandoff.iframe.style.height = '100%';
      wrap.appendChild(musicHandoff.iframe);
    } else {
      wrap.innerHTML = `<div class="sv-player-loading">再生を引き継ぎました</div>`;
    }
    _svPlayer = musicHandoff.player;
    try {
      _svPlayer.setVolume?.(_storedVol());
      if (startSec > 1) _svPlayer.seekTo?.(startSec, true);
      _svPlayer.playVideo?.();
    } catch (_) {}
    _applyVol($('#sv-vol-slider'), $('#sv-vol-btn'), null, _storedVol());
    _svUpdatePlayToggle(true);
    _svStartEndedWatch(gen, viewer);
    return;
  }

  _onYtReady(() => {
    if (gen !== _svGen || viewer.hidden) return;
    wrap.innerHTML = '';
    const playerDiv = document.createElement('div');
    wrap.appendChild(playerDiv);
    try {
      _svPlayer = new window.YT.Player(playerDiv, {
        videoId: id,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          origin: location.origin,
          rel: 0,
          modestbranding: 1,
          ...(startSec > 0 ? { start: startSec } : {}),
        },
        events: {
          onReady: (event) => {
            const v = _storedVol();
            try { event.target.setVolume(v); } catch (_) {}
            _applyVol($('#sv-vol-slider'), $('#sv-vol-btn'), null, v);
            try { event.target.setPlaybackQuality('hd1080'); } catch (_) {}
            try { event.target.setPlaybackQualityRange('hd720', 'hd1080'); } catch (_) {}
            if (startSec > 5) {
              try { event.target.seekTo(startSec, true); } catch (_) {}
            }
          },
          onStateChange: (event) => {
            if (gen !== _svGen) return;
            _svUpdatePlayToggle(event.data === window.YT.PlayerState.PLAYING);
            if (event.data === window.YT.PlayerState.PLAYING) {
              try { event.target.setPlaybackQuality('hd1080'); } catch (_) {}
            }
            if (event.data === window.YT.PlayerState.ENDED) _svHandleEnded(viewer);
          },
          onError: () => {
            if (gen !== _svGen) return;
            try { _svPlayer?.destroy(); } catch (_) {} // 壊れたプレイヤーの所有を解放
            _svPlayer = null;
            wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${escapeHtml(id)}?autoplay=1&playsinline=1&rel=0&origin=${encodeURIComponent(location.origin)}${startSec > 0 ? `&start=${startSec}` : ''}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
          },
        },
      });
    } catch (_) {
      wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${escapeHtml(id)}?autoplay=1&playsinline=1&rel=0&origin=${encodeURIComponent(location.origin)}${startSec > 0 ? `&start=${startSec}` : ''}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    }
  });
}

export function closeStreamViewer() {
  const viewer = $('#stream-viewer');
  if (!viewer || viewer.hidden || _svIsDocked(viewer)) return;

  // ── 全画面モードの場合 → 埋め込みに戻るだけ（ミニプレイヤーは起動しない）──
  if (_svFullscreen) {
    _svFullscreen = false;
    viewer.classList.remove('sv-fullscreen');
    document.body.classList.remove('has-sv-fullscreen');
    document.body.style.overflow = '';
    const closeBtn = $('#sv-close');
    if (closeBtn) closeBtn.setAttribute('data-tooltip', 'ミニプレイヤーで再生を続けながら戻ります（Esc）');
    const fsBtn = $('#sv-fullscreen-btn');
    if (fsBtn) fsBtn.setAttribute('aria-pressed', 'false');
    _setPlayerMode('embedded');
    return; // 動画はそのまま継続再生
  }

  // ── 埋め込み → ミニ化: 同じ iframe を CSS で縮小表示（リロードなし・ゼロラグ）──
  if (_svMinify()) return;

  // プレイヤー未生成など → 通常クローズ
  ++_svGen;
  viewer.hidden = true;
  viewer._currentStream = null;
  _svStopEndedWatch();
  _svPlayer = null;
  const wrap = $('#sv-player-wrap');
  if (wrap) wrap.innerHTML = '';
  document.body.style.overflow = '';
  // ビューワーを閉じたらサイドバーを復元（プレイリストタブ中は引き続き非表示）
  _setPlayerMode('idle');
  _shellDeps.setSidebarHidden(false); // サイドバーは常時表示
  hidePlayerPanel();
  _svUpdateUrl();
}

/** 配信ミニプレイヤー（yt-player-panel にドック中 or インライン）を閉じる。
 *  音楽バー再生開始時に呼び、ミニプレイヤーとバーが二重に出るのを防ぐ。 */
export function closeStreamMiniPlayer() {
  const viewer = $('#stream-viewer');
  if (_svIsDocked(viewer)) { _svDiscardMini(); return true; }
  const panel = $('#yt-player-panel');
  if (panel && !panel.hidden) {
    panel.hidden = true;
    _miniDestroyPlayer();
    _svLastStream = null;
    _setPlayerMode('idle');
    return true;
  }
  return false;
}

// music-player.js が起動時に登録する連携ブリッジ(音楽バー⇔ビューワーの引き継ぎ)。
// window.__* の代わりにモジュール間の明示的な登録で結合する。
let _musicBridge = null;
let _musicBridgeLoading = null;
export function registerMusicBridge(bridge) { _musicBridge = bridge; }
// bridge は music-player.js のモジュール評価時に登録される。破壊的移譲(ビューワーを
// 閉じてから再生要求を渡す)で要求を失わないよう、ロード完了と initMusicPlayer
// (#music-bar の DOM 生成、冪等)の両方を保証してから解決する。
// 注意: bootstrap 側の import().then(initMusicPlayer) とは別 promise のため、
// bridge 登録済みでも DOM 未生成の瞬間があり得る。fast path は置かない。
function _ensureMusicBridge() {
  if (!_musicBridgeLoading) {
    _musicBridgeLoading = import('../music-player.js')
      .then((m) => { m.initMusicPlayer(); return _musicBridge; })
      .catch(() => null);
  }
  return _musicBridgeLoading;
}

// テスト・コンソールデバッグ用の公開フック。モジュール間連携には使用しない。
window.__ibaraDebug = { openStreamViewer, playMyListInViewer };
