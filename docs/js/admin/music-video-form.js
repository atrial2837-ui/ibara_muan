/**
 * @module admin/music-video-form
 * @description 歌みた・オリ曲（music.json）の入力チェックと絞り込みの純粋関数群。
 *
 * チェックは「止めるもの(errors)」と「確認だけして進めるもの(warnings)」に分ける。
 * 同じ動画をわざと2件入れたい（別の切り抜き・再掲）ことがあるので、
 * 重複はブロックせず警告にとどめ、押し切れるようにしている。
 *
 * @副作用 なし
 */

/** YouTube の動画ID。watch?v= / youtu.be / live / shorts / embed に対応 */
const VIDEO_ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:live\/|shorts\/|embed\/|watch\?(?:[^#]*&)?v=))([A-Za-z0-9_-]{11})/;

export const MUSIC_VIDEO_TYPES = ['original', 'office', 'character', 'cover'];

/**
 * URL から YouTube の動画IDを取り出す。取れなければ空文字。
 * @param {string} url
 * @returns {string}
 */
export function youtubeIdOf(url) {
  const m = String(url || '').match(VIDEO_ID_RE);
  return m ? m[1] : '';
}

/** 比較用にタイトルをならす（全半角・大小・空白・記号の違いを無視する） */
function normTitle(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　]/g, '')
    .replace(/[!-/:-@[-`{-~、。・！？「」…～－ー―‐⌇]/g, '');
}

/**
 * 動画IDから既定のIDを作る。取れないときは時刻から作る。
 * @param {string} url
 * @param {number} [now] - テスト用に現在時刻を差し込める
 * @returns {string}
 */
export function defaultMusicVideoId(url, now = Date.now()) {
  const videoId = youtubeIdOf(url);
  return videoId ? `mv_${videoId}` : `mv${String(now).slice(-6)}`;
}

/**
 * すでに使われていないIDにする。衝突したら `-2`, `-3` と足す。
 * @param {string} baseId
 * @param {{id?:string}[]} existing
 * @returns {string}
 */
export function nextAvailableId(baseId, existing) {
  const used = new Set((existing || []).map((v) => v?.id));
  if (!used.has(baseId)) return baseId;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${baseId}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${baseId}-${Date.now()}`;
}

/**
 * 入力を検査する。
 *
 * errors があるうちは追加できない。warnings は内容を見せたうえで押し切れる。
 *
 * @param {{url?:string, title?:string, type?:string, id?:string}} entry
 * @param {{id?:string, url?:string, title?:string, type?:string}[]} existing 既存の一覧
 * @returns {{errors:string[], warnings:string[]}}
 */
export function validateMusicVideo(entry, existing = []) {
  const errors = [];
  const warnings = [];
  const url = String(entry?.url || '').trim();
  const title = String(entry?.title || '').trim();
  const type = String(entry?.type || '');

  if (!url) errors.push('YouTube URL を入れてください。');
  else if (!youtubeIdOf(url)) errors.push('YouTube の動画URLとして読み取れません。');
  if (!title) errors.push('タイトルを入れてください。');
  if (type && !MUSIC_VIDEO_TYPES.includes(type)) errors.push(`種別 "${type}" は扱えません。`);

  // ID の重複だけは黙って進めるとデータが壊れるので、必ず別IDへ振り直す前提で警告にする
  const id = String(entry?.id || '').trim();
  if (id && (existing || []).some((v) => v?.id === id)) {
    warnings.push(`ID「${id}」はすでに使われています。このまま進めると別のIDを振り直します。`);
  }

  const videoId = youtubeIdOf(url);
  if (videoId) {
    const same = (existing || []).filter((v) => youtubeIdOf(v?.url) === videoId);
    if (same.length) warnings.push(`同じ動画がすでに${same.length}件あります（${same.map((v) => v.title).join(' / ')}）。`);
  }

  const key = normTitle(title);
  if (key) {
    const sameTitle = (existing || []).filter((v) => normTitle(v?.title) === key && youtubeIdOf(v?.url) !== videoId);
    if (sameTitle.length) warnings.push(`同じタイトルの動画がすでに${sameTitle.length}件あります。`);
  }

  return { errors, warnings };
}

/**
 * 一覧を絞り込む。
 *
 * @param {{id?:string, title?:string, type?:string, originalArtist?:string, character?:string}[]} videos
 * @param {{query?:string, type?:string}} [filters] type は空なら全件
 * @returns {object[]}
 */
export function filterMusicVideos(videos, filters = {}) {
  const list = Array.isArray(videos) ? videos : [];
  const type = filters.type || '';
  const q = normTitle(filters.query);

  return list.filter((v) => {
    if (type && v?.type !== type) return false;
    if (!q) return true;
    const haystack = normTitle([v?.title, v?.originalArtist, v?.character, v?.id].filter(Boolean).join(' '));
    return haystack.includes(q);
  });
}
