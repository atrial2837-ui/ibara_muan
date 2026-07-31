/**
 * @module usecase/update-stream-date
 * @description 登録済み歌枠の配信日変更 UseCase。
 *
 * 歌枠追加時に配信日を誤って登録した場合、管理画面から後追いで直せるようにする。
 *
 * 注意点:
 *   - streams は UNIQUE(channel_id, streamed_on, url_key) を持つ
 *   - url_key は URL 未登録の歌枠では "channelCode:streamedOn:title" (add-stream と同じ規則)
 *     のため、配信日を変えたら url_key も再計算しないと addStream 側の重複判定とずれる
 *
 * @副作用 なし (Repository への読み書きのみ)
 */

import { normalize } from '../domain/shared/text.js';
import { isDateIso } from '../domain/shared/date.js';
import { buildUrlKey } from '../domain/stream/url-key.js';
import { ValidationError } from '../domain/error/validation-error.js';
import { NotFoundError } from '../domain/error/not-found-error.js';

/**
 * @typedef {object} UpdateStreamDateDeps
 * @property {import('../domain/port/repositories/channel-repository.js').ChannelRepository} channels
 * @property {import('../domain/port/repositories/stream-repository.js').StreamRepository} streams
 */

/**
 * @typedef {object} UpdateStreamDateInput
 * @property {number|string} streamId  - 対象歌枠の ID
 * @property {string}        streamedOn - 新しい配信日 YYYY-MM-DD
 */

/**
 * @typedef {object} UpdateStreamDateResult
 * @property {number} streamId
 * @property {string} previousStreamedOn
 * @property {string} streamedOn
 */

/**
 * 歌枠の配信日を変更する。
 *
 * 処理手順:
 *   1. streamId / streamedOn を検証
 *   2. 対象歌枠を取得 → 無ければ NotFoundError
 *   3. 配信日が変わっていなければ何もせず現状を返す
 *   4. 新しい配信日で url_key を再計算 (URL 登録済みなら url_key は不変)
 *   5. 同一チャンネル・同一 (streamed_on, url_key) の別歌枠があれば ValidationError
 *   6. streamed_on と url_key を更新
 *
 * @param {UpdateStreamDateDeps} deps
 * @param {UpdateStreamDateInput} input
 * @returns {Promise<UpdateStreamDateResult>}
 */
export async function updateStreamDate(deps, input) {
  const streamId = Number(input?.streamId);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    throw new ValidationError('歌枠IDが不正です');
  }

  const streamedOn = normalize(input?.streamedOn ?? '');
  if (!isDateIso(streamedOn)) {
    throw new ValidationError('配信日は YYYY-MM-DD で入力してください');
  }

  const stream = await deps.streams.findById(streamId);
  if (!stream) {
    throw new NotFoundError(`stream not found: ${streamId}`);
  }

  if (stream.streamed_on === streamedOn) {
    return { streamId, previousStreamedOn: stream.streamed_on, streamedOn };
  }

  const channels = await deps.channels.findAll();
  const channel = channels.find((c) => c.id === stream.channel_id);
  if (!channel) {
    throw new ValidationError(`unknown channel: ${stream.channel_id}`);
  }

  const urlKey = buildUrlKey(
    normalize(stream.url ?? ''),
    channel.code,
    streamedOn,
    normalize(stream.title ?? ''),
  );

  const conflict = await deps.streams.findByChannelDateUrlKey(
    stream.channel_id,
    streamedOn,
    urlKey,
  );
  if (conflict && conflict.id !== streamId) {
    throw new ValidationError(`同じ配信日・同じURLの歌枠が既にあります (id=${conflict.id})`);
  }

  await deps.streams.updateDate(streamId, { streamedOn, urlKey });

  return { streamId, previousStreamedOn: stream.streamed_on, streamedOn };
}
