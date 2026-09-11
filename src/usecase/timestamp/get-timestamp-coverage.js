/**
 * @module usecase/timestamp/get-timestamp-coverage
 * @description チャンネル内の枠ごとに、承認済みタイムスタンプが何曲ぶん入っているかを返す。
 *
 * 打刻ツールの歌枠プルダウンで「もう入っている枠」と「まだの枠」を見分けるために使う。
 */

import { ValidationError } from '../../domain/error/validation-error.js';

/**
 * @param {object} deps
 * @param {import('../../infra/d1-worker/d1-timestamp-repository.js').D1TimestampRepository} deps.timestamps
 * @param {object} input
 * @param {string} input.channelCode - 'main' (単チャンネル運用)
 * @returns {Promise<Record<number, number>>} 枠番号 → 登録済み曲数
 */
export async function getTimestampCoverage(deps, input) {
  const { channelCode } = input;
  if (channelCode !== 'main') {
    throw new ValidationError('channelCode は "main" でなければなりません');
  }

  const rows = await deps.timestamps.countApprovedByChannel(channelCode);

  // プルダウン側で枠番号から引きたいので、配列ではなく対応表にして返す
  const coverage = {};
  for (const row of rows || []) {
    if (!Number.isInteger(row?.streamIndex)) continue;
    coverage[row.streamIndex] = Number(row.count) || 0;
  }
  return coverage;
}
