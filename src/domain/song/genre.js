/**
 * @file genre.js
 * @module domain/song/genre
 *
 * ジャンルの **型 + バリデーション** のみを担う。
 * 推論ロジック (inferGenre / GENRE_PATTERNS) は本モジュールに持たない
 * (データ駆動: songs.genre 列を Source of Truth とする方針)。
 *
 * Phase 1.5 で inferGenre / GENRE_PATTERNS をこのモジュールから退避。
 * 初期推測が必要な場合は別ファイル (usecase または tools) で行う予定
 * (将来 usecase/initial-genre-guess.js (仮) に推論を移す予定)。
 * 旧版の inferGenre / GENRE_PATTERNS は git 履歴 (Phase 1) を参照。
 *
 * @副作用 なし (純粋関数・定数のみ)
 */

import { cleanMetadata } from '../shared/text.js';

/**
 * @typedef {'オリジナル'|'ディズニー'|'童謡・唱歌'|'K-POP'|'アイドル'|'ボカロ'|'ゲーム・キャラソン'|'アニソン'|'J-POP'|'未分類'} Genre
 */

/**
 * 全ジャンルの固定リスト (10 値)。
 * @type {Readonly<Genre[]>}
 */
export const GENRE_LIST = Object.freeze([
  'オリジナル',
  'ディズニー',
  '童謡・唱歌',
  'K-POP',
  'アイドル',
  'ボカロ',
  'ゲーム・キャラソン',
  'アニソン',
  'J-POP',
  '未分類',
]);

const GENRE_SET = new Set(GENRE_LIST);

/** DB / API 未指定時の既定値。 */
export const DEFAULT_GENRE = 'J-POP';

/** 明示的未分類を表す定数。 */
export const UNCATEGORIZED = '未分類';

/**
 * 値が有効な Genre かどうか判定 (空文字は false)。
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidGenre(value) {
  return typeof value === 'string' && GENRE_SET.has(/** @type {Genre} */ (value));
}

/**
 * DB / API / CSV などから来た値を Genre | '' に正規化する。
 *  - cleanMetadata で '#REF!' 等の sentinel を空文字に変換
 *  - 前後空白除去・NFKC 正規化 (cleanMetadata 経由)
 *  - GENRE_LIST に含まれれば該当 Genre を返し、含まれなければ '' を返す
 *
 * @param {unknown} value
 * @returns {Genre|''}
 */
export function parseGenre(value) {
  const cleaned = cleanMetadata(value);
  if (!cleaned) return '';
  return GENRE_SET.has(/** @type {Genre} */ (cleaned)) ? /** @type {Genre} */ (cleaned) : '';
}
