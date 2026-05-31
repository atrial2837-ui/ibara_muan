/**
 * @module infra/in-memory/in-memory-stream-repository
 * @description StreamRepository Port の インメモリ実装。
 *
 * Map ベースの単純実装。テスト・開発時の依存性注入に使用する。
 * UNIQUE(channel_id, streamed_on, url_key) 制約を守る。
 *
 * @副作用 なし (インスタンス内 Map への書き込みのみ)
 */

/**
 * @typedef {import('../../domain/port/repositories/stream-repository.js').Stream} Stream
 * @typedef {import('../../domain/port/repositories/stream-repository.js').NewStream} NewStream
 * @typedef {import('../../domain/port/repositories/stream-repository.js').StreamPatch} StreamPatch
 * @typedef {import('../../domain/port/repositories/stream-repository.js').StreamRepository} StreamRepository
 */

/**
 * StreamRepository の インメモリ実装。
 *
 * @implements {StreamRepository}
 */
export class InMemoryStreamRepository {
  constructor() {
    /** @type {Map<number, Stream>} */
    this._store = new Map();
    /** @type {number} */
    this._nextId = 1;
  }

  /**
   * @param {number} channelId
   * @param {string} streamedOn
   * @param {string} urlKey
   * @returns {Promise<Stream|null>}
   */
  async findByChannelDateUrlKey(channelId, streamedOn, urlKey) {
    for (const row of this._store.values()) {
      if (
        row.channel_id === channelId &&
        row.streamed_on === streamedOn &&
        row.url_key === urlKey
      ) {
        return { ...row };
      }
    }
    return null;
  }

  /**
   * @param {NewStream} input
   * @returns {Promise<{ id: number }>}
   */
  async insert(input) {
    // UNIQUE constraint: (channel_id, streamed_on, url_key)
    for (const row of this._store.values()) {
      if (
        row.channel_id === input.channelId &&
        row.streamed_on === input.streamedOn &&
        row.url_key === input.urlKey
      ) {
        throw new Error(
          `UNIQUE constraint failed: streams.(channel_id, streamed_on, url_key)`
        );
      }
    }
    const id = this._nextId++;
    /** @type {Stream} */
    const row = {
      id,
      channel_id: input.channelId,
      source_index: input.sourceIndex ?? null,
      streamed_on: input.streamedOn,
      title: input.title ?? null,
      url: input.url ?? null,
      url_key: input.urlKey,
      song_count: input.songCount,
      created_at: input.createdAt,
    };
    this._store.set(id, row);
    return { id };
  }

  /**
   * @param {number} id
   * @param {StreamPatch} patch
   * @returns {Promise<void>}
   */
  async update(id, patch) {
    const row = this._store.get(id);
    if (!row) return;
    this._store.set(id, { ...row, ...patch });
  }

  /**
   * @param {number} channelId
   * @returns {Promise<Stream[]>}
   */
  async findAllByChannel(channelId) {
    return Array.from(this._store.values())
      .filter((r) => r.channel_id === channelId)
      .map((r) => ({ ...r }));
  }

  /**
   * @returns {Promise<Stream[]>}
   */
  async findAll() {
    return Array.from(this._store.values()).map((r) => ({ ...r }));
  }

  /**
   * そのチャンネルの max(source_index) + 1 を返す。空なら 1。
   *
   * @param {number} channelId
   * @returns {Promise<number>}
   */
  async nextSourceIndex(channelId) {
    let max = 0;
    for (const row of this._store.values()) {
      if (row.channel_id === channelId && row.source_index != null) {
        if (row.source_index > max) max = row.source_index;
      }
    }
    return max + 1;
  }
}
