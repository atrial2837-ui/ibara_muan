/**
 * @module usecase/update-stream-info
 * @description 歌枠のメタ情報 (title / url / streamed_on / source_index) を更新する UseCase。
 * セトリ (stream_songs / stats) は変更しない。
 */

import { normalize } from '../domain/shared/text.js';
import { NotFoundError } from '../domain/error/not-found-error.js';
import { ValidationError } from '../domain/error/validation-error.js';

/**
 * @typedef {object} UpdateStreamInfoInput
 * @property {number|string} streamId
 * @property {string} [title]
 * @property {string} [url]
 * @property {string} [streamedOn]   - YYYY-MM-DD
 * @property {number|string} [sourceIndex]
 */

/**
 * @param {import('./add-stream.js').AddStreamDeps} deps
 * @param {UpdateStreamInfoInput} input
 * @returns {Promise<{ ok: true, streamId: number }>}
 */
export async function updateStreamInfo(deps, input) {
  const stream = await deps.streams.findById(Number(input.streamId));
  if (!stream) throw new NotFoundError('stream not found');

  const title = input.title !== undefined ? normalize(String(input.title)) : (stream.title ?? '');
  const url = input.url !== undefined ? normalize(String(input.url)) : (stream.url ?? '');

  const streamedOn =
    input.streamedOn !== undefined ? String(input.streamedOn) : stream.streamed_on;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(streamedOn)) {
    throw new ValidationError('配信日は YYYY-MM-DD で入力してください');
  }

  const sourceIndex =
    input.sourceIndex !== undefined
      ? (Number(input.sourceIndex) || null)
      : stream.source_index;

  await deps.streams.updateInfo(stream.id, {
    title: title || null,
    url: url || null,
    streamed_on: streamedOn,
    source_index: sourceIndex,
  });

  return { ok: true, streamId: stream.id };
}
