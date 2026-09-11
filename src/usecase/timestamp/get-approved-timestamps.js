/**
 * @module usecase/timestamp/get-approved-timestamps
 * @description 特定の配信枠の承認済みコミュニティタイムスタンプを取得するユースケース。
 */

/**
 * @param {object} deps
 * @param {import('../../infra/d1-worker/d1-timestamp-repository.js').D1TimestampRepository} deps.timestamps
 * @param {object} input
 * @param {string} input.channelCode
 * @param {number} input.streamIndex
 * @returns {Promise<import('../../domain/timestamp/timestamp-submission.js').TimestampSubmission[]>}
 */
export async function getApprovedTimestamps(deps, input) {
  const { channelCode, streamIndex } = input;
  return deps.timestamps.getApproved(channelCode, streamIndex);
}
