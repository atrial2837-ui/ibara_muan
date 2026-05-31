/**
 * @module adapter/http/error-mapper
 * @description Error → HTTP Response マッピング。
 *
 * マッピング規則:
 *   - ValidationError → 400
 *   - NotFoundError   → 404
 *   - error.status (number) があればそれを使う (admin/[[path]].js:472 既存互換)
 *   - その他 Error    → 500
 *   - 非 Error 値     → 500
 *
 * @副作用 なし
 */

import { ValidationError } from '../../domain/error/validation-error.js';
import { NotFoundError } from '../../domain/error/not-found-error.js';
import { jsonResponse } from './json-presenter.js';

/**
 * Error → HTTP Response に変換する。
 *
 * @param {unknown} error
 * @returns {Response}
 */
export function mapErrorToResponse(error) {
  if (!(error instanceof Error)) {
    return jsonResponse({ error: String(error) }, 500);
  }

  let status = 500;

  if (error instanceof ValidationError) {
    status = 400;
  } else if (error instanceof NotFoundError) {
    status = 404;
  } else if (typeof error.status === 'number') {
    status = error.status;
  }

  return jsonResponse({ error: error.message || String(error) }, status);
}
