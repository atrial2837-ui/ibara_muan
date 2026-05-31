/**
 * @module usecase/save-song-metadata
 * @description 曲メタデータ保存 UseCase。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:341-350 (saveSongMetadata 関数)
 *   - admin-server/server.js (同等部分)
 *
 * @副作用 なし (Repository への書き込みのみ)
 */

import { parseDisplayKey } from '../domain/song/display-key.js';
import { parseGenre } from '../domain/song/genre.js';
import { ValidationError } from '../domain/error/validation-error.js';
import { NotFoundError } from '../domain/error/not-found-error.js';

/**
 * @typedef {object} SaveSongMetadataDeps
 * @property {import('../domain/port/repositories/song-repository.js').SongRepository} songs
 */

/**
 * @typedef {object} SaveSongMetadataInput
 * @property {number|string} songId   - 更新対象の曲 ID
 * @property {string} [displayKey]    - キー表示値 (parseDisplayKey で検証)
 * @property {string} [genre]         - ジャンル文字列 (parseGenre で検証)
 */

/**
 * 曲のメタデータ (displayKey, genre) を更新する。
 *
 * 既存実装 (admin:341-350) に準拠:
 *   - songId が数値に変換できなければ ValidationError
 *   - displayKey を parseDisplayKey で正規化
 *   - genre を parseGenre で正規化
 *   - songs.updateMetadata を呼び出す
 *
 * @param {SaveSongMetadataDeps} deps
 * @param {SaveSongMetadataInput} input
 * @returns {Promise<void>}
 */
export async function saveSongMetadata(deps, input) {
  const songId = Number(input.songId);
  if (!songId || !Number.isFinite(songId)) {
    throw new ValidationError('songId は正の整数で指定してください');
  }

  const song = await deps.songs.findById(songId);
  if (!song) {
    throw new NotFoundError(`song not found: id=${songId}`);
  }

  const displayKey = parseDisplayKey(input.displayKey ?? '');
  const genre = parseGenre(input.genre ?? '');

  await deps.songs.updateMetadata(songId, { displayKey, genre });
}
