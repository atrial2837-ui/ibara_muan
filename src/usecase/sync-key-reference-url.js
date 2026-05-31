/**
 * @module usecase/sync-key-reference-url
 * @description スプレッドシート URL から CSV を取得して key reference を同期する UseCase。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:419-425 (syncKeyReferenceUrl)
 *   - admin-server/server.js:535-543          (syncKeyReferenceUrl, 完全同一ロジック)
 *
 * 内部で syncKeyReferenceCsv を呼び出す。
 *
 * @副作用 なし (Gateway / Repository への I/O のみ)
 */

import { ValidationError } from '../domain/error/validation-error.js';
import { spreadsheetCsvUrl } from '../adapter/spreadsheet/spreadsheet-url-converter.js';
import { syncKeyReferenceCsv } from './sync-key-reference-csv.js';

/**
 * @typedef {import('../domain/port/gateways/spreadsheet-gateway.js').SpreadsheetGateway} SpreadsheetGateway
 * @typedef {import('../domain/port/repositories/song-repository.js').SongRepository} SongRepository
 * @typedef {import('./sync-key-reference-csv.js').SyncKeyReferenceCsvResult} SyncKeyReferenceCsvResult
 */

/**
 * syncKeyReferenceUrl の依存性。
 *
 * @typedef {object} SyncKeyReferenceUrlDeps
 * @property {SpreadsheetGateway} spreadsheet
 * @property {SongRepository} songs
 */

/**
 * syncKeyReferenceUrl の入力。
 *
 * @typedef {object} SyncKeyReferenceUrlInput
 * @property {string} url - Google Sheets の編集 URL (または CSV ダウンロード URL)
 */

/**
 * スプレッドシート URL から CSV を取得し、key reference を songs テーブルに同期する。
 *
 * 処理フロー:
 *   1. url が空なら ValidationError を throw
 *   2. spreadsheetCsvUrl() で CSV ダウンロード URL に変換
 *   3. deps.spreadsheet.fetchCsv() で CSV テキストを取得
 *   4. syncKeyReferenceCsv() に委譲
 *
 * 既存実装 (admin/[[path]].js:419-425) と同等の挙動。
 * ※ 既存実装は env.KEY_REFERENCE_CSV_URL フォールバックがあるが、
 *   UseCase は純粋な入力のみを受け取る設計のため省略する。
 *
 * @param {SyncKeyReferenceUrlDeps} deps
 * @param {SyncKeyReferenceUrlInput} input
 * @returns {Promise<SyncKeyReferenceCsvResult>}
 * @throws {ValidationError} url が空の場合
 */
export async function syncKeyReferenceUrl(deps, input) {
  if (!input.url) throw new ValidationError('Spreadsheet URL is required');
  const csvUrl = spreadsheetCsvUrl(input.url);
  const csvText = await deps.spreadsheet.fetchCsv(csvUrl);
  return syncKeyReferenceCsv({ songs: deps.songs }, { csvText });
}
