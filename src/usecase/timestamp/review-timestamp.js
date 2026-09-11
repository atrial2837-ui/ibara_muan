/**
 * @module usecase/timestamp/review-timestamp
 * @description 管理者がタイムスタンプ投稿を承認 / 却下するユースケース。
 */

import { TS_STATUS } from '../../domain/timestamp/timestamp-submission.js';
import { ValidationError } from '../../domain/error/validation-error.js';
import { NotFoundError } from '../../domain/error/not-found-error.js';

/**
 * @param {object} deps
 * @param {import('../../infra/d1-worker/d1-timestamp-repository.js').D1TimestampRepository} deps.timestamps
 * @param {import('../../infra/clock/system-clock.js').SystemClock} deps.clock
 * @param {object} input
 * @param {number} input.id
 * @param {'approved'|'rejected'} input.action
 * @param {string|null} [input.reviewerNote]
 * @returns {Promise<import('../../domain/timestamp/timestamp-submission.js').TimestampSubmission>}
 */
export async function reviewTimestamp(deps, input) {
  const { id, action, reviewerNote = null } = input;

  if (action !== TS_STATUS.APPROVED && action !== TS_STATUS.REJECTED) {
    throw new ValidationError('action は "approved" または "rejected" でなければなりません');
  }

  const updated = await deps.timestamps.updateStatus(id, {
    status:       action,
    reviewerNote: reviewerNote?.trim() || null,
    reviewedAt:   deps.clock.now().toISOString(),
  });

  if (!updated) {
    throw new NotFoundError(`id=${id} のタイムスタンプ投稿が見つかりません`);
  }

  return updated;
}
