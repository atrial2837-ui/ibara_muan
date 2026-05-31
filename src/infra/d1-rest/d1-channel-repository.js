/**
 * @module infra/d1-rest/d1-channel-repository
 * @description ChannelRepository の D1 REST API 実装。
 *
 * SQL 根拠:
 *   - findAll : admin-server/server.js:231 `SELECT id, code, name FROM channels ORDER BY sort_order ASC, id ASC`
 *   - findByCode: admin-server/server.js:333 `SELECT id, code, name FROM channels WHERE code = ?`
 *
 * @typedef {import('../../domain/port/repositories/channel-repository.js').Channel} Channel
 * @typedef {import('./d1-rest-client.js').D1RestClient} D1RestClient
 */

export class D1RestChannelRepository {
  /** @param {D1RestClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * 全チャンネルを sort_order, id 昇順で返す。
   * 根拠: admin-server/server.js:231 (getChannels)
   *
   * @returns {Promise<Channel[]>}
   */
  async findAll() {
    return /** @type {Channel[]} */ (
      await this.client.query(
        'SELECT id, code, name, sort_order, created_at FROM channels ORDER BY sort_order ASC, id ASC',
      )
    );
  }

  /**
   * チャンネルコードでチャンネルを 1 件取得する。
   * 根拠: admin-server/server.js:333 (addStream 内の channel SELECT)
   *
   * @param {string} code
   * @returns {Promise<Channel|null>}
   */
  async findByCode(code) {
    return /** @type {Channel|null} */ (
      await this.client.queryFirst(
        'SELECT id, code, name, sort_order, created_at FROM channels WHERE code = ?',
        code,
      )
    );
  }
}
