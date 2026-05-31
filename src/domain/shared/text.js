/**
 * @module shared/text
 * @description 文字列正規化・サニタイズのドメイン共通ユーティリティ。
 *
 * 既存実装の所在 (Phase 2 でこれらを本モジュールへ差し替え予定):
 *   - functions/api/data.js:13                  (normalize)
 *   - functions/api/admin/[[path]].js:1,5,9     (normalize, normalizedKey, cleanMetadata)
 *   - admin-server/server.js:30,34,38           (normalize, normalizedKey, cleanMetadata)
 *   - tools/generate_static_data.mjs:9          (normalize)
 *   - docs/js/utils.js:6                        (normalize)
 *   - docs/js/utils.js:52                       (escapeHtml)
 *   - docs/js/utils.js:57                       (escapeRegExp)
 *
 * 副作用禁止: fetch / DOM / fs / process / env / Date.now() の内部呼び出しゼロ。
 */

/**
 * 値を文字列へ変換し、前後の空白を除去、連続空白を1つに畳み、NFKC正規化する。
 *
 * 既存実装はすべて同一ロジック (data.js:13, admin/[[path]].js:1, server.js:30,
 * generate_static_data.mjs:9, docs/js/utils.js:6)。
 *
 * @param {unknown} value - 任意の値。null / undefined は空文字列として扱う。
 * @returns {string} 正規化済み文字列。
 */
export function normalize(value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').normalize('NFKC');
}

/**
 * normalize した後に小文字化した文字列を返す。
 * 大文字小文字を区別しない検索・比較キーとして使用する。
 *
 * 既存実装: admin/[[path]].js:5, admin-server/server.js:34
 *
 * @param {unknown} value - 任意の値。
 * @returns {string} 正規化・小文字化済み文字列。
 */
export function normalizedKey(value) {
  return normalize(value).toLowerCase();
}

/**
 * スプレッドシート由来のエラー/欠損値センチネルを空文字列に変換する。
 * センチネル判定は正規化後の値を大文字化して照合する。
 *
 * センチネルリスト (大文字照合): '#REF!', '#N/A', 'N/A', 'NULL'
 *
 * 既存実装: admin/[[path]].js:9, admin-server/server.js:38
 * 両実装は完全に同一ロジック。
 *
 * @param {unknown} value - 任意の値。
 * @returns {string} 正規化済み文字列、またはセンチネルの場合は空文字列。
 */
export function cleanMetadata(value) {
  const text = normalize(value);
  if (!text || ['#REF!', '#N/A', 'N/A', 'NULL'].includes(text.toUpperCase())) return '';
  return text;
}

/**
 * HTML特殊文字をエンティティへエスケープする。
 * null / undefined は空文字列として扱う。
 *
 * 変換対象: & → &amp;  < → &lt;  > → &gt;  " → &quot;  ' → &#39;
 *
 * 既存実装: docs/js/utils.js:52
 *
 * @param {unknown} value - 任意の値。
 * @returns {string} エスケープ済み文字列。
 */
export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 正規表現の特殊文字をエスケープする。
 * null / undefined は空文字列として扱う。
 *
 * 対象文字: . * + ? ^ $ { } ( ) | [ ] \
 *
 * 既存実装: docs/js/utils.js:57
 *
 * @param {unknown} value - 任意の値。
 * @returns {string} エスケープ済み文字列。
 */
export function escapeRegExp(value) {
  return String(value == null ? '' : value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
