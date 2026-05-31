/**
 * @module domain/search/sort
 * @description 曲リストのソート。
 *
 * 既存: docs/js/views/songs.js:576-593
 * @副作用 なし (非破壊)
 */

import { toTimestamp } from './filter.js';

/**
 * @typedef {'count-desc'|'count-asc'|'recent'|'oldest'|'title'|'artist'} SongSortMode
 */

/**
 * @param {ReadonlyArray<object>} songs
 * @param {SongSortMode} sort
 * @param {boolean} [isFuzzy=false]
 * @returns {object[]}
 */
export function sortSongs(songs, sort, isFuzzy = false) {
  const cmpDate = (a, b, dir) => {
    const av = a.lastSung ? toTimestamp(a.lastSung) : (dir === 'desc' ? -Infinity : Infinity);
    const bv = b.lastSung ? toTimestamp(b.lastSung) : (dir === 'desc' ? -Infinity : Infinity);
    return dir === 'desc' ? bv - av : av - bv;
  };
  const list = [...songs];
  switch (sort) {
    case 'count-asc':
      list.sort((a, b) => a.count - b.count || a.title.localeCompare(b.title, 'ja'));
      break;
    case 'recent':
      list.sort((a, b) => cmpDate(a, b, 'desc'));
      break;
    case 'oldest':
      list.sort((a, b) => cmpDate(a, b, 'asc'));
      break;
    case 'title':
      list.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
      break;
    case 'artist':
      list.sort((a, b) => a.artist.localeCompare(b.artist, 'ja') || b.count - a.count);
      break;
    case 'count-desc':
    default:
      if (!isFuzzy) list.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'ja'));
      break;
  }
  return list;
}
