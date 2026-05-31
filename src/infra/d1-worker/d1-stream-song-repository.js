/**
 * @module infra/d1-worker/d1-stream-song-repository
 * @description StreamSongRepository の D1 Worker Binding 実装。
 *
 * SQL 根拠:
 *   - findByStreamId   ← admin:276 (Port 定義に合わせ全行を position 昇順で返す。呼び出し元で song_id フィルタ)
 *   - insertBatch      ← admin:305-309 `INSERT INTO stream_songs (stream_id, song_id, position, raw_text, title_snapshot, artist_snapshot, song_key_snapshot, created_at)`
 *   - deleteByStreamId ← admin:292 `DELETE FROM stream_songs WHERE stream_id = ?`
 *   - findAll          ← data.js:226 `SELECT * FROM stream_songs ORDER BY stream_id ASC, position ASC, id ASC`
 *
 * @typedef {import('../../../src/domain/port/repositories/stream-song-repository.js').StreamSong} StreamSong
 * @typedef {import('../../../src/domain/port/repositories/stream-song-repository.js').NewStreamSong} NewStreamSong
 * @typedef {import('./d1-worker-client.js').D1WorkerClient} D1WorkerClient
 */

export class D1StreamSongRepository {
  /** @param {D1WorkerClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * stream_id に紐付く全セトリ行を position 昇順で取得。
   * 根拠: admin:276 (addStream の上書き時に旧行を取得し sing_count デクリメントに使う)。
   * Port の定義に合わせ全行を返す（呼び出し元で song_id フィルタ）。
   * position 昇順での返却は contract テスト仕様に準拠。
   *
   * @param {number} streamId
   * @returns {Promise<StreamSong[]>}
   */
  async findByStreamId(streamId) {
    return this.client.query(
      `SELECT id, stream_id, song_id, position, raw_text, title_snapshot, artist_snapshot, song_key_snapshot, created_at
       FROM stream_songs
       WHERE stream_id = ?
       ORDER BY position ASC, id ASC`,
      streamId,
    );
  }

  /**
   * 複数のセトリ行を順次挿入する。
   * 根拠: admin:305-309 ループ内の `INSERT INTO stream_songs (...)` を配列化したもの。
   * D1 の batch API を使い 1 往復で送信する。
   *
   * @param {NewStreamSong[]} rows
   * @returns {Promise<void>}
   */
  async insertBatch(rows) {
    if (!rows.length) return;
    const stmts = rows.map((row) =>
      this.client.db
        .prepare(
          `INSERT INTO stream_songs (stream_id, song_id, position, raw_text, title_snapshot, artist_snapshot, song_key_snapshot, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          row.streamId,
          row.songId ?? null,
          row.position,
          row.rawText ?? null,
          row.titleSnapshot,
          row.artistSnapshot ?? null,
          row.songKeySnapshot,
          row.createdAt,
        ),
    );
    await this.client.db.batch(stmts);
  }

  /**
   * stream_id に紐付く全セトリ行を削除。
   * 根拠: admin:292 `DELETE FROM stream_songs WHERE stream_id = ?`
   * (addStream の上書き時に旧行を削除してから再挿入)。
   *
   * @param {number} streamId
   * @returns {Promise<void>}
   */
  async deleteByStreamId(streamId) {
    await this.client.run(
      `DELETE FROM stream_songs WHERE stream_id = ?`,
      streamId,
    );
  }

  /**
   * 全セトリ行を取得。
   * 根拠: data.js:226 `SELECT * FROM stream_songs ORDER BY stream_id ASC, position ASC, id ASC`。
   * BuildDatasetUseCase が dates / streamRefs を埋めるために全行取得する。
   *
   * @returns {Promise<StreamSong[]>}
   */
  async findAll() {
    return this.client.query(
      `SELECT id, stream_id, song_id, position, raw_text, title_snapshot, artist_snapshot, song_key_snapshot, created_at
       FROM stream_songs
       ORDER BY stream_id ASC, position ASC, id ASC`,
    );
  }
}
