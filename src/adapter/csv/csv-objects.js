/**
 * @module adapter/csv/csv-objects
 * @description CSV テキストをオブジェクト配列に変換する。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:116-120 (csvObjects)
 *   - admin-server/server.js:117-121          (csvObjects, 完全同一ロジック)
 *
 * @副作用 なし (純粋関数)
 */

import { normalize } from '../../domain/shared/text.js';
import { parseCsv } from './parse-csv.js';

/**
 * CSV テキストをオブジェクト配列に変換する。
 *
 * 先頭行をヘッダーとして扱い、各行を `{ [header]: value }` のオブジェクトにマップする。
 * ヘッダーは normalize (NFKC 正規化 + trim + collapse) して使用する。
 * 行のセル数がヘッダー数より少ない場合、不足分は `''` として補完する。
 *
 * 既存実装 (admin/[[path]].js:116-120) と完全同等。
 *
 * @param {string} text - CSV テキスト。
 * @returns {Record<string, string>[]} ヘッダーをキーとしたオブジェクトの配列。
 *   CSV が空 (ヘッダー行のみ) の場合は空配列を返す。
 */
export function csvObjects(text) {
  const rows = parseCsv(text);
  const headers = (rows.shift() || []).map((header) => normalize(header));
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || '']))
  );
}
