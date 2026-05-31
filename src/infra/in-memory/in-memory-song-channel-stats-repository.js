/**
 * @module infra/in-memory/in-memory-song-channel-stats-repository
 * @description SongChannelStatsRepository Port の インメモリ実装。
 *
 * Map ベースの単純実装。テスト・開発時の依存性注入に使用する。
 * - PRIMARY KEY (song_id, channel_id)
 * - sing_count >= 0 の不変条件 (デクリメント時は 0 を下回らない)
 * - upsertIncrement: 存在しなければ INSERT、存在すれば sing_count += 1
 * - decrementBySongIds: CASE WHEN sing_count > 0 THEN sing_count - 1 ELSE 0 END
 *
 * @副作用 なし (インスタンス内 Map への書き込みのみ)
 */

/**
 * @typedef {import('../../domain/port/repositories/song-channel-stats-repository.js').SongChannelStat} SongChannelStat
 * @typedef {import('../../domain/port/repositories/song-channel-stats-repository.js').SongChannelStatsRepository} SongChannelStatsRepository
 */

/** @param {number} songId @param {number} channelId @returns {string} */
function makeKey(songId, channelId) {
  return `${songId}:${channelId}`;
}

/**
 * SongChannelStatsRepository の インメモリ実装。
 *
 * @implements {SongChannelStatsRepository}
 */
export class InMemorySongChannelStatsRepository {
  constructor() {
    /** @type {Map<string, SongChannelStat>} */
    this._store = new Map();
  }

  /**
   * INSERT OR IGNORE で行を作り、sing_count を +1 する。
   * ON CONFLICT(song_id, channel_id) DO UPDATE SET sing_count = sing_count + 1 相当。
   *
   * @param {number} songId
   * @param {number} channelId
   * @param {string} updatedAt
   * @returns {Promise<void>}
   */
  async upsertIncrement(songId, channelId, updatedAt) {
    const key = makeKey(songId, channelId);
    const existing = this._store.get(key);
    if (existing) {
      this._store.set(key, {
        ...existing,
        sing_count: existing.sing_count + 1,
        updated_at: updatedAt,
      });
    } else {
      this._store.set(key, {
        song_id: songId,
        channel_id: channelId,
        sing_count: 1,
        source_index: null,
        created_at: updatedAt,
        updated_at: updatedAt,
      });
    }
  }

  /**
   * 指定 song_id リストの sing_count を 1 デクリメントする (0 下限)。
   * CASE WHEN sing_count > 0 THEN sing_count - 1 ELSE 0 END 相当。
   *
   * @param {number[]} songIds
   * @param {number} channelId
   * @param {string} updatedAt
   * @returns {Promise<void>}
   */
  async decrementBySongIds(songIds, channelId, updatedAt) {
    for (const songId of songIds) {
      const key = makeKey(songId, channelId);
      const existing = this._store.get(key);
      if (!existing) continue;
      this._store.set(key, {
        ...existing,
        sing_count: existing.sing_count > 0 ? existing.sing_count - 1 : 0,
        updated_at: updatedAt,
      });
    }
  }

  /**
   * @param {number} channelId
   * @returns {Promise<SongChannelStat[]>}
   */
  async findByChannelId(channelId) {
    return Array.from(this._store.values())
      .filter((r) => r.channel_id === channelId)
      .map((r) => ({ ...r }));
  }

  /**
   * @returns {Promise<SongChannelStat[]>}
   */
  async findAll() {
    return Array.from(this._store.values()).map((r) => ({ ...r }));
  }
}
