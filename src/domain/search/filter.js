/**
 * @module domain/search/filter
 * @description 曲リストへのフィルタ適用 (field filter / genre / tag / singer mode)。
 *
 * 既存: docs/js/search.js:68-134, docs/js/views/songs.js:274-309
 * @副作用 なし
 */

import { normalize } from '../shared/text.js';
import { parseDateIso } from '../shared/date.js';

/**
 * @param {number} a
 * @param {string} op
 * @param {number} b
 * @returns {boolean}
 */
export function compareNumeric(a, op, b) {
  switch (op) {
    case '>': return a > b;
    case '<': return a < b;
    case '>=': return a >= b;
    case '<=': return a <= b;
    case '=':
    case ':': return a == b;
    default: return true;
  }
}

/**
 * @param {ReadonlyArray<object>} songs
 * @param {ReadonlyArray<{ key: string, op: string, val: string }>} filters
 * @returns {object[]}
 */
export function applyFieldFilters(songs, filters) {
  return songs.filter((song) => {
    for (const f of filters) {
      const v = f.val;
      switch (f.key) {
        case 'title':
          if (!normalize(song.title).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        case 'artist':
          if (!normalize(song.artist).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        case 'genre':
          if (!normalize(song.genreText || song.genre).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        case 'key':
          if (!normalize(song.keyText).toLowerCase().split(/\s+/).includes(normalize(v).toLowerCase())) return false;
          break;
        case 'tag':
          if (!normalize(song.tagText).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        case 'mood':
          if (!normalize(song.moodText).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        case 'season':
          if (!normalize(song.seasonText).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        case 'count': {
          const n = parseFloat(v);
          if (Number.isNaN(n)) return false;
          if (!compareNumeric(song.count, f.op, n)) return false;
          break;
        }
        case 'days': {
          const n = parseFloat(v);
          if (Number.isNaN(n)) return false;
          const d = song.daysSinceLast == null ? Infinity : song.daysSinceLast;
          if (!compareNumeric(d, f.op, n)) return false;
          break;
        }
        case 'last':
          if (v === 'never' || v === 'untouched') {
            if (song.lastSung) return false;
          } else if (v === 'fresh') {
            if (song.daysSinceLast == null || song.daysSinceLast > 30) return false;
          } else if (v === 'stale') {
            if (song.daysSinceLast == null || song.daysSinceLast < 180) return false;
          } else {
            const days = parseInt(String(v).replace(/d$/i, ''), 10);
            if (!Number.isNaN(days)) {
              const d = song.daysSinceLast == null ? Infinity : song.daysSinceLast;
              if (!compareNumeric(d, f.op === ':' ? '<=' : f.op, days)) return false;
            }
          }
          break;
      }
    }
    return true;
  });
}

/**
 * @param {ReadonlyArray<object>} songs
 * @param {string} genre - 'all' またはジャンル名
 * @param {(song: object) => string} [genreLabelFn]
 * @returns {object[]}
 */
export function applyGenreFilter(songs, genre, genreLabelFn = (s) => s.genreText || s.genre || '未分類') {
  if (!genre || genre === 'all') return [...songs];
  return songs.filter((s) => genreLabelFn(s) === genre);
}

/**
 * @param {ReadonlyArray<object>} songs
 * @param {'all'|'fresh'|'stale'|'never'} filter
 * @returns {object[]}
 */
export function applyTagFilter(songs, filter) {
  switch (filter) {
    case 'fresh':
      return songs.filter((s) => s.daysSinceLast != null && s.daysSinceLast <= 30);
    case 'stale':
      return songs.filter((s) => s.daysSinceLast != null && s.daysSinceLast >= 180);
    case 'never':
      return songs.filter((s) => !s.lastSung);
    default:
      return [...songs];
  }
}

/**
 * @param {ReadonlyArray<object>} songs
 * @param {object} options
 * @param {boolean} options.singerMode
 * @param {string} [options.preset]
 * @param {boolean} [options.keyPublished]
 * @returns {object[]}
 */
export function applySingerMode(songs, options) {
  if (!options.singerMode) return [...songs];
  const base = songs.filter((s) => s.lastSung);
  switch (options.preset) {
    case 'keyed':
      return base.filter((s) => s.displayKey);
    case 'classic':
      return base.filter((s) => s.count >= 8);
    case 'stale':
      return base.filter((s) => s.daysSinceLast >= 180);
    case 'rare':
      return base.filter((s) => s.count <= 2);
    default:
      return base.filter((s) =>
        s.displayKey || !options.keyPublished || s.count >= 5 || s.daysSinceLast >= 120,
      );
  }
}

/**
 * テキスト部分一致フィルタ (Fuse 未ロード時のフォールバック)。
 *
 * @param {ReadonlyArray<object>} songs
 * @param {string} phrase
 * @returns {object[]}
 */
export function filterByTextIncludes(songs, phrase) {
  const needle = normalize(phrase).toLowerCase();
  return songs.filter((song) => [
    song.title,
    song.artist,
    song.genreText || song.genre,
    song.tagText,
    song.keyText,
  ].some((value) => normalize(value).toLowerCase().includes(needle)));
}

/**
 * @param {Date|string|null|undefined} value
 * @returns {number}
 */
export function toTimestamp(value) {
  if (!value) return NaN;
  if (value instanceof Date) return value.getTime();
  const d = parseDateIso(value);
  return d ? d.getTime() : NaN;
}
