/**
 * @module adapter/http/resolve-admin-auth-strict
 * @description ADMIN_AUTH_STRICT 環境変数から認証 strict モードを解決する。
 *
 * - 未設定 / 'false' / '0' → false (既存互換: ADMIN_TOKEN 未設定時は素通り)
 * - 'true' / '1'           → true  (SoT 20 §8: 未設定なら拒否)
 *
 * @副作用 なし
 */

/**
 * @param {string|boolean|undefined|null} value
 * @returns {boolean}
 */
export function resolveAdminAuthStrict(value) {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return false;
}
