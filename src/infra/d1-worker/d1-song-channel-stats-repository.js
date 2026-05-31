/**
 * @module infra/d1-worker/d1-song-channel-stats-repository
 * @description SongChannelStatsRepository の D1 Worker Binding 実装。
 *
 * SQL 根拠:
 *   - upsertIncrement    ← admin:309-315 `INSERT INTO song_channel_stats ... ON CONFLICT(song_id, channel_id) DO UPDATE SET sing_count = sing_count + 1`
 *   - decrementBySongIds ← admin:279-283 `UPDATE song_channel_stats SET sing_count = CASE WHEN sing_count > 0 THEN sing_count - 1 ELSE 0 END`
 *   - findByChannelId    ← data.js:83 `filter(s => s.channel_id === channel.id)` を SQL で再現
 *   - findAll            ← data.js:226 `SELECT * FROM song_channel_stats ORDER BY channel_id ASC, song_id ASC`
 *
 * sing_count 不変条件: `sing_count >= 0`
 *   デクリメント時は `CASE WHEN sing_count > 0 THEN sing_count - 1 ELSE 0 END` で 0 未満を防ぐ (admin:280-283 再現)。
 *
 * @typedef {import('../../../src/domain/port/repositories/song-channel-stats-repository.js').SongChannelStat} SongChannelStat
 * @typedef {import('./d1-worker-client.js').D1WorkerClient} D1WorkerClient
 */

export class D1SongChannelStatsRepository {
  /** @param {D1WorkerClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * sing_count を 1 増分する UPSERT。
   * 根拠: admin:309-315
   *   `INSERT INTO song_channel_stats (song_id, channel_id, sing_count, source_index, created_at, updated_at)
   *    VALUES (?, ?, 1, NULL, ?, ?)
   *    ON CONFLICT(song_id, channel_id) DO UPDATE SET
   *      sing_count = sing_count + 1,
   *      updated_at = excluded.updated_at`
   *
   * @param {number} songId
   * @param {number} channelId
   * @param {string} updatedAt  - ISO8601 文字列 (clock.now() から生成)
   * @returns {Promise<void>}
   */
  async upsertIncrement(songId, channelId, updatedAt) {
    await this.client.run(
      `INSERT INTO song_channel_stats (song_id, channel_id, sing_count, source_index, created_at, updated_at)
       VALUES (?, ?, 1, NULL, ?, ?)
       ON CONFLICT(song_id, channel_id) DO UPDATE SET
         sing_count = sing_count + 1,
         updated_at = excluded.updated_at`,
      songId,
      channelId,
      updatedAt,
      updatedAt,
    );
  }

  /**
   * 複数曲の sing_count を 1 減分する (0 未満にはしない)。
   * 根拠: admin:279-283
   *   `UPDATE song_channel_stats
   *    SET sing_count = CASE WHEN sing_count > 0 THEN sing_count - 1 ELSE 0 END,
   *        updated_at = ?
   *    WHERE song_id = ? AND channel_id = ?`
   * ※ 既存コードはループで 1 件ずつ UPDATE しているため、同一の単一 WHERE 句を維持する。
   *   D1 batch API で複数ステートメントを 1 往復に集約して既存挙動を再現する。
   *
   * @param {number[]} songIds
   * @param {number}   channelId
   * @param {string}   updatedAt  - ISO8601 文字列 (clock.now() から生成)
   * @returns {Promise<void>}
   */
  async decrementBySongIds(songIds, channelId, updatedAt) {
    if (!songIds.length) return;
    const stmts = songIds.map((songId) =>
      this.client.db
        .prepare(
          `UPDATE song_channel_stats
           SET sing_count = CASE WHEN sing_count > 0 THEN sing_count - 1 ELSE 0 END,
               updated_at = ?
           WHERE song_id = ? AND channel_id = ?`,
        )
        .bind(updatedAt, songId, channelId),
    );
    await this.client.db.batch(stmts);
  }

  /**
   * 指定チャンネルの統計を全件取得。
   * 根拠: data.js:83 `filter(s => s.channel_id === channel.id)` の SQL 版。
   *
   * @param {number} channelId
   * @returns {Promise<SongChannelStat[]>}
   */
  async findByChannelId(channelId) {
    return this.client.query(
      `SELECT song_id, channel_id, sing_count, source_index, created_at, updated_at
       FROM song_channel_stats
       WHERE channel_id = ?
       ORDER BY song_id ASC`,
      channelId,
    );
  }

  /**
   * 全チャンネルの統計を全件取得。
   * 根拠: data.js:226 `SELECT * FROM song_channel_stats ORDER BY channel_id ASC, song_id ASC`。
   * BuildDatasetUseCase が全統計を一括取得する際に使用。
   *
   * @returns {Promise<SongChannelStat[]>}
   */
  async findAll() {
    return this.client.query(
      `SELECT song_id, channel_id, sing_count, source_index, created_at, updated_at
       FROM song_channel_stats
       ORDER BY channel_id ASC, song_id ASC`,
    );
  }
}
