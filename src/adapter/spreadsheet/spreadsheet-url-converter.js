/**
 * @module adapter/spreadsheet/spreadsheet-url-converter
 * @description Google Sheets 編集 URL を CSV ダウンロード URL に変換する純粋関数。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:133-142 (spreadsheetCsvUrl)
 *   - admin-server/server.js:134-143          (spreadsheetCsvUrl, 完全同一ロジック)
 *
 * @副作用 なし (純粋関数)
 */

import { normalize } from '../../domain/shared/text.js';

/**
 * Google Sheets の編集 URL または任意の URL を CSV ダウンロード URL に変換する。
 *
 * 変換ルール:
 *   1. normalize (NFKC + trim + collapse) を適用する。空文字列なら `''` を返す。
 *   2. 既に `output=csv` または `tqx=out:csv` を含むなら、そのまま返す。
 *   3. `/spreadsheets/d/{id}` を含まないなら、そのまま返す (変換不能)。
 *   4. `gid=` パラメータがあれば抽出し、なければ `'0'` を使う。
 *   5. `https://docs.google.com/spreadsheets/d/{id}/gviz/tq?tqx=out:csv&gid={gid}` に変換。
 *
 * 既存実装 (admin/[[path]].js:133-142) と完全同等。
 *
 * @param {unknown} value - 変換元 URL 文字列 (null/undefined は `''` として扱う)。
 * @returns {string} CSV ダウンロード URL、または変換不能な場合は正規化後の入力値。
 */
export function spreadsheetCsvUrl(value) {
  const raw = normalize(value);
  if (!raw) return '';
  if (/output=csv|tqx=out:csv/.test(raw)) return raw;
  const match = raw.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match) return raw;
  const gidMatch = raw.match(/[?#&]gid=(\d+)/) || raw.match(/#gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv&gid=${gid}`;
}
