/**
 * @module domain/search/match
 * @description 検索マッチ理由の説明。
 *
 * 既存: docs/js/search.js:181-199
 * @副作用 なし
 */

import { normalize } from '../shared/text.js';
import { parseQuery } from './query-parser.js';

/**
 * @param {object} song
 * @param {string} query
 * @returns {string[]}
 */
export function matchReasons(song, query) {
  const q = normalize(query).toLowerCase();
  if (!q) return [];
  const { tokens, filters } = parseQuery(q);
  const reasons = [];
  for (const f of filters) {
    if (!reasons.includes(f.key)) reasons.push(f.key);
  }
  const phrase = tokens.join(' ');
  if (phrase) {
    const contains = (value) => normalize(value).toLowerCase().includes(phrase);
    if (contains(song.title)) reasons.push('曲名');
    if (contains(song.artist)) reasons.push('アーティスト');
    if (contains(song.genreText || song.genre)) reasons.push('ジャンル');
    if (contains(song.tagText)) reasons.push('タグ');
    if (contains(song.moodText)) reasons.push('雰囲気');
    if (contains(song.seasonText)) reasons.push('季節');
    if (contains(song.keyText)) reasons.push('キー');
  }
  return Array.from(new Set(reasons)).slice(0, 4);
}
