/**
 * @module infra/d1-rest/d1-song-channel-stats-repository
 * @description SongChannelStatsRepository の D1 REST API 実装。
 *
 * SQL 根拠:
 *   - upsertIncrement     : admin-server/server.js:381-388
 *       `INSERT INTO song_channel_stats (song_id, channel_id, sing_count, source_index, created_at, updated_at)
 *        VALUES (?, ?, 1, NULL, ?, ?)
 *        ON CONFLICT(song_id, channel_id) DO UPDATE SET sing_count = sing_count + 1, updated_at = excluded.updated_at`
 *   - decrementBySongIds  : admin-server/server.js:352-358
 *       `UPDATE song_channel_stats
 *        SET sing_count = CASE WHEN sing_count > 0 THEN sing_count - 1 ELSE 0 END,
 *            updated_at = ?
 *        WHERE song_id = ? AND channel_id = ?`
 *       ※ admin-server は song_id を 1 件ずつ UPDATE。Port signature は songIds[] なので
 *         このクラスでも同じく直列ループにする。
 *   - findByChannelId     : admin-server/server.js:747 `SELECT * FROM song_channel_stats` + channel_id フィルタ
 *   - findAll             : admin-server/server.js:747 `SELECT * FROM song_channel_stats ORDER BY channel_id ASC, song_id ASC`
 *
 * @typedef {import('../../domain/port/repositories/song-channel-stats-repository.js').SongChannelStat} SongChannelStat
 * @typedef {import('./d1-rest-client.js').D1RestClient} D1RestClient
 */

export class D1RestSongChannelStatsRepository {
  /** @param {D1RestClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * 指定曲・チャンネルの sing_count を +1 する (存在しなければ新規挿入)。
   * 根拠: admin-server/server.js:381-388 (addStream 内の INSERT OR UPDATE)
   *
   * @param {number} songId
   * @param {number} channelId
   * @param {string} updatedAt - ISO8601 文字列
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
   * 複数曲の sing_count を -1 する (0 未満にはならない)。
   * 根拠: admin-server/server.js:352-358 (addStream の上書き時デクリメント)
   * 注: admin-server は song_id を 1 件ずつループ処理するため同様に直列実行する。
   *
   * @param {number[]} songIds
   * @param {number} channelId
   * @param {string} updatedAt - ISO8601 文字列
   * @returns {Promise<void>}
   */
  async decrementBySongIds(songIds, channelId, updatedAt) {
    for (const songId of songIds) {
      await this.client.run(
        `UPDATE song_channel_stats
         SET sing_count = CASE WHEN sing_count > 0 THEN sing_count - 1 ELSE 0 END,
             updated_at = ?
         WHERE song_id = ? AND channel_id = ?`,
        updatedAt,
        songId,
        channelId,
      );
    }
  }

  /**
   * 指定チャンネルの曲別統計を全件返す。
   * 根拠: admin-server/server.js:747 (buildStaticSiteData 内の SELECT + channel_id フィルタ)
   *
   * @param {number} channelId
   * @returns {Promise<SongChannelStat[]>}
   */
  async findByChannelId(channelId) {
    return /** @type {SongChannelStat[]} */ (
      await this.client.query(
        'SELECT song_id, channel_id, sing_count, source_index, created_at, updated_at FROM song_channel_stats WHERE channel_id = ? ORDER BY song_id ASC',
        channelId,
      )
    );
  }

  /**
   * 全チャンネルの曲別統計を channel_id / song_id 昇順で返す。
   * 根拠: admin-server/server.js:747 (buildStaticSiteData 内の SELECT)
   *
   * @returns {Promise<SongChannelStat[]>}
   */
  async findAll() {
    return /** @type {SongChannelStat[]} */ (
      await this.client.query(
        'SELECT song_id, channel_id, sing_count, source_index, created_at, updated_at FROM song_channel_stats ORDER BY channel_id ASC, song_id ASC',
      )
    );
  }
}
