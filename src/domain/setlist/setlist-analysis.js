/**
 * @module domain/setlist/setlist-analysis
 * @description セトリバランス分析。
 *
 * 既存: docs/js/views/songs.js:463-480
 * @副作用 なし
 */

/**
 * @typedef {object} SetlistBalance
 * @property {Array<[string, number]>} genres
 * @property {Array<[string, number]>} moods
 * @property {number} keys
 * @property {number} stale
 */

/**
 * @param {ReadonlyArray<object>} items
 * @returns {SetlistBalance}
 */
export function setlistBalance(items) {
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
    genres: topCounts((item) => [item.genre || '未分類']),
    moods: topCounts((item) => item.moodTags || []),
    keys: items.filter((item) => item.displayKey).length,
    stale: items.filter((item) => (item.daysSinceLast ?? 0) >= 180).length,
  };
}
