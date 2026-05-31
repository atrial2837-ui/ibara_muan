/**
 * @module adapter/csv/fixed-integrated-rows
 * @description 固定列インデックスから key reference データを抽出する純粋関数。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:122-131 (fixedIntegratedRows)
 *   - admin-server/server.js:123-132          (fixedIntegratedRows, 完全同一ロジック)
 *
 * 固定列インデックス (0-origin):
 *   - T列 (index 19): title
 *   - U列 (index 20): artist
 *   - V列 (index 21): displayKey
 *   - X列 (index 23): genre  (W列 index 22 はスキップ)
 *
 * @副作用 なし (純粋関数)
 */

import { normalize, cleanMetadata } from '../../domain/shared/text.js';
import { parseDisplayKey } from '../../domain/song/display-key.js';
import { parseCsv } from './parse-csv.js';

/**
 * @typedef {object} IntegratedRow
 * @property {string} title      - 曲名 (生の値)
 * @property {string} artist     - アーティスト名 (生の値)
 * @property {string} displayKey - キー表示値 (生の値)
 * @property {string} genre      - ジャンル (生の値)
 */

/**
 * CSV テキストから固定列インデックス (T/U/V/X 列) を使って行を抽出する。
 *
 * title (index 19) が空でなく、かつ displayKey (index 21) または genre (index 23) が
 * 有効値を持つ行のみを返す。
 *
 * 既存実装 (admin/[[path]].js:122-131) と完全同等。
 * filter 条件: normalize(title) && (cleanDisplayKey(displayKey) || cleanMetadata(genre))
 * → parseDisplayKey / cleanMetadata を使用 (既存実装と完全同等)
 *
 * @param {string} text - CSV テキスト。
 * @returns {IntegratedRow[]} 有効な行の配列。各フィールドは生の値 (呼び出し元が正規化する)。
 */
export function fixedIntegratedRows(text) {
  return parseCsv(text)
    .map((row) => ({
      title: row[19] || '',
      artist: row[20] || '',
      displayKey: row[21] || '',
      genre: row[23] || '',
    }))
    .filter(
      (row) =>
        normalize(row.title) &&
        (parseDisplayKey(row.displayKey) || cleanMetadata(row.genre))
    );
}
