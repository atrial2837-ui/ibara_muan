/**
 * @module domain/policy/admin-auth
 * @description Admin 認可判定ポリシー (純粋関数)。
 *
 * 重要: 既存実装 (functions/api/admin/[[path]].js:46-53) は
 *   ADMIN_TOKEN 未設定時に認証を素通りさせる危険なデフォルトがあった。
 * 本 Policy では「expected が null/空文字なら拒否」に挙動を反転する。
 * これは SoT 00 §5, SoT 20 §8 の「危険デフォルト是正」の意図された変更。
 *
 * 既存挙動完全再現が必要な期間 (Phase 5 移行中) の互換のため、
 *   { strict: false } オプションで素通り挙動を選択可能:
 *   - strict: true (デフォルト) → expected 未設定なら拒否
 *   - strict: false → expected 未設定なら許可 (既存互換)
 *
 * @副作用 なし
 */

/**
 * Admin 認可判定結果。
 *
 * @typedef {object} AuthDecision
 * @property {boolean} allowed
 * @property {string} [reason]
 */

/**
 * Admin 認可判定 (純粋関数)。
 *
 * @param {{ token: string|null }} req
 * @param {string|null|undefined} expected
 * @param {{ strict?: boolean }} [options]
 * @returns {AuthDecision}
 */
export function evaluateAdminAuth(req, expected, options) {
  const strict = options?.strict !== false; // デフォルト true

  // expected が null/undefined/空文字 (ADMIN_TOKEN 未設定) のケース
  if (!expected) {
    if (strict) {
      return { allowed: false, reason: 'ADMIN_TOKEN is not configured' };
    }
    // strict=false → 既存互換: 素通り
    return { allowed: true };
  }

  // expected がある場合はトークン一致チェック
  if (req.token === expected) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Invalid admin token' };
}
