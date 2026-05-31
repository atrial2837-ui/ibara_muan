/**
 * @module song/song-key
 * @description SongKey 値オブジェクト。曲名とアーティスト名から一意の検索キーを生成する。
 *
 * 既存実装の所在 (Phase 2 でこれらを本モジュールへ差し替え予定):
 *   - functions/api/admin/[[path]].js:23   (songKey)
 *   - admin-server/server.js:52            (songKey)
 *   - docs/js/utils.js:9                   (songKey)
 *
 * `(不明)` の扱い:
 *   admin/[[path]].js:236-237 の upsertSong にて:
 *     const cleanArtist = normalize(artist || '(不明)') || '(不明)';
 *     const key = songKey(cleanTitle, cleanArtist === '(不明)' ? '' : cleanArtist);
 *   つまり artist が '(不明)' のとき空文字として songKey を生成する。
 *   結果: "{normalizedTitle}__" になる (セパレータは常に含む)。
 *
 * 副作用禁止: fetch / DOM / fs / process / env / Date.now() の内部呼び出しゼロ。
 */

import { normalizedKey } from '../shared/text.js';

/**
 * アーティスト名の sentinel 値。DB には名前として格納されるが、
 * SongKey 生成時は空文字として扱う。
 *
 * @type {string}
 */
export const UNKNOWN_ARTIST_NAME = '(不明)';

/**
 * SongKey の title 部と artist 部を区切る文字列。
 *
 * @type {string}
 */
export const SONG_KEY_SEPARATOR = '__';

/**
 * @typedef {string & { readonly __brand: 'SongKey' }} SongKey
 */

/**
 * 曲名とアーティスト名から SongKey を生成する。
 *
 * - 両値は NFKC 正規化 + trim + collapse_whitespace + toLowerCase を適用する。
 * - artist が UNKNOWN_ARTIST_NAME ('(不明)') / 空文字 / null / undefined のとき
 *   artist 部は空文字として扱う (結果: `"${normalizedTitle}__"`)。
 * - セパレータ '__' は artist が空の場合も必ず含まれる。
 *
 * 既存実装: admin/[[path]].js:23,237  admin-server/server.js:52
 *
 * @param {unknown} title  - 曲名。null/undefined は空文字として扱う。
 * @param {unknown} artist - アーティスト名。null/undefined/'(不明)'/空文字は空として扱う。
 * @returns {SongKey} `"${normalizedTitle}__${normalizedArtist}"` 形式の SongKey。
 */
export function buildSongKey(title, artist) {
  const normalizedTitle = normalizedKey(title);
  const rawArtist = normalizedKey(artist);
  // '(不明)' の正規化後は '(不明)' のまま (小文字 + NFKC で変化なし)
  const normalizedArtist =
    rawArtist === normalizedKey(UNKNOWN_ARTIST_NAME) ? '' : rawArtist;
  return /** @type {SongKey} */ (
    `${normalizedTitle}${SONG_KEY_SEPARATOR}${normalizedArtist}`
  );
}

/**
 * SongKey を normalizedTitle と normalizedArtist に分解する。
 *
 * - `'__'` が含まれない場合は normalizedTitle のみ、normalizedArtist は `''` を返す。
 * - `'__'` が複数含まれる場合 (title 自体に `'__'` が入っている場合) は
 *   **最初の `'__'`** で分割する。
 *   ※ 既存実装 (buildSongKey) は title/artist を normalizedKey しているため
 *     実際の song_key に `'__'` が複数含まれることは稀だが、安全のため先頭分割を採用。
 *
 * @param {SongKey | string} key - SongKey 文字列。
 * @returns {{ normalizedTitle: string; normalizedArtist: string }}
 */
export function parseSongKey(key) {
  const str = String(key ?? '');
  const idx = str.indexOf(SONG_KEY_SEPARATOR);
  if (idx < 0) {
    return { normalizedTitle: str, normalizedArtist: '' };
  }
  return {
    normalizedTitle: str.slice(0, idx),
    normalizedArtist: str.slice(idx + SONG_KEY_SEPARATOR.length),
  };
}
