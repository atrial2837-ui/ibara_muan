/**
 * 音楽プレイヤーモジュール
 * Spotify風の常駐底バー + キュー管理
 *
 * 使い方:
 *   initMusicPlayer()  — 起動時に一度呼ぶ
 *   notifyYtReady()    — main.js の onYouTubeIframeAPIReady から呼ぶ
 *   playMusicQueue(videos, startIdx) — キューをセットして再生開始
 */

import { $, escapeHtml, youtubeVideoId, youtubeThumb } from './utils.js';

/* ── 状態 ────────────────────────────────────────────────────────────────── */

let _queue    = [];
let _qIdx     = -1;
let _ytPlayer = null;
let _external = null;
let _progIv   = null;
let _continuous = true;
let _repeatOne = false;
let _seenEnded = false;
let _shuffle  = localStorage.getItem('ibaraShuffle') === '1';

let _ytReady = false;
const _ytQ   = [];
let _apiLoader = null;

const _storedVol = () => Math.max(0, Math.min(100, parseInt(localStorage.getItem('ibaraVol') ?? '100') || 100));
const _saveVol   = v  => localStorage.setItem('ibaraVol', String(v));
const _volIcon   = v  => v === 0 ? '🔇' : v < 50 ? '🔉' : '🔊';

/* ── YT API 連携 ─────────────────────────────────────────────────────────── */

/** main.js の window.onYouTubeIframeAPIReady から呼ぶ */
export function notifyYtReady() {
  _ytReady = true;
  _ytQ.splice(0).forEach(fn => fn());
}

/** main.js から _loadYtApi を注入する（循環 import 回避） */
export function setApiLoader(fn) { _apiLoader = fn; }

function _onYtReady(fn) {
  if (_ytReady && window.YT?.Player) { fn(); return; }
  _ytQ.push(fn);
}

/* ── 初期化 ──────────────────────────────────────────────────────────────── */

export function initMusicPlayer() {
  if ($('#music-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'music-bar';
  bar.hidden = true;
  bar.innerHTML = `
    <div class="mbar-progress-track" id="mbar-progress-track">
      <div class="mbar-progress-fill" id="mbar-progress-fill"></div>
    </div>
    <div class="mbar-body">
      <div class="mbar-track-info">
        <div class="mbar-thumb-wrap">
          <div class="mbar-video-wrap" id="mbar-video-wrap"></div>
          <button class="mbar-thumb-overlay" id="mbar-thumb-overlay" type="button" aria-label="動画を開く" title="動画を開く"></button>
        </div>
        <button class="mbar-text" id="mbar-track-info-btn" type="button" title="動画を開く">
          <span class="mbar-title" id="mbar-title">—</span>
          <span class="mbar-sub"   id="mbar-sub">—</span>
        </button>
        <span class="mbar-type-badge" id="mbar-type-badge"></span>
      </div>
      <div class="mbar-controls">
        <button class="mbar-mode-btn is-on" id="mbar-continuous" type="button" aria-pressed="true" title="連続再生">∞</button>
        <button class="mbar-ctrl-btn" id="mbar-prev" type="button" aria-label="前の曲">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
          </svg>
        </button>
        <button class="mbar-play-btn" id="mbar-play" type="button" data-playing="0" aria-label="再生/停止"></button>
        <button class="mbar-ctrl-btn" id="mbar-next" type="button" aria-label="次の曲">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2z"/>
          </svg>
        </button>
        <button class="mbar-mode-btn" id="mbar-repeat" type="button" aria-pressed="false" title="1曲リピート">↻</button>
        <button class="mbar-mode-btn${_shuffle ? ' is-on' : ''}" id="mbar-shuffle" type="button" aria-pressed="${_shuffle ? 'true' : 'false'}" title="シャッフル再生">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
          </svg>
        </button>
      </div>
      <div class="mbar-end">
        <div class="mbar-volume">
          <button class="vol-btn" id="mbar-vol-btn" type="button" aria-label="音量">🔊</button>
          <input class="vol-slider" id="mbar-vol-slider" type="range" min="0" max="100" value="100" aria-label="音量">
        </div>
        <button class="mbar-expand-btn" id="mbar-expand" type="button" title="動画で見る" aria-label="動画で見る">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v12H4V6zm5.5 3.5 5 3-5 3v-6z"/></svg>
        </button>
        <span class="mbar-queue-info" id="mbar-queue-info"></span>
        <button class="mbar-close-btn" id="mbar-close" type="button" aria-label="閉じる">✕</button>
      </div>
    </div>`;
  document.body.appendChild(bar);

  $('#mbar-play').addEventListener('click', _togglePlay);
  $('#mbar-prev').addEventListener('click', playPrev);
  $('#mbar-next').addEventListener('click', playNext);
  $('#mbar-continuous').addEventListener('click', _toggleContinuous);
  $('#mbar-repeat').addEventListener('click', _toggleRepeat);
  $('#mbar-shuffle').addEventListener('click', (e) => {
    _shuffle = !_shuffle;
    try { localStorage.setItem('ibaraShuffle', _shuffle ? '1' : '0'); } catch (_) {}
    e.currentTarget.setAttribute('aria-pressed', _shuffle ? 'true' : 'false');
    e.currentTarget.classList.toggle('is-on', _shuffle);
  });
  $('#mbar-close').addEventListener('click', closeMusicPlayer);

  const volSlider = $('#mbar-vol-slider');
  const volBtn    = $('#mbar-vol-btn');
  if (volSlider) {
    const v0 = _storedVol();
    volSlider.value = v0;
    volSlider.style.setProperty('--pct', `${v0}%`);
    if (volBtn) volBtn.textContent = _volIcon(v0);
    volSlider.addEventListener('input', e => {
      const v = parseInt(e.target.value);
      e.target.style.setProperty('--pct', `${v}%`);
      _saveVol(v);
      if (volBtn) volBtn.textContent = _volIcon(v);
      const player = _player();
      if (player) try { player.setVolume(v); } catch (_) {}
    });
  }
  if (volBtn) {
    let _preMute = 80;
    volBtn.addEventListener('click', () => {
      if (!volSlider) return;
      const cur = parseInt(volSlider.value);
      const newV = cur > 0 ? 0 : (_preMute || 80);
      if (cur > 0) _preMute = cur;
      volSlider.value = newV;
      volSlider.style.setProperty('--pct', `${newV}%`);
      volBtn.textContent = _volIcon(newV);
      const player = _player();
      if (player) try { player.setVolume(newV); } catch (_) {}
    });
  }

  const _openInViewer = () => {
    const video = _queue[_qIdx];
    if (!video?.url) return;
    // 再生位置をビューワーへ引き継ぐ
    let t = 0;
    try { t = _player()?.getCurrentTime?.() || 0; } catch (_) {}
    if (_external?.restore) {
      restoreExternalPlayer();
      return;
    }
    // 歌枠由来のトラックは元の配信オブジェクトでストリームビューワーを開く
    const target = video._stream || { url: video.url, title: video.title, isMv: true };
    releaseMusicPlayerVideo({ hideBar: true });
    window.__openStreamViewer?.(target, t);
  };
  $('#mbar-expand').addEventListener('click', _openInViewer);
  $('#mbar-thumb-overlay').addEventListener('click', _openInViewer);
  $('#mbar-track-info-btn').addEventListener('click', _openInViewer);

  $('#mbar-progress-track').addEventListener('click', (e) => {
    const player = _player();
    if (!player) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    try {
      const dur = player.getDuration?.() || 0;
      if (dur > 0) player.seekTo(pct * dur, true);
    } catch (_) {}
  });

  // Esc キーで閉じる（ビューワー表示中は Esc をビューワー側に譲る）
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const sv = document.getElementById('stream-viewer');
    if (sv && !sv.hidden) return;
    if (!$('#music-bar')?.hidden) closeMusicPlayer();
  });
}

/* ── 公開 API ─────────────────────────────────────────────────────────────── */

export function playMusicQueue(videos, startIdx = 0) {
  if (!videos?.length) return;
  _queue = videos.slice();
  _qIdx  = Math.max(0, Math.min(startIdx, _queue.length - 1));
  _loadTrack(_qIdx);
}

export function playNext() {
  if (!_queue.length) return;
  if (_shuffle && _queue.length > 1) {
    // シャッフル: 現在曲以外からランダムに選ぶ
    let next = _qIdx;
    while (next === _qIdx) next = Math.floor(Math.random() * _queue.length);
    _qIdx = next;
  } else {
    _qIdx = (_qIdx + 1) % _queue.length;
  }
  _loadTrack(_qIdx);
}

export function playPrev() {
  if (!_queue.length) return;
  _qIdx = (_qIdx - 1 + _queue.length) % _queue.length;
  _loadTrack(_qIdx);
}

export function closeMusicPlayer() {
  const bar = $('#music-bar');
  if (!bar) return;
  bar.hidden = true;
  document.body.classList.remove('has-music-bar');
  _stopProg();
  if (_external?.close) {
    const close = _external.close;
    _detachExternal();
    try { close(); } catch (_) {}
  }
  if (_ytPlayer) { try { _ytPlayer.destroy(); } catch (_) {} _ytPlayer = null; }
  _queue = []; _qIdx = -1;
  const wrap = $('#mbar-video-wrap');
  if (wrap) wrap.innerHTML = '';
}

/** 外部から一時停止（ストリームビューワー起動時など） */
export function pauseMusicPlayer() {
  const player = _player();
  if (player) { try { player.pauseVideo(); } catch (_) {} }
}

/** 動画ビューワーへ引き継ぐ際にプレイヤーだけ破棄する。
 *  同じ動画を 2 つの YT プレイヤーが持つと、片方を destroy した時に
 *  もう片方の再生セッションまで壊れる（BUFFERING のまま固まる）ため、
 *  ビューワーの再生が始まる前にバー側のプレイヤーを必ず手放す。
 *  バー・キューは維持し、再生ボタンでプレイヤーを再生成できる。 */
export function releaseMusicPlayerVideo(options = {}) {
  _stopProg();
  if (_external) {
    const close = _external.close;
    _detachExternal();
    if (options.closeExternal !== false && close) {
      try { close(); } catch (_) {}
    }
  }
  if (_ytPlayer) { try { _ytPlayer.destroy(); } catch (_) {} _ytPlayer = null; }
  const wrap = $('#mbar-video-wrap');
  if (wrap) {
    wrap.innerHTML = '';
    const video = _queue[_qIdx];
    const id = video ? youtubeVideoId(video.url) : '';
    if (id) {
      wrap.innerHTML = `<img src="${escapeHtml(youtubeThumb(id))}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
    }
  }
  $('#mbar-play')?.setAttribute('data-playing', '0');
  if (options.hideBar) {
    const bar = $('#music-bar');
    if (bar) bar.hidden = true;
    document.body.classList.remove('has-music-bar');
  }
}

export function isMusicBarVisible() {
  return !$('#music-bar')?.hidden;
}

/** 任意の動画を音楽バーで再生する（ビューワー → バー引き継ぎ用）。
 *  既存キューに同じ動画があればキュー位置を維持して再生し、
 *  なければ単独キューとして再生する。 */
export function playMusicBarVideo(video, startAt = 0) {
  if (!video?.url) return;
  const idx = _queue.findIndex(v => v.url === video.url);
  if (idx >= 0) {
    _qIdx = idx;
    _loadTrack(idx, startAt);
    return;
  }
  _queue = [video];
  _qIdx = 0;
  _loadTrack(0, startAt);
}

export function adoptExternalPlayer(video, player, callbacks = {}) {
  if (!video?.url || !player) return;
  _stopProg();
  if (_ytPlayer) { try { _ytPlayer.destroy(); } catch (_) {} _ytPlayer = null; }
  _external = {
    player,
    restore: callbacks.restore,
    close: callbacks.close,
  };
  const idx = _queue.findIndex(v => v.url === video.url);
  if (idx >= 0) {
    _qIdx = idx;
    _queue[_qIdx] = { ..._queue[_qIdx], ...video };
  } else {
    _queue = [video];
    _qIdx = 0;
  }
  _updateBarInfo(_queue[_qIdx]);
  _showBar();
  _startProg();
  _syncPlayButton();
}

export function takeOverMusicPlayerVideo(url) {
  if (!_ytPlayer || _external) return null;
  const video = _queue[_qIdx];
  if (!video?.url || youtubeVideoId(video.url) !== youtubeVideoId(url)) return null;
  let currentTime = 0;
  try { currentTime = _ytPlayer.getCurrentTime?.() || 0; } catch (_) {}
  let iframe = null;
  try { iframe = _ytPlayer.getIframe?.() || null; } catch (_) {}
  const player = _ytPlayer;
  _ytPlayer = null;
  _stopProg();
  const bar = $('#music-bar');
  if (bar) bar.hidden = true;
  document.body.classList.remove('has-music-bar');
  $('#mbar-play')?.setAttribute('data-playing', '0');
  return { player, iframe, video, currentTime };
}

export function restoreExternalPlayer() {
  if (!_external?.restore) return false;
  const restore = _external.restore;
  _detachExternal();
  _stopProg();
  const bar = $('#music-bar');
  if (bar) bar.hidden = true;
  document.body.classList.remove('has-music-bar');
  $('#mbar-play')?.setAttribute('data-playing', '0');
  try { restore(); } catch (_) {}
  return true;
}

/* ── 内部: トラック読み込み ─────────────────────────────────────────────── */

function _loadTrack(idx, startAt = 0) {
  const video = _queue[idx];
  if (!video) return;
  if (_external?.close) {
    const close = _external.close;
    _detachExternal();
    try { close(); } catch (_) {}
  } else {
    _detachExternal();
  }

  _updateBarInfo(video);
  _showBar();

  const id = youtubeVideoId(video.url);
  if (!id) return;

  if (_apiLoader) _apiLoader();

  const startSec = Math.max(0, Math.floor(startAt));

  _onYtReady(() => {
    const wrap = $('#mbar-video-wrap');
    if (!wrap) return;

    if (_ytPlayer) {
      try { _ytPlayer.loadVideoById({ videoId: id, startSeconds: startSec }); return; } catch (_) {}
    }

    // 新規プレイヤー生成
    wrap.innerHTML = '';
    const div = document.createElement('div');
    wrap.appendChild(div);
    try {
      _ytPlayer = new window.YT.Player(div, {
        videoId: id,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, controls: 0, disablekb: 1, modestbranding: 1, ...(startSec > 1 ? { start: startSec } : {}) },
        events: {
          onReady: ev => {
            const v = _storedVol();
            try { ev.target.setVolume(v); } catch (_) {}
            const s = $('#mbar-vol-slider');
            if (s) { s.value = v; s.style.setProperty('--pct', `${v}%`); }
            const b = $('#mbar-vol-btn');
            if (b) b.textContent = _volIcon(v);
            _startProg();
          },
          onStateChange: (ev) => {
            const pl = ev.data === window.YT?.PlayerState?.PLAYING;
            const btn = $('#mbar-play');
            if (btn) btn.setAttribute('data-playing', pl ? '1' : '0');
            if (pl) _startProg();
            if (ev.data === window.YT?.PlayerState?.ENDED && !_seenEnded) {
              _seenEnded = true;
              _handleEnded();
            }
          },
        },
      });
    } catch (_) {}
  });
}

function _updateBarInfo(video) {
  const title = $('#mbar-title');
  const sub   = $('#mbar-sub');
  const badge = $('#mbar-type-badge');
  const qi    = $('#mbar-queue-info');
  const prev  = $('#mbar-prev');
  const next  = $('#mbar-next');

  if (title) title.textContent = video.title || '—';
  if (sub) {
    if (video.sub)                       sub.textContent = video.sub;
    else if (video.type === 'cover')     sub.textContent = video.originalArtist || 'カバー曲';
    else if (video.type === 'office')    sub.textContent = '公式';
    else if (video.type === 'character') sub.textContent = video.character || 'キャラソン';
    else                                 sub.textContent = '茨むあんオリジナル';
  }
  if (badge) {
    const labels = { original: 'オリジナル', office: '公式', character: 'キャラ', cover: 'カバー', stream: '歌枠' };
    badge.textContent = labels[video.type] || 'オリジナル';
    badge.dataset.type = video.type;
  }
  if (qi)   qi.textContent = _queue.length > 1 ? `${_qIdx + 1} / ${_queue.length}` : '';
  if (prev) prev.disabled = _queue.length <= 1;
  if (next) next.disabled = _queue.length <= 1;
  _syncModeButtons();
}

function _showBar() {
  const bar = $('#music-bar');
  if (!bar) return;
  bar.hidden = false;
  document.body.classList.add('has-music-bar');
}

function _togglePlay() {
  const player = _player();
  if (!player) {
    // ビューワー引き継ぎでプレイヤー解放済み → 現在の曲から再生成
    if (_qIdx >= 0 && _queue.length) _loadTrack(_qIdx);
    return;
  }
  try {
    const st = player.getPlayerState?.();
    if (st === window.YT?.PlayerState?.PLAYING) player.pauseVideo();
    else player.playVideo();
  } catch (_) {}
}

/* ── プログレスバー ──────────────────────────────────────────────────────── */

function _startProg() {
  _stopProg();
  _seenEnded = false;
  _progIv = setInterval(() => {
    const player = _player();
    if (!player) return;
    try {
      const dur = player.getDuration?.() || 0;
      const cur = player.getCurrentTime?.() || 0;
      const pct = dur > 0 ? Math.min((cur / dur) * 100, 100) : 0;
      const fill = $('#mbar-progress-fill');
      if (fill) fill.style.width = `${pct}%`;
      _syncPlayButton();
      const st = player.getPlayerState?.();
      if (st === window.YT?.PlayerState?.ENDED) {
        if (!_seenEnded) _handleEnded();
        _seenEnded = true;
      } else if (st === window.YT?.PlayerState?.PLAYING) {
        _seenEnded = false;
      }
    } catch (_) {}
  }, 500);
}

function _stopProg() {
  if (_progIv) { clearInterval(_progIv); _progIv = null; }
}

function _player() {
  return _external?.player || _ytPlayer;
}

function _detachExternal() {
  _external = null;
}

function _handleEnded() {
  const player = _player();
  if (_repeatOne && player) {
    try { player.seekTo(0, true); player.playVideo(); } catch (_) {}
    return;
  }
  if (_continuous && _queue.length > 1) {
    playNext();
  } else {
    $('#mbar-play')?.setAttribute('data-playing', '0');
  }
}

function _toggleContinuous() {
  _continuous = !_continuous;
  _syncModeButtons();
}

function _toggleRepeat() {
  _repeatOne = !_repeatOne;
  _syncModeButtons();
}

function _syncModeButtons() {
  const cont = $('#mbar-continuous');
  if (cont) {
    cont.classList.toggle('is-on', _continuous);
    cont.setAttribute('aria-pressed', _continuous ? 'true' : 'false');
  }
  const rep = $('#mbar-repeat');
  if (rep) {
    rep.classList.toggle('is-on', _repeatOne);
    rep.setAttribute('aria-pressed', _repeatOne ? 'true' : 'false');
  }
}

function _syncPlayButton() {
  const player = _player();
  const btn = $('#mbar-play');
  if (!player || !btn) return;
  try {
    const st = player.getPlayerState?.();
    btn.setAttribute('data-playing', st === window.YT?.PlayerState?.PLAYING ? '1' : '0');
  } catch (_) {}
}

window.__takeOverMusicPlayerVideo = takeOverMusicPlayerVideo;
window.__restoreMusicExternalPlayer = restoreExternalPlayer;
