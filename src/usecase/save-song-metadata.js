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
import { buildSongKey, UNKNOWN_ARTIST_NAME } from '../domain/song/song-key.js';
import { normalize, normalizedKey } from '../domain/shared/text.js';
import { ValidationError } from '../domain/error/validation-error.js';
import { NotFoundError } from '../domain/error/not-found-error.js';

/**
 * @typedef {object} SaveSongMetadataDeps
 * @property {import('../domain/port/repositories/song-repository.js').SongRepository} songs
 * @property {import('../domain/port/repositories/artist-repository.js').ArtistRepository} [artists]
 * @property {import('../domain/port/clock.js').Clock} [clock]
 */

/**
 * @typedef {object} SaveSongMetadataInput
 * @property {number|string} songId   - 更新対象の曲 ID
 * @property {string} [title]         - 曲名
 * @property {string} [artist]        - アーティスト名
 * @property {string} [displayKey]    - キー表示値 (parseDisplayKey で検証)
 * @property {string} [genre]         - ジャンル文字列 (parseGenre で検証)
 */

/**
 * 曲のメタデータ (title, artist, displayKey, genre) を更新する。
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
  const cleanTitle = input.title === undefined ? song.title : normalize(input.title);
  if (!cleanTitle) {
    throw new ValidationError('曲名を入力してください');
  }

  const rawArtist = input.artist === undefined ? song.artist : input.artist;
  const cleanArtist = normalize(rawArtist || UNKNOWN_ARTIST_NAME) || UNKNOWN_ARTIST_NAME;
  const songKey = buildSongKey(cleanTitle, cleanArtist);
  const existing = await deps.songs.findByKey(songKey);
  if (existing && existing.id !== songId) {
    throw new ValidationError('同じ曲名とアーティスト名の曲が既に存在します');
  }

  let artistId = song.artist_id ?? undefined;
  if (input.artist !== undefined) {
    if (!deps.artists || !deps.clock) {
      throw new ValidationError('アーティスト更新に必要な依存がありません');
    }
    const normalizedName = normalizedKey(cleanArtist);
    const existingArtist = await deps.artists.findByNormalizedName(normalizedName);
    artistId = existingArtist
      ? existingArtist.id
      : (await deps.artists.insert({
          name: cleanArtist,
          normalizedName,
          createdAt: deps.clock.now().toISOString(),
        })).id;
  }

  await deps.songs.updateMetadata(songId, {
    title: cleanTitle,
    normalizedTitle: normalizedKey(cleanTitle),
    artistId,
    songKey,
    displayKey,
    genre,
  });
}
