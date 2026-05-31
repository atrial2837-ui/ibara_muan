/**
 * @module adapter/csv/parse-csv
 * @description RFC 4180 風 CSV パーサ。クォート対応・LF/CRLF 両対応。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:80-114 (parseCsv)
 *   - admin-server/server.js:81-115          (parseCsv, 完全同一ロジック)
 *
 * @副作用 なし (純粋関数)
 */

/**
 * CSV テキストを二次元配列にパースする。
 *
 * 仕様:
 *   - ダブルクォート `"` でセルを囲める (RFC 4180 風)
 *   - クォート内の `""` はエスケープ済みクォート `"` として扱う
 *   - クォート内では改行 (LF/CRLF) もセル値に含む
 *   - CR (`\r`) は単独では無視する (CRLF → LF 変換効果)
 *   - 末尾が空行の場合は追加しない (row.length > 1 || row[0] が真の場合のみ追加)
 *
 * 既存実装 (admin/[[path]].js:80-114) と完全同等。
 *
 * @param {string} text - CSV テキスト。
 * @returns {string[][]} 二次元配列 (行 → セル)。
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.length > 1 || row[0]) rows.push(row);
  return rows;
}
