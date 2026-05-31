/**
 * @module adapter/csv/pick-column
 * @description CSV ヘッダー列を候補名から検出する純粋関数。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:352-365 (pickColumn)
 *   - admin-server/server.js:426-439          (pickColumn, 完全同一ロジック)
 *
 * 2 段階マッチング:
 *   1. 完全一致: normalizedKey(column).replace(/[\s_-]/g, '') === normalizedKey(candidate).replace(/[\s_-]/g, '')
 *   2. 部分一致: 上記の column キーが candidate キーを含む (includes)
 *
 * 候補配列の先頭から順に優先する。
 *
 * @副作用 なし (純粋関数)
 */

import { normalizedKey } from '../../domain/shared/text.js';

/**
 * 列名リストから、候補配列に最初に一致する列名を返す。
 *
 * 一致判定は normalizedKey().replace(/[\s_-]/g, '') で正規化した上で行う。
 * 完全一致優先 → 部分一致フォールバック の 2 段階。
 *
 * 既存実装 (admin/[[path]].js:352-365, admin-server:426-439) と完全同等。
 *
 * @param {string[]} columns   - CSV ヘッダー列名の配列。
 * @param {string[]} candidates - 優先順位付き候補名の配列。
 * @returns {string | null} 一致した列名、または見つからない場合は null。
 */
export function pickColumn(columns, candidates) {
  const normalized = columns.map((name) => ({
    name,
    key: normalizedKey(name).replace(/[\s_-]/g, ''),
  }));
  // Phase 1: 完全一致
  for (const candidate of candidates) {
    const key = normalizedKey(candidate).replace(/[\s_-]/g, '');
    const found = normalized.find((column) => column.key === key);
    if (found) return found.name;
  }
  // Phase 2: 部分一致
  for (const candidate of candidates) {
    const key = normalizedKey(candidate).replace(/[\s_-]/g, '');
    const found = normalized.find((column) => column.key.includes(key));
    if (found) return found.name;
  }
  return null;
}
