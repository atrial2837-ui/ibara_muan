/**
 * @module usecase/search-songs
 * @description 曲検索 UseCase。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:329-339 (searchSongs 関数)
 *   - admin-server/server.js (同等部分)
 *
 * @副作用 なし (Repository への読み取りのみ)
 */

import { normalize } from '../domain/shared/text.js';

/**
 * @typedef {object} SearchSongsDeps
 * @property {import('../domain/port/repositories/song-repository.js').SongRepository} songs
 */

/**
 * @typedef {object} SearchSongsInput
 * @property {string} query - 検索クエリ文字列
 * @property {number} [limit] - 最大取得件数 (デフォルト 80)
 */

/**
 * @typedef {object} SearchSongsResult
 * @property {import('../domain/port/repositories/song-repository.js').Song[]} songs
 */

/**
 * 曲を title / artist / display_key / genre で部分一致検索する。
 *
 * 既存実装 (admin:329-339) に準拠:
 *   - クエリを normalize して前後に % を付けて LIKE 検索
 *   - デフォルト上限 80 件
 *
 * @param {SearchSongsDeps} deps
 * @param {SearchSongsInput} input
 * @returns {Promise<SearchSongsResult>}
 */
export async function searchSongs(deps, input) {
  const query = normalize(input.query ?? '');
  const limit = typeof input.limit === 'number' && input.limit > 0 ? input.limit : 80;

  const songs = await deps.songs.search(query, limit);
  return { songs };
}
