/**
 * @module infra/d1-rest/d1-stream-repository
 * @description StreamRepository の D1 REST API 実装。
 *
 * SQL 根拠:
 *   - findByChannelDateUrlKey: admin-server/server.js:345-348 `SELECT id FROM streams WHERE channel_id=? AND streamed_on=? AND url_key=?`
 *   - insert                 : admin-server/server.js:366-370 `INSERT INTO streams (channel_id, source_index, streamed_on, title, url, song_count, created_at, url_key)`
 *   - update                 : admin-server/server.js:360-363 `UPDATE streams SET source_index=?, title=?, url=?, song_count=? WHERE id=?`
 *   - findAllByChannel       : admin-server/server.js:745 `SELECT * FROM streams ORDER BY channel_id ASC, streamed_on DESC, id ASC` (channel_id filter はアプリ層)
 *   - findAll                : admin-server/server.js:745 同上 (全件)
 *   - nextSourceIndex        : admin-server/server.js:328-330 `SELECT COALESCE(MAX(source_index), 0) + 1 AS next_index FROM streams WHERE channel_id=?`
 *
 * @typedef {import('../../domain/port/repositories/stream-repository.js').Stream} Stream
 * @typedef {import('../../domain/port/repositories/stream-repository.js').NewStream} NewStream
 * @typedef {import('../../domain/port/repositories/stream-repository.js').StreamPatch} StreamPatch
 * @typedef {import('./d1-rest-client.js').D1RestClient} D1RestClient
 */

export class D1RestStreamRepository {
  /** @param {D1RestClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * channel_id / streamed_on / url_key の複合条件で歌枠を 1 件取得する。
   * 根拠: admin-server/server.js:345-348 (addStream 内の重複チェック SELECT)
   *
   * @param {number} channelId
   * @param {string} streamedOn - YYYY-MM-DD
   * @param {string} urlKey
   * @returns {Promise<Stream|null>}
   */
  async findByChannelDateUrlKey(channelId, streamedOn, urlKey) {
    return /** @type {Stream|null} */ (
      await this.client.queryFirst(
        'SELECT id, channel_id, source_index, streamed_on, title, url, url_key, song_count, created_at FROM streams WHERE channel_id = ? AND streamed_on = ? AND url_key = ?',
        channelId,
        streamedOn,
        urlKey,
      )
    );
  }

  /**
   * 新規歌枠を登録する。
   * 根拠: admin-server/server.js:366-370 (addStream 内の INSERT)
   *
   * @param {NewStream} input
   * @returns {Promise<{ id: number }>}
   */
  async insert(input) {
    const meta = await this.client.run(
      `INSERT INTO streams
         (channel_id, source_index, streamed_on, title, url, song_count, created_at, url_key)
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
    return { id: /** @type {number} */ (meta.last_row_id) };
  }

  /**
   * 歌枠の source_index / title / url / song_count を更新する。
   * 根拠: admin-server/server.js:360-363 (addStream の上書き時 UPDATE)
   *
   * @param {number} id
   * @param {StreamPatch} patch
   * @returns {Promise<void>}
   */
  async update(id, patch) {
    await this.client.run(
      'UPDATE streams SET source_index = ?, title = ?, url = ?, song_count = ? WHERE id = ?',
      patch.source_index ?? null,
      patch.title ?? null,
      patch.url ?? null,
      patch.song_count ?? 0,
      id,
    );
  }

  /**
   * 指定チャンネルの全歌枠を streamed_on 降順で返す。
   * 根拠: admin-server/server.js:745 (buildStaticSiteData 内 SELECT を channel_id でフィルタ)
   *
   * @param {number} channelId
   * @returns {Promise<Stream[]>}
   */
  async findAllByChannel(channelId) {
    return /** @type {Stream[]} */ (
      await this.client.query(
        'SELECT id, channel_id, source_index, streamed_on, title, url, url_key, song_count, created_at FROM streams WHERE channel_id = ? ORDER BY streamed_on DESC, id ASC',
        channelId,
      )
    );
  }

  /**
   * 全歌枠を channel_id 昇順 / streamed_on 降順で返す。
   * 根拠: admin-server/server.js:745 (buildStaticSiteData 内の SELECT)
   *
   * @returns {Promise<Stream[]>}
   */
  async findAll() {
    return /** @type {Stream[]} */ (
      await this.client.query(
        'SELECT id, channel_id, source_index, streamed_on, title, url, url_key, song_count, created_at FROM streams ORDER BY channel_id ASC, streamed_on DESC, id ASC',
      )
    );
  }

  /**
   * 指定チャンネルの次の source_index を返す。
   * 根拠: admin-server/server.js:328-330 (nextSourceIndex 関数)
   *
   * @param {number} channelId
   * @returns {Promise<number>}
   */
  async nextSourceIndex(channelId) {
    const row = await this.client.queryFirst(
      'SELECT COALESCE(MAX(source_index), 0) + 1 AS next_index FROM streams WHERE channel_id = ?',
      channelId,
    );
    return /** @type {number} */ (row?.next_index ?? 1);
  }
}
