/**
 * @module usecase/preview-stream
 * @description セトリプレビュー UseCase。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:190-210 (previewStream 関数)
 *   - admin-server/server.js (同等部分)
 *
 * @副作用 なし (Repository への読み取りのみ)
 */

import { splitSongLine } from '../domain/stream/setlist-parser.js';
import { buildSongMaps, resolveExistingSong } from '../domain/stream/song-resolver.js';

/**
 * @typedef {object} PreviewStreamDeps
 * @property {import('../domain/port/repositories/song-repository.js').SongRepository} songs
 */

/**
 * @typedef {object} PreviewStreamInput
 * @property {string} songsText - セトリのテキスト (改行区切り)
 */

/**
 * プレビュー結果の 1 曲分の情報。
 *
 * @typedef {object} PreviewSong
 * @property {number} position         - セトリ内の位置 (1-indexed)
 * @property {string} raw              - 入力テキストそのまま
 * @property {string} title            - 正規化済み曲名
 * @property {string} artist           - 正規化済みアーティスト名
 * @property {string} key              - song_key (既存曲なら既存の key、新規なら合成 key)
 * @property {'exact'|'title'|'ambiguous'|'new'} match - マッチ種別
 * @property {number|null} songId      - 既存曲の ID (新規/ambiguous は null)
 * @property {string} existingTitle    - 既存曲のタイトル (新規は '')
 * @property {string} existingArtist   - 既存曲のアーティスト名 (新規は '')
 * @property {string} displayKey       - 入力値または既存の display_key
 * @property {string} genre            - 入力値または既存の genre
 */

/**
 * @typedef {object} PreviewStreamResult
 * @property {PreviewSong[]} songs
 */

/**
 * セトリテキストを解析し、既存曲との照合結果をプレビューとして返す。
 *
 * 既存実装 (admin:190-210) に準拠:
 *   1. songs.findAll() で全曲を取得し buildSongMaps でインデックス化
 *   2. 入力テキストを改行で分割し、空行を除去
 *   3. 各行を splitSongLine で解析し resolveExistingSong で既存曲と照合
 *   4. PreviewSong[] を返す
 *
 * @param {PreviewStreamDeps} deps
 * @param {PreviewStreamInput} input
 * @returns {Promise<PreviewStreamResult>}
 */
export async function previewStream(deps, input) {
  const allSongs = await deps.songs.findAll();
  const maps = buildSongMaps(allSongs);

  const lines = String(input.songsText ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const songs = lines.map((line, index) => {
    const parsed = splitSongLine(line);
    const resolved = resolveExistingSong(parsed, maps);
    return {
      position: index + 1,
      raw: parsed.raw,
      title: parsed.title,
      artist: parsed.artist,
      key: resolved.key,
      match: resolved.match,
      songId: resolved.song?.id ?? null,
      existingTitle: resolved.song?.title ?? '',
      existingArtist: resolved.song?.artist ?? '',
      displayKey: parsed.displayKey || resolved.song?.display_key || '',
      genre: parsed.genre || resolved.song?.genre || '',
    };
  });

  return { songs };
}
