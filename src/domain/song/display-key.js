/**
 * @module song/display-key
 * @description 楽曲キー表示値 (DisplayKey) の値オブジェクトと純粋関数。
 *
 * 既存実装の所在 (Phase 2 でこれらを本モジュールへ差し替え予定):
 *   - functions/api/admin/[[path]].js:15  (cleanDisplayKey) ← 正
 *   - admin-server/server.js:44           (cleanDisplayKey)
 *
 * 差分確認結果: 両実装は完全に同一ロジック。差分なし。
 * 正とする実装: functions/api/admin/[[path]].js:15 (SoT 規定による)
 *
 * 副作用禁止: fetch / DOM / fs / process / env / Date.now() の内部呼び出しゼロ。
 */

import { cleanMetadata } from '../shared/text.js';

/**
 * 楽曲キーの表示値型。
 *
 * 有効値:
 *   - `''`       未設定
 *   - `'原キー'`  オリジナルキー
 *   - `'+N'`     N 半音上げ (N は 1〜2 桁の正整数)
 *   - `'-N'`     N 半音下げ (N は 1〜2 桁の正整数)
 *
 * @typedef {'' | '原キー' | `+${number}` | `-${number}`} DisplayKey
 */

/**
 * 生の文字列を DisplayKey へ変換する。
 *
 * 変換手順:
 *   1. cleanMetadata (normalize + センチネル除去) を適用する。
 *      センチネル: '#REF!', '#N/A', 'N/A', 'NULL' → `''`
 *   2. 全角プラス `＋` を `+`、全角マイナス `－` を `-` へ置換する。
 *      ※ step 1 の NFKC 正規化で変換されない場合に備えた明示的フォールバック。
 *   3. 有効パターンに合致しなければ `''` を返す。
 *
 * 有効パターン:
 *   - 空文字列 → `''`
 *   - `'原キー'` → `'原キー'`
 *   - `/^[+-]\d{1,2}$/` → そのまま返す
 *
 * 既存実装 (admin/[[path]].js:15-21 / admin-server:44-50) と完全同等。
 *
 * @param {unknown} raw - 任意の入力値。null / undefined は `''` として扱う。
 * @returns {DisplayKey} 正規化済み DisplayKey。無効値は `''`。
 */
export function parseDisplayKey(raw) {
  // cleanMetadata: normalize (NFKC + trim + collapse) + センチネル除去
  // NFKC 正規化により '＋' → '+', '－' → '-' が変換されることが多いが、
  // 文字コードによっては変換されない場合もあるため replace で明示的に補う。
  const text = cleanMetadata(raw).replace(/^＋/, '+').replace(/^－/, '-');
  if (!text) return '';
  if (text === '原キー') return text;
  if (/^[+-]\d{1,2}$/.test(text)) return /** @type {DisplayKey} */ (text);
  return '';
}

/**
 * 値が有効な DisplayKey かどうかを検証する。
 *
 * `parseDisplayKey(value) === value` を判定基準とする。
 * すなわち、既に正規化済みで有効な値のみ `true` を返す。
 *
 * @param {unknown} value - 検証する値。
 * @returns {boolean} 有効な DisplayKey なら `true`。
 */
export function isValidDisplayKey(value) {
  if (typeof value !== 'string') return false;
  return parseDisplayKey(value) === value;
}
