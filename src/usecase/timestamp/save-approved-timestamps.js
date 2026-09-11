/**
 * @module usecase/timestamp/save-approved-timestamps
 * @description 管理者が打刻した1枠ぶんのタイムスタンプをまとめて承認済みで保存するユースケース。
 *
 * 一般ユーザーの投稿 (submit-timestamp) と違い、管理者が入力したものなので
 * 審査を挟まず approved で入る。打ち直しに対応するため、同じ枠の既存の承認済みは置き換える。
 */

import { ValidationError } from '../../domain/error/validation-error.js';

/** 最大許容秒数（約 24 時間） */
const MAX_SECONDS = 86400;
/** 1枠あたりの上限。歌枠のセトリは多くても数十曲。 */
const MAX_ITEMS = 200;

/**
 * 打刻結果を保存する。
 *
 * @param {object} deps
 * @param {import('../../infra/d1-worker/d1-timestamp-repository.js').D1TimestampRepository} deps.timestamps
 * @param {{ now: () => Date }} deps.clock
 * @param {object} input
 * @param {string} input.channelCode - 'main' (単チャンネル運用)
 * @param {number} input.streamIndex - 枠番号
 * @param {{songIndex:number, timeSeconds:number}[]} input.items
 * @param {string|null} [input.reviewerNote]
 * @returns {Promise<{ count: number }>}
 */
export async function saveApprovedTimestamps(deps, input) {
  const { channelCode, streamIndex, items, reviewerNote = null } = input;

  if (channelCode !== 'main') {
    throw new ValidationError('channelCode は "main" でなければなりません');
  }
  if (!Number.isInteger(streamIndex) || streamIndex < 0) {
    throw new ValidationError('streamIndex は 0 以上の整数でなければなりません');
  }
  if (!Array.isArray(items)) {
    throw new ValidationError('items は配列でなければなりません');
  }
  if (items.length > MAX_ITEMS) {
    throw new ValidationError(`items は ${MAX_ITEMS} 件以内にしてください`);
  }

  const seen = new Set();
  const normalized = items.map((item) => {
    const songIndex = Number(item?.songIndex);
    const timeSeconds = Number(item?.timeSeconds);
    if (!Number.isInteger(songIndex) || songIndex < 0) {
      throw new ValidationError('songIndex は 0 以上の整数でなければなりません');
    }
    if (!Number.isInteger(timeSeconds) || timeSeconds < 0 || timeSeconds > MAX_SECONDS) {
      throw new ValidationError(`timeSeconds は 0〜${MAX_SECONDS} の整数でなければなりません`);
    }
    // 1曲につき1時刻。重複を許すと表示側でどちらを使うか決まらない
    if (seen.has(songIndex)) {
      throw new ValidationError(`songIndex ${songIndex} が重複しています`);
    }
    seen.add(songIndex);
    return { songIndex, timeSeconds };
  });

  normalized.sort((a, b) => a.songIndex - b.songIndex);

  const count = await deps.timestamps.replaceApproved(
    channelCode,
    streamIndex,
    normalized,
    deps.clock.now().toISOString(),
    reviewerNote?.trim() || null,
  );

  return { count };
}
