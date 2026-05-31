/**
 * @module infra/d1-rest/d1-stream-song-repository
 * @description StreamSongRepository の D1 REST API 実装。
 *
 * SQL 根拠:
 *   - findByStreamId   : admin-server/server.js:350 `SELECT song_id FROM stream_songs WHERE stream_id=? AND song_id IS NOT NULL`
 *                        ※ Port の findByStreamId は全カラムを返す設計なので全列 SELECT に拡張
 *   - insertBatch      : admin-server/server.js:377-380 `INSERT INTO stream_songs (...) VALUES (...)`
 *                        ※ REST API は一括 INSERT をサポートしないため 1 行ずつ実行
 *   - deleteByStreamId : admin-server/server.js:364 `DELETE FROM stream_songs WHERE stream_id=?`
 *   - findAll          : admin-server/server.js:746 `SELECT * FROM stream_songs ORDER BY stream_id ASC, position ASC, id ASC`
 *
 * @typedef {import('../../domain/port/repositories/stream-song-repository.js').StreamSong} StreamSong
 * @typedef {import('../../domain/port/repositories/stream-song-repository.js').NewStreamSong} NewStreamSong
 * @typedef {import('./d1-rest-client.js').D1RestClient} D1RestClient
 */

export class D1RestStreamSongRepository {
  /** @param {D1RestClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * stream_id でセトリ行を全件取得する。
   * 根拠: admin-server/server.js:350 (addStream の上書き時に旧行を取得)
   *
   * @param {number} streamId
   * @returns {Promise<StreamSong[]>}
   */
  async findByStreamId(streamId) {
    return /** @type {StreamSong[]} */ (
      await this.client.query(
        `SELECT id, stream_id, song_id, position, raw_text,
                title_snapshot, artist_snapshot, song_key_snapshot, created_at
         FROM stream_songs
         WHERE stream_id = ?
         ORDER BY position ASC, id ASC`,
        streamId,
      )
    );
  }

  /**
   * セトリ行を 1 件ずつ順番に挿入する。
   * 根拠: admin-server/server.js:377-380 (addStream 内の INSERT INTO stream_songs)
   * 注: D1 REST API はバッチ INSERT 文を直接サポートしないため直列処理する。
   *
   * @param {NewStreamSong[]} rows
   * @returns {Promise<void>}
   */
  async insertBatch(rows) {
    for (const row of rows) {
      await this.client.run(
        `INSERT INTO stream_songs
           (stream_id, song_id, position, raw_text, title_snapshot, artist_snapshot, song_key_snapshot, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        row.streamId,
        row.songId ?? null,
        row.position,
        row.rawText ?? null,
        row.titleSnapshot,
        row.artistSnapshot ?? null,
        row.songKeySnapshot,
        row.createdAt,
      );
    }
  }

  /**
   * stream_id に紐づく全セトリ行を削除する。
   * 根拠: admin-server/server.js:364 (addStream の上書き時 DELETE)
   *
   * @param {number} streamId
   * @returns {Promise<void>}
   */
  async deleteByStreamId(streamId) {
    await this.client.run(
      'DELETE FROM stream_songs WHERE stream_id = ?',
      streamId,
    );
  }

  /**
   * 全セトリ行を stream_id / position / id 昇順で返す。
   * 根拠: admin-server/server.js:746 (buildStaticSiteData 内の SELECT)
   *
   * @returns {Promise<StreamSong[]>}
   */
  async findAll() {
    return /** @type {StreamSong[]} */ (
      await this.client.query(
        `SELECT id, stream_id, song_id, position, raw_text,
                title_snapshot, artist_snapshot, song_key_snapshot, created_at
         FROM stream_songs
         ORDER BY stream_id ASC, position ASC, id ASC`,
      )
    );
  }
}
