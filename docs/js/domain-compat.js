/**
 * @module domain-compat
 * @description src/domain/ へのブリッジ。
 * esbuild が docs/js/ をバンドルする際に src/domain/ の純粋関数を直接参照する。
 */

export { normalize, normalizedKey, escapeHtml, escapeRegExp } from '../../src/domain/shared/text.js';
export { parseDateIso, monthKey, daysSince, daysClass, formatDateRaw, formatMonth } from '../../src/domain/shared/date.js';
export { buildSongKey } from '../../src/domain/song/song-key.js';
export { GENRE_LIST } from '../../src/domain/song/genre.js';
export { withDenseRank } from '../../src/domain/analytics/rank.js';
export { deriveArtists } from '../../src/domain/analytics/artist-stats.js';
export { computeComebacks } from '../../src/domain/analytics/comeback.js';
export {
  periodHits, countStreamsThisMonth, countSongsThisMonth, countNewSongsThisMonth,
  buildMonthly, isoDate, heatLevel, buildHeatmap,
} from '../../src/domain/analytics/dashboard.js';
export {
  inferStatsTags, inferGenreMoodTags, inferGenreTags, inferSeasonTags,
  inferMoodTags, inferCompositeTags, inferCompoundTags, inferAllTags,
  singerTags, trendLabel,
} from '../../src/domain/analytics/tagging.js';
export {
  compareNumeric, applyFieldFilters, applyGenreFilter, applyTagFilter,
  applySingerMode, filterByTextIncludes, toTimestamp,
} from '../../src/domain/search/filter.js';
export { sortSongs } from '../../src/domain/search/sort.js';
export { matchReasons } from '../../src/domain/search/match.js';
export { parseQuery } from '../../src/domain/search/query-parser.js';
