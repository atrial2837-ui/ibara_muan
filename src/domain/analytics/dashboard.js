/**
 * @module domain/analytics/dashboard
 * @description ダッシュボード集計の純粋関数群。
 *
 * 既存: docs/js/views/dashboard.js:146-291
 * @副作用 なし (today を引数化)
 */

import { monthKey, parseDateIso } from '../shared/date.js';
import { toTimestamp } from '../search/filter.js';

/**
 * @param {Date|string} today
 * @returns {Date}
 */
function asDate(today) {
  if (today instanceof Date) {
    const copy = new Date(today.getTime());
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
  const d = parseDateIso(today);
  if (!d) throw new Error('Invalid today date');
  return d;
}

/**
 * @param {Date|string|null|undefined} value
 * @returns {Date|null}
 */
function asStreamDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  return parseDateIso(value);
}

/**
 * @param {ReadonlyArray<object>} streams
 * @param {'month'|'year'} period
 * @param {Date|string} today
 * @returns {object[]}
 */
export function periodHits(streams, period, today) {
  const now = asDate(today);
  const month = monthKey(now);
  const year = now.getFullYear();
  const counts = new Map();
  for (const stream of streams) {
    const streamDate = asStreamDate(stream.date);
    const inPeriod = period === 'month'
      ? stream.monthKey === month
      : streamDate && streamDate.getFullYear() === year;
    if (!inPeriod) continue;
    for (const song of stream.songs || []) {
      if (!counts.has(song.key)) {
        counts.set(song.key, { ...song, count: 0 });
      }
      counts.get(song.key).count += 1;
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'ja'));
}

/**
 * @param {ReadonlyArray<object>} streams
 * @param {Date|string} today
 * @returns {number}
 */
export function countStreamsThisMonth(streams, today) {
  const ym = monthKey(asDate(today));
  return streams.filter((s) => s.monthKey === ym).length;
}

/**
 * @param {ReadonlyArray<object>} streams
 * @param {Date|string} today
 * @returns {number}
 */
export function countSongsThisMonth(streams, today) {
  const ym = monthKey(asDate(today));
  return streams
    .filter((s) => s.monthKey === ym)
    .reduce((n, s) => n + (s.songs?.length || 0), 0);
}

/**
 * @param {ReadonlyArray<object>} songs
 * @param {Date|string} today
 * @returns {number}
 */
export function countNewSongsThisMonth(songs, today) {
  const ym = monthKey(asDate(today));
  return songs.filter((s) => s.firstSung && monthKey(s.firstSung) === ym).length;
}

/**
 * @param {ReadonlyArray<object>} streams
 * @returns {Array<{ key: string, date: Date, streams: number, songs: number }>}
 */
export function buildMonthly(streams) {
  const months = new Map();
  for (const s of streams) {
    const streamDate = asStreamDate(s.date);
    if (!streamDate) continue;
    if (!months.has(s.monthKey)) {
      months.set(s.monthKey, {
        key: s.monthKey,
        date: new Date(streamDate.getFullYear(), streamDate.getMonth(), 1),
        streams: 0,
        songs: 0,
      });
    }
    const m = months.get(s.monthKey);
    m.streams += 1;
    m.songs += s.songs?.length || 0;
  }
  const all = Array.from(months.values()).sort((a, b) => a.date - b.date);
  if (!all.length) return [];
  const out = [];
  let cur = new Date(all[0].date);
  const end = new Date(all[all.length - 1].date);
  while (cur <= end) {
    const k = monthKey(cur);
    out.push(months.get(k) || { key: k, date: new Date(cur), streams: 0, songs: 0 });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

/**
 * @param {Date} d
 * @returns {string}
 */
export function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * @param {number} v
 * @returns {string}
 */
export function heatLevel(v) {
  if (v <= 0) return '';
  if (v < 8) return 'l1';
  if (v < 16) return 'l2';
  if (v < 25) return 'l3';
  return 'l4';
}

/**
 * @param {ReadonlyArray<object>} streams
 * @param {Date|string} today
 * @returns {Array<{ date: Date, value: number, inRange: boolean, iso: string }>}
 */
export function buildHeatmap(streams, today) {
  const todayDate = asDate(today);
  const start = new Date(todayDate);
  start.setDate(start.getDate() - 364);
  const cellByISO = new Map();
  for (const s of streams) {
    const streamDate = asStreamDate(s.date);
    if (!streamDate || streamDate < start || streamDate > todayDate) continue;
    const k = isoDate(streamDate);
    cellByISO.set(k, (cellByISO.get(k) || 0) + (s.songs?.length || 0));
  }
  const cells = [];
  const startDow = start.getDay();
  const cur = new Date(start);
  cur.setDate(cur.getDate() - startDow);
  for (let i = 0; i < 53 * 7; i++) {
    const inRange = cur >= start && cur <= todayDate;
    cells.push({
      date: new Date(cur),
      value: inRange ? (cellByISO.get(isoDate(cur)) || 0) : -1,
      inRange,
      iso: isoDate(cur),
    });
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

/**
 * @param {ReadonlyArray<object>} songs
 * @param {number} [limit=10]
 * @returns {object[]}
 */
export function topOneShots(songs, limit = 10) {
  return songs
    .filter((s) => s.count === 1)
    .sort((a, b) => (toTimestamp(b.lastSung) || 0) - (toTimestamp(a.lastSung) || 0))
    .slice(0, limit);
}
