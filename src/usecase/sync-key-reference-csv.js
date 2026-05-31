/**
 * @module usecase/sync-key-reference-csv
 * @description CSV テキストから key reference を songs テーブルに同期する UseCase。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:367-417 (importKeyReferenceCsv)
 *   - admin-server/server.js:481-533          (importKeyReferenceCsv, 完全同一ロジック)
 *
 * マッチング戦略 (2 段階):
 *   1. Exact match: artist が存在する場合、song_key = buildSongKey(title, artist) で検索
 *   2. Normalized title: 1 件のみヒットした場合のみ採用 (複数件はスキップ)
 *
 * @副作用 なし (Repository への書き込みのみ)
 */

import { parseDisplayKey } from '../domain/song/display-key.js';
import { parseGenre } from '../domain/song/genre.js';
import { normalize, normalizedKey } from '../domain/shared/text.js';
import { buildSongKey } from '../domain/song/song-key.js';
import { csvObjects } from '../adapter/csv/csv-objects.js';
import { pickColumn } from '../adapter/csv/pick-column.js';
import { fixedIntegratedRows } from '../adapter/csv/fixed-integrated-rows.js';

/**
 * @typedef {import('../domain/port/repositories/song-repository.js').SongRepository} SongRepository
 */

/**
 * syncKeyReferenceCsv の依存性。
 *
 * @typedef {object} SyncKeyReferenceCsvDeps
 * @property {SongRepository} songs
 */

/**
 * syncKeyReferenceCsv の入力。
 *
 * @typedef {object} SyncKeyReferenceCsvInput
 * @property {string} csvText - CSV テキスト
 */

/**
 * syncKeyReferenceCsv の戻り値。
 *
 * @typedef {object} SyncKeyReferenceCsvResult
 * @property {number} updated          - 更新された曲数
 * @property {number} skipped          - スキップされた行数
 * @property {number} total            - 処理対象行数 (updated + skipped)
 * @property {object} detectedColumns  - 検出された列名
 * @property {string|null} detectedColumns.title
 * @property {string|null} detectedColumns.artist
 * @property {string|null} detectedColumns.key
 * @property {string|null} detectedColumns.genre
 */

/**
 * CSV テキストから key reference (displayKey / genre) を songs テーブルに同期する。
 *
 * 処理フロー:
 *   1. csvObjects() で CSV をパースしてヘッダー検出
 *   2. pickColumn() で title / artist / key / genre 列を特定
 *   3. 列検出失敗時は fixedIntegratedRows() でフォールバック (T/U/V/X 固定列)
 *   4. 両方失敗した場合は Error を throw
 *   5. 各行について:
 *      a. title 必須、かつ displayKey または genre のいずれか必要。なければ skipped
 *      b. artist がある場合、buildSongKey(title, artist) で findByKey (exact match)
 *      c. exact match 失敗時、normalizedKey(title) で findByNormalizedTitle → 1 件のみ採用
 *      d. 0 件または複数件の場合は skipped
 *      e. songs.updateMetadata() で display_key / genre を更新
 *   6. { updated, skipped, total, detectedColumns } を返す
 *
 * 既存実装 (admin/[[path]].js:367-417) と同等の挙動。
 *
 * @param {SyncKeyReferenceCsvDeps} deps
 * @param {SyncKeyReferenceCsvInput} input
 * @returns {Promise<SyncKeyReferenceCsvResult>}
 */
export async function syncKeyReferenceCsv(deps, input) {
  const csvText = String(input.csvText || '');
  const rows = csvObjects(csvText);
  if (!rows.length) throw new Error('CSVが空です');

  const names = Object.keys(rows[0]);
  const titleCol = pickColumn(names, ['title', 'song_title', '曲名', '楽曲名']);
  const artistCol = pickColumn(names, ['artist', 'artist_name', '歌手', 'アーティスト']);
  const keyCol = pickColumn(names, ['キー', 'display_key', 'key', 'song_key_text']);
  const genreCol = pickColumn(names, ['genre', 'ジャンル']);

  const fixedRows =
    !titleCol || (!keyCol && !genreCol) ? fixedIntegratedRows(csvText) : [];

  if ((!titleCol || (!keyCol && !genreCol)) && !fixedRows.length) {
    throw new Error(`CSVの列を判定できません: ${names.join(', ')}`);
  }

  let updated = 0;
  let skipped = 0;

  /** @type {Array<{ title: string; artist: string; displayKey: string; genre: string }>} */
  const sourceRows = fixedRows.length
    ? fixedRows
    : rows.map((row) => ({
        title: row[titleCol],
        artist: artistCol ? row[artistCol] : '',
        displayKey: keyCol ? row[keyCol] : '',
        genre: genreCol ? row[genreCol] : '',
      }));

  for (const row of sourceRows) {
    const title = normalize(row.title);
    const artist = normalize(row.artist);
    const displayKey = parseDisplayKey(row.displayKey);
    const genre = parseGenre(row.genre);

    if (!title || (!displayKey && !genre)) {
      skipped += 1;
      continue;
    }

    // Phase 1: exact match by song_key (artist + title)
    const exactKey = buildSongKey(title, artist);
    let song = artist ? await deps.songs.findByKey(exactKey) : null;

    // Phase 2: normalized_title 検索 (1 件のみ採用)
    if (!song) {
      const matches = await deps.songs.findByNormalizedTitle(normalizedKey(title));
      song = matches.length === 1 ? matches[0] : null;
    }

    if (!song) {
      skipped += 1;
      continue;
    }

    await deps.songs.updateMetadata(song.id, { displayKey, genre });
    updated += 1;
  }

  return {
    updated,
    skipped,
    total: updated + skipped,
    detectedColumns: fixedRows.length
      ? { title: 'T', artist: 'U', key: 'V', genre: 'X' }
      : { title: titleCol, artist: artistCol, key: keyCol, genre: genreCol },
  };
}
