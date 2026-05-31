/**
 * @module infra/d1-worker/d1-stream-repository
 * @description StreamRepository の D1 Worker Binding 実装。
 *
 * SQL 根拠:
 *   - findByChannelDateUrlKey ← admin:269-271 `SELECT ... WHERE channel_id=? AND streamed_on=? AND url_key=?`
 *   - insert                  ← admin:294-298 `INSERT INTO streams (channel_id, source_index, streamed_on, title, url, song_count, created_at, url_key)`
 *   - update                  ← admin:285-291 `UPDATE streams SET source_index=?, title=?, url=?, song_count=? WHERE id=?`
 *   - findAllByChannel         ← data.js:226 + admin 内の channel_id フィルタ `ORDER BY channel_id ASC, streamed_on DESC, id ASC`
 *   - findAll                 ← data.js:226 `SELECT * FROM streams ORDER BY channel_id ASC, streamed_on DESC, id ASC`
 *   - nextSourceIndex         ← admin:252-254 `SELECT COALESCE(MAX(source_index), 0) + 1 AS next_index FROM streams WHERE channel_id=?`
 *
 * @typedef {import('../../../src/domain/port/repositories/stream-repository.js').Stream} Stream
 * @typedef {import('../../../src/domain/port/repositories/stream-repository.js').NewStream} NewStream
 * @typedef {import('../../../src/domain/port/repositories/stream-repository.js').StreamPatch} StreamPatch
 * @typedef {import('./d1-worker-client.js').D1WorkerClient} D1WorkerClient
 */

export class D1StreamRepository {
  /** @param {D1WorkerClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * channel_id + streamed_on + url_key で 1 件取得 (なければ null)。
   * 根拠: admin:269-271 addStream の重複チェック。
   *
   * @param {number} channelId
   * @param {string} streamedOn   - YYYY-MM-DD
   * @param {string} urlKey
   * @returns {Promise<Stream|null>}
   */
  async findByChannelDateUrlKey(channelId, streamedOn, urlKey) {
    return this.client.queryFirst(
      `SELECT id, channel_id, source_index, streamed_on, title, url, url_key, song_count, created_at
       FROM streams
       WHERE channel_id = ? AND streamed_on = ? AND url_key = ?`,
      channelId,
      streamedOn,
      urlKey,
    );
  }

  /**
   * 新規歌枠を挿入し、挿入した行の id を返す。
   * 根拠: admin:294-298 `INSERT INTO streams (channel_id, source_index, streamed_on, title, url, song_count, created_at, url_key)`.
   *
   * @param {NewStream} input
   * @returns {Promise<{ id: number }>}
   */
  async insert(input) {
    const result = await this.client.run(
      `INSERT INTO streams (channel_id, source_index, streamed_on, title, url, song_count, created_at, url_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      input.channelId,
      input.sourceIndex ?? null,
      input.streamedOn,
      input.title ?? null,
      input.url ?? null,
      input.songCount,
      input.createdAt,
      input.urlKey,
    );
    return { id: result.meta.last_row_id };
  }

  /**
   * 既存歌枠を部分更新。
   * 根拠: admin:285-291 `UPDATE streams SET source_index=?, title=?, url=?, song_count=? WHERE id=?`.
   *
   * @param {number} id
   * @param {StreamPatch} patch
   * @returns {Promise<void>}
   */
  async update(id, patch) {
    await this.client.run(
      `UPDATE streams
       SET source_index = ?, title = ?, url = ?, song_count = ?
       WHERE id = ?`,
      patch.source_index ?? null,
      patch.title ?? null,
      patch.url ?? null,
      patch.song_count ?? 0,
      id,
    );
  }

  /**
   * 指定チャンネルの歌枠を全件取得。
   * 根拠: data.js:226 の ORDER + channel_id フィルタ。
   *
   * @param {number} channelId
   * @returns {Promise<Stream[]>}
   */
  async findAllByChannel(channelId) {
    return this.client.query(
      `SELECT id, channel_id, source_index, streamed_on, title, url, url_key, song_count, created_at
       FROM streams
       WHERE channel_id = ?
       ORDER BY streamed_on DESC, id ASC`,
      channelId,
    );
  }

  /**
   * 全歌枠を取得。
   * 根拠: data.js:226 `SELECT * FROM streams ORDER BY channel_id ASC, streamed_on DESC, id ASC`。
   * BuildDatasetUseCase が全歌枠を一括取得する。
   *
   * @returns {Promise<Stream[]>}
   */
  async findAll() {
    return this.client.query(
      `SELECT id, channel_id, source_index, streamed_on, title, url, url_key, song_count, created_at
       FROM streams
       ORDER BY channel_id ASC, streamed_on DESC, id ASC`,
    );
  }

  /**
   * 次の source_index を採番する (MAX + 1)。
   * 根拠: admin:252-254 `SELECT COALESCE(MAX(source_index), 0) + 1 AS next_index FROM streams WHERE channel_id = ?`.
   *
   * @param {number} channelId
   * @returns {Promise<number>}
   */
  async nextSourceIndex(channelId) {
    const row = await this.client.queryFirst(
      `SELECT COALESCE(MAX(source_index), 0) + 1 AS next_index
       FROM streams
       WHERE channel_id = ?`,
      channelId,
    );
    return row?.next_index ?? 1;
  }
}
