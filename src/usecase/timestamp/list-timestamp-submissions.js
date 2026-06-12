/**
 * @module usecase/timestamp/list-timestamp-submissions
 * @description 管理者向けタイムスタンプ投稿一覧取得ユースケース。
 */

import { TS_STATUS } from '../../domain/timestamp/timestamp-submission.js';

/** 1 ページ当たりの最大件数 */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

const VALID_STATUSES = new Set(Object.values(TS_STATUS));

/**
 * @param {object} deps
 * @param {import('../../infra/d1-worker/d1-timestamp-repository.js').D1TimestampRepository} deps.timestamps
 * @param {object} [input]
 * @param {string|null} [input.status]   - フィルタするステータス (省略時は全件)
 * @param {number} [input.page]          - 1-based ページ番号
 * @param {number} [input.limit]
 * @returns {Promise<{ items: import('../../domain/timestamp/timestamp-submission.js').TimestampSubmission[], total: number, page: number, limit: number }>}
 */
export async function listTimestampSubmissions(deps, input = {}) {
  let { status = null, page = 1, limit = DEFAULT_LIMIT } = input;

  if (status !== null && !VALID_STATUSES.has(status)) {
    status = null; // 不正な値は無視して全件返す
  }
  page  = Math.max(1, Number.isInteger(page)  ? page  : 1);
  limit = Math.min(MAX_LIMIT, Math.max(1, Number.isInteger(limit) ? limit : DEFAULT_LIMIT));

  const offset = (page - 1) * limit;

  const [items, total] = await Promise.all([
    deps.timestamps.list({ status, limit, offset }),
    deps.timestamps.count(status),
  ]);

  return { items, total, page, limit };
}
