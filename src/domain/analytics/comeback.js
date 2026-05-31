/**
 * @module domain/analytics/comeback
 * @description カムバック (最大歌唱間隔) 計算。
 *
 * 既存: docs/js/views/analytics.js:230-247
 * @副作用 なし
 */

import { toTimestamp } from '../search/filter.js';

const MS_PER_DAY = 86400000;

/**
 * @typedef {object} ComebackCandidate
 * @property {object} song
 * @property {number} maxGap
 * @property {Date|string|null} gapStart
 * @property {Date|string|null} gapEnd
 */

/**
 * @param {ReadonlyArray<{ dates?: ReadonlyArray<Date|string> }>} songs
 * @param {number} [limit=10]
 * @returns {ComebackCandidate[]}
 */
export function computeComebacks(songs, limit = 10) {
  const candidates = [];
  for (const s of songs) {
    const dates = s.dates || [];
    if (dates.length < 2) continue;
    const sorted = [...dates].sort((a, b) => toTimestamp(a) - toTimestamp(b));
    let maxGap = 0;
    let gapStart = null;
    let gapEnd = null;
    for (let i = 1; i < sorted.length; i++) {
      const g = Math.floor((toTimestamp(sorted[i]) - toTimestamp(sorted[i - 1])) / MS_PER_DAY);
      if (g > maxGap) {
        maxGap = g;
        gapStart = sorted[i - 1];
        gapEnd = sorted[i];
      }
    }
    candidates.push({ song: s, maxGap, gapStart, gapEnd });
  }
  candidates.sort((a, b) => b.maxGap - a.maxGap);
  return candidates.slice(0, limit);
}
