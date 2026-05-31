/**
 * @module infra/in-memory/in-memory-channel-repository
 * @description ChannelRepository Port の インメモリ実装。
 *
 * Map ベースの単純実装。テスト・開発時の依存性注入に使用する。
 * code の UNIQUE 制約を守る。
 * チャンネルデータはコンストラクタで注入可能 (シードデータ対応)。
 *
 * @副作用 なし (インスタンス内 Map への書き込みのみ)
 */

/**
 * @typedef {import('../../domain/port/repositories/channel-repository.js').Channel} Channel
 * @typedef {import('../../domain/port/repositories/channel-repository.js').ChannelRepository} ChannelRepository
 */

/**
 * ChannelRepository の インメモリ実装。
 *
 * @implements {ChannelRepository}
 */
export class InMemoryChannelRepository {
  /**
   * @param {Channel[]} [initialChannels] - 初期チャンネルデータ (省略時は空)
   */
  constructor(initialChannels = []) {
    /** @type {Map<number, Channel>} */
    this._store = new Map();
    /** @type {number} */
    this._nextId = 1;

    for (const ch of initialChannels) {
      this._store.set(ch.id, { ...ch });
      if (ch.id >= this._nextId) this._nextId = ch.id + 1;
    }
  }

  /**
   * チャンネルを追加する (テスト用補助メソッド)。
   *
   * @param {{ code: string; name: string; sort_order: number; created_at: string }} input
   * @returns {{ id: number }}
   */
  _insert(input) {
    for (const ch of this._store.values()) {
      if (ch.code === input.code) {
        throw new Error(`UNIQUE constraint failed: channels.code = "${input.code}"`);
      }
    }
    const id = this._nextId++;
    this._store.set(id, { id, ...input });
    return { id };
  }

  /**
   * @returns {Promise<Channel[]>}
   */
  async findAll() {
    return Array.from(this._store.values())
      .map((c) => ({ ...c }))
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  /**
   * @param {string} code
   * @returns {Promise<Channel|null>}
   */
  async findByCode(code) {
    for (const ch of this._store.values()) {
      if (ch.code === code) return { ...ch };
    }
    return null;
  }
}
