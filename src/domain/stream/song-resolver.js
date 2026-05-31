/**
 * @module stream/song-resolver
 * @description セトリ登録時の曲解決ロジック。DB から取得済みの SongRow[] を受け取り、
 * 純粋関数として既存曲とのマッチングを行う。
 *
 * 既存実装の所在 (Phase 2 でこれらを本モジュールへ差し替え予定):
 *   - functions/api/admin/[[path]].js:164  (buildSongMaps)
 *   - functions/api/admin/[[path]].js:181  (resolveExistingSong)
 *   - admin-server/server.js:234           (buildSongMaps)
 *   - admin-server/server.js:252           (resolveExistingSong)
 *
 * 差分確認: 両実装のロジックは完全に同一。
 *   [[path]].js は `row.normalized_title` を直接使用し、
 *   server.js は `const key = row.normalized_title` と変数化するが、動作は同じ。
 *
 * 副作用禁止: fetch / DOM / fs / process / env / Date.now() の内部呼び出しゼロ。
 */

import { normalizedKey } from '../shared/text.js';
import { buildSongKey } from '../song/song-key.js';

/**
 * DB から JOIN 済みの曲行を表す型。
 * `artist` フィールドは `artists.name AS artist` の JOIN 結果を想定する。
 *
 * @typedef {object} SongRow
 * @property {number} id
 * @property {string} title
 * @property {string} normalized_title
 * @property {string} artist           - artists.name JOIN 済みの値
 * @property {string} song_key
 * @property {string} [display_key]
 * @property {string} [genre]
 */

/**
 * 曲検索に使うインデックスマップ。
 * buildSongMaps で構築し、resolveExistingSong に注入する。
 *
 * @typedef {object} SongMaps
 * @property {ReadonlyMap<string, SongRow>} byKey     - song_key → SongRow
 * @property {ReadonlyMap<string, SongRow[]>} byTitle - normalized_title → SongRow[]
 */

/**
 * 曲解決の結果種別。
 *
 * - 'exact'     : song_key で完全一致した
 * - 'title'     : normalized_title で 1 件ヒットした
 * - 'ambiguous' : normalized_title で 2 件以上ヒットした (song: null)
 * - 'new'       : どちらにもヒットしなかった (song: null)
 *
 * @typedef {'exact'|'title'|'ambiguous'|'new'} SongMatch
 */

/**
 * resolveExistingSong の戻り値。
 *
 * @typedef {object} ResolveResult
 * @property {string}      key   - 解決したキー。既存曲なら既存の song_key、新規なら合成キー。
 * @property {SongRow|null} song - 既存曲なら SongRow、新規 / ambiguous なら null。
 * @property {SongMatch}   match - 解決種別。
 */

// ---------------------------------------------------------------------------
// buildSongMaps
// ---------------------------------------------------------------------------

/**
 * SongRow の配列から 2 種類の索引 Map を構築する。
 *
 * - byKey   : song_key でルックアップ (O(1) exact match 用)
 * - byTitle : normalized_title でルックアップ (O(1) title match 用)
 *
 * 既存実装 (admin/[[path]].js:164, admin-server:234) を純粋関数化したもの。
 * 元実装は DB を直接クエリしていたが、本関数は受け取った配列のみを使う。
 *
 * @param {SongRow[]} songs - DB から取得済みの曲行配列。
 * @returns {SongMaps}
 */
export function buildSongMaps(songs) {
  /** @type {Map<string, SongRow>} */
  const byKey = new Map();
  /** @type {Map<string, SongRow[]>} */
  const byTitle = new Map();

  for (const row of songs) {
    byKey.set(row.song_key, row);
    if (!byTitle.has(row.normalized_title)) byTitle.set(row.normalized_title, []);
    byTitle.get(row.normalized_title).push(row);
  }

  return { byKey, byTitle };
}

// ---------------------------------------------------------------------------
// resolveExistingSong
// ---------------------------------------------------------------------------

/**
 * パース済みの曲情報を既存曲と照合し、解決結果を返す。
 *
 * 解決アルゴリズム (SoT §4-8 / 既存実装と完全同一):
 *   1. buildSongKey(parsed.title, parsed.artist) で song_key を生成し byKey を検索
 *      → ヒット: match='exact', song=該当行
 *   2. normalizedKey(parsed.title) で byTitle を検索
 *      → 1件: match='title', song=その行
 *      → 2件以上: match='ambiguous', song=null
 *   3. それ以外: match='new', song=null
 *
 * ambiguous 時の song フィールド:
 *   既存実装 ([[path]].js:187, server.js:258) はいずれも `song: null` を返す。
 *   リストの先頭要素は返さない。
 *
 * @param {{ title: string, artist: string }} parsed - splitSongLine の結果など。
 * @param {SongMaps} maps - buildSongMaps で構築した索引。
 * @returns {ResolveResult}
 */
export function resolveExistingSong(parsed, maps) {
  const key = buildSongKey(parsed.title, parsed.artist);

  const exact = maps.byKey.get(key);
  if (exact) return { key, song: exact, match: 'exact' };

  const titleMatches = maps.byTitle.get(normalizedKey(parsed.title)) || [];
  if (titleMatches.length === 1) return { key, song: titleMatches[0], match: 'title' };

  return { key, song: null, match: titleMatches.length > 1 ? 'ambiguous' : 'new' };
}
