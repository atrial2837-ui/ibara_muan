/**
 * @module usecase/upsert-song
 * @description 曲 upsert UseCase。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:212-249 (upsertArtist + upsertSong 関数)
 *   - admin-server/server.js (同等部分)
 *
 * @副作用 なし (Repository への読み書きのみ)
 */

import { normalize, normalizedKey } from '../domain/shared/text.js';
import { buildSongKey, UNKNOWN_ARTIST_NAME } from '../domain/song/song-key.js';

/**
 * @typedef {object} UpsertSongDeps
 * @property {import('../domain/port/repositories/song-repository.js').SongRepository} songs
 * @property {import('../domain/port/repositories/artist-repository.js').ArtistRepository} artists
 * @property {import('../domain/port/clock.js').Clock} clock
 */

/**
 * @typedef {object} UpsertSongInput
 * @property {string} title      - 曲名
 * @property {string} [artist]   - アーティスト名 (空 / 未指定は '(不明)' として扱う)
 * @property {string} [displayKey] - キー表示値 (省略可)
 * @property {string} [genre]    - ジャンル (省略可)
 */

/**
 * @typedef {object} UpsertSongResult
 * @property {number} id      - songs.id
 * @property {string} songKey - 生成または既存の song_key
 * @property {boolean} isNew  - true: 新規挿入, false: 既存更新
 */

/**
 * アーティストを upsert する内部ヘルパー。
 *
 * @param {UpsertSongDeps} deps
 * @param {string} artistName - 正規化済みアーティスト名 (空の場合は '(不明)')
 * @param {string} createdAt
 * @returns {Promise<number>} artist_id
 */
async function upsertArtist(deps, artistName, createdAt) {
  const name = normalize(artistName || UNKNOWN_ARTIST_NAME) || UNKNOWN_ARTIST_NAME;
  const normalizedName = normalizedKey(name);
  const existing = await deps.artists.findByNormalizedName(normalizedName);
  if (existing) return existing.id;
  const result = await deps.artists.insert({ name, normalizedName, createdAt });
  return result.id;
}

/**
 * 曲を upsert する。artist が不明な場合は '(不明)' で登録する。
 *
 * 既存実装 (admin:234-249) に準拠:
 *   1. title/artist を normalize
 *   2. artist が空 or '(不明)' なら '(不明)' として扱う
 *   3. buildSongKey で song_key 生成 (artist='(不明)' 時は空文字として songKey 生成)
 *   4. songs.findByKey で既存チェック
 *      - 既存あり: songs.updateMetadata を呼び (displayKey/genre が指定されていれば)、isNew=false
 *      - 既存なし: artist upsert → songs.insert、isNew=true
 *
 * @param {UpsertSongDeps} deps
 * @param {UpsertSongInput} input
 * @returns {Promise<UpsertSongResult>}
 */
export async function upsertSong(deps, input) {
  const cleanTitle = normalize(input.title);
  const rawArtist = normalize(input.artist || UNKNOWN_ARTIST_NAME) || UNKNOWN_ARTIST_NAME;
  const cleanArtist = rawArtist;

  // buildSongKey: '(不明)' アーティストは空文字として扱う (song-key.js の実装に従う)
  const songKey = buildSongKey(cleanTitle, cleanArtist);

  const existing = await deps.songs.findByKey(songKey);
  if (existing) {
    // 既存あり: displayKey/genre が指定されていれば updateMetadata を呼ぶ
    if (input.displayKey !== undefined || input.genre !== undefined) {
      await deps.songs.updateMetadata(existing.id, {
        displayKey: input.displayKey ?? existing.display_key ?? '',
        genre: input.genre ?? existing.genre ?? '',
      });
    }
    return { id: existing.id, songKey: existing.song_key, isNew: false };
  }

  const createdAt = deps.clock.now().toISOString();
  const artistId = await upsertArtist(deps, cleanArtist, createdAt);

  const result = await deps.songs.insert({
    title: cleanTitle,
    normalizedTitle: normalizedKey(cleanTitle),
    artistId,
    songKey,
    displayKey: input.displayKey ?? '',
    genre: input.genre ?? '',
    createdAt,
  });

  return { id: result.id, songKey, isNew: true };
}
