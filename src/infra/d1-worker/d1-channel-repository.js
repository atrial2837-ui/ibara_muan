/**
 * @module infra/d1-worker/d1-channel-repository
 * @description ChannelRepository の D1 Worker Binding 実装。
 * チャンネルは管理 UI で CRUD しないため read-only のみ。
 *
 * SQL 根拠:
 *   - findAll    ← admin:161 `SELECT id, code, name FROM channels ORDER BY sort_order ASC, id ASC`
 *   - findByCode ← admin:257-258 `SELECT id, code, name FROM channels WHERE code = ?`
 *
 * @typedef {import('../../../src/domain/port/repositories/channel-repository.js').Channel} Channel
 * @typedef {import('./d1-worker-client.js').D1WorkerClient} D1WorkerClient
 */

export class D1ChannelRepository {
  /** @param {D1WorkerClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * 全チャンネルを sort_order 昇順、id 昇順で取得。
   * 根拠: admin:161 `SELECT id, code, name FROM channels ORDER BY sort_order ASC, id ASC`。
   * BuildDatasetUseCase および getChannels で使用。
   *
   * @returns {Promise<Channel[]>}
   */
  async findAll() {
    return this.client.query(
      `SELECT id, code, name, sort_order, created_at
       FROM channels
       ORDER BY sort_order ASC, id ASC`,
    );
  }

  /**
   * code で 1 件取得 (なければ null)。
   * 根拠: admin:257-258 `SELECT id, code, name FROM channels WHERE code = ?`。
   * addStream で channel_code → channel.id の解決に使用。
   *
   * @param {string} code
   * @returns {Promise<Channel|null>}
   */
  async findByCode(code) {
    return this.client.queryFirst(
      `SELECT id, code, name, sort_order, created_at
       FROM channels
       WHERE code = ?`,
      code,
    );
  }
}
