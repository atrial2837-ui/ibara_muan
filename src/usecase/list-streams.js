/**
 * @module usecase/list-streams
 * @description 登録済み歌枠の一覧取得 UseCase。
 *
 * 管理画面の「歌枠の日付修正」で、D1 の生データ (静的データ生成前を含む) を
 * 一覧するために使う。静的 JSON (docs/data/*.json) は生成後にしか更新されないため、
 * 追加直後の歌枠を直せるように D1 を直接読む。
 *
 * @副作用 なし (Repository への読み取りのみ)
 */

import { ValidationError } from '../domain/error/validation-error.js';

/**
 * @typedef {object} ListStreamsDeps
 * @property {import('../domain/port/repositories/channel-repository.js').ChannelRepository} channels
 * @property {import('../domain/port/repositories/stream-repository.js').StreamRepository} streams
 */

/**
 * @typedef {object} ListStreamsInput
 * @property {string} [channelCode] - 絞り込むチャンネルコード (省略時は全チャンネル)
 * @property {number} [limit=100]   - 最大件数 (配信日の新しい順)
 */

/**
 * @typedef {object} StreamListItem
 * @property {number}      id
 * @property {string}      channelCode
 * @property {number|null} sourceIndex
 * @property {string}      streamedOn
 * @property {string}      title
 * @property {string}      url
 * @property {number}      songCount
 */

/**
 * @typedef {object} ListStreamsResult
 * @property {StreamListItem[]} streams
 * @property {number} total - 絞り込み条件に一致した総件数 (limit 適用前)
 */

/**
 * 歌枠を配信日の新しい順に一覧する。
 *
 * @param {ListStreamsDeps} deps
 * @param {ListStreamsInput} [input]
 * @returns {Promise<ListStreamsResult>}
 */
export async function listStreams(deps, input = {}) {
  const channels = await deps.channels.findAll();
  /** @type {Map<number, string>} */
  const codeById = new Map(channels.map((c) => [c.id, c.code]));

  const channelCode = input.channelCode ? String(input.channelCode) : '';
  let rows;
  if (channelCode) {
    const channel = channels.find((c) => c.code === channelCode);
    if (!channel) {
      throw new ValidationError(`unknown channel: ${channelCode}`);
    }
    rows = await deps.streams.findAllByChannel(channel.id);
  } else {
    rows = await deps.streams.findAll();
  }

  const limit = Number(input.limit) > 0 ? Number(input.limit) : 100;

  const sorted = [...rows].sort((a, b) => {
    if (a.streamed_on !== b.streamed_on) return a.streamed_on < b.streamed_on ? 1 : -1;
    return b.id - a.id;
  });

  return {
    streams: sorted.slice(0, limit).map((row) => ({
      id: row.id,
      channelCode: codeById.get(row.channel_id) || '',
      sourceIndex: row.source_index ?? null,
      streamedOn: row.streamed_on,
      title: row.title || '',
      url: row.url || '',
      songCount: row.song_count ?? 0,
    })),
    total: sorted.length,
  };
}
