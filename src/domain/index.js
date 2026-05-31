/**
 * @module domain
 * @description Domain 層のバレル export。
 *
 * 純粋関数群を 1 つの import で参照可能にする。
 * 各サブモジュールは副作用ゼロ (fetch / DOM / fs / process / env / Date.now 内部呼び出しなし)。
 *
 * バックエンド (API/admin-server/tools) は Phase 1-7 で移行済み。
 * フロント (docs/js) は Phase 8 バンドラー導入後にここへ差し替える。
 */

// shared
export * from './shared/text.js';
export * from './shared/date.js';
export * from './shared/id.js';

// song
export * from './song/song-key.js';
export * from './song/display-key.js';
export * from './song/genre.js';

// stream
export * from './stream/setlist-parser.js';
export * from './stream/song-resolver.js';

// analytics
export * from './analytics/rank.js';
export * from './analytics/artist-stats.js';
export * from './analytics/channel-stats.js';
export * from './analytics/tagging.js';
export * from './analytics/data-quality.js';
export * from './analytics/dashboard.js';
export * from './analytics/comeback.js';

// search
export * from './search/query-parser.js';
export * from './search/filter.js';
export * from './search/sort.js';
export * from './search/match.js';

// setlist
export * from './setlist/setlist-analysis.js';

// policy
export * from './policy/admin-auth.js';
