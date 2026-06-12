/**
 * @module usecase/timestamp/submit-timestamp
 * @description コミュニティタイムスタンプ投稿のユースケース。
 */

import { ValidationError } from '../../domain/error/validation-error.js';

/** 最大許容秒数（約 24 時間） */
const MAX_SECONDS = 86400;
/** 投稿者コメントの最大文字数 */
const NOTE_MAX_LENGTH = 200;

/**
 * タイムスタンプを投稿する。
 *
 * @param {object} deps
 * @param {import('../../infra/d1-worker/d1-timestamp-repository.js').D1TimestampRepository} deps.timestamps
 * @param {object} input
 * @param {string} input.channelCode  - チャンネルコード (channel_code カラムに格納する任意の文字列)
 * @param {number} input.streamIndex  - 0-based
 * @param {number} input.songIndex    - 0-based
 * @param {number} input.timeSeconds  - 提案タイムスタンプ (秒)
 * @param {string|null} [input.submitterNote]
 * @returns {Promise<import('../../domain/timestamp/timestamp-submission.js').TimestampSubmission>}
 */
export async function submitTimestamp(deps, input) {
  const { channelCode, streamIndex, songIndex, timeSeconds, submitterNote = null } = input;

  if (!channelCode || typeof channelCode !== 'string') {
    throw new ValidationError('channelCode は空でない文字列でなければなりません');
  }
  if (!Number.isInteger(streamIndex) || streamIndex < 0) {
    throw new ValidationError('streamIndex は 0 以上の整数でなければなりません');
  }
  if (!Number.isInteger(songIndex) || songIndex < 0) {
    throw new ValidationError('songIndex は 0 以上の整数でなければなりません');
  }
  if (!Number.isInteger(timeSeconds) || timeSeconds < 0 || timeSeconds > MAX_SECONDS) {
    throw new ValidationError(`timeSeconds は 0〜${MAX_SECONDS} の整数でなければなりません`);
  }
  if (submitterNote !== null) {
    if (typeof submitterNote !== 'string') {
      throw new ValidationError('submitterNote は文字列でなければなりません');
    }
    if (submitterNote.length > NOTE_MAX_LENGTH) {
      throw new ValidationError(`submitterNote は ${NOTE_MAX_LENGTH} 文字以内にしてください`);
    }
  }

  return deps.timestamps.insert({
    channelCode,
    streamIndex,
    songIndex,
    timeSeconds,
    submitterNote: submitterNote?.trim() || null,
  });
}
