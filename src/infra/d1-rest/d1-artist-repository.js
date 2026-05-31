/**
 * @module infra/d1-rest/d1-artist-repository
 * @description ArtistRepository の D1 REST API 実装。
 *
 * SQL 根拠:
 *   - findByNormalizedName: admin-server/server.js:289 `SELECT id FROM artists WHERE normalized_name = ?`
 *   - insert            : admin-server/server.js:292-295 `INSERT INTO artists (name, normalized_name, created_at) VALUES (?, ?, ?)`
 *   - findAll           : admin-server/server.js:235-239 `SELECT * FROM songs LEFT JOIN artists ...` (artists 全体 取得)
 *                         + buildStaticSiteData:743 `SELECT * FROM artists ORDER BY id ASC`
 *
 * @typedef {import('../../domain/port/repositories/artist-repository.js').Artist} Artist
 * @typedef {import('../../domain/port/repositories/artist-repository.js').NewArtist} NewArtist
 * @typedef {import('./d1-rest-client.js').D1RestClient} D1RestClient
 */

export class D1RestArtistRepository {
  /** @param {D1RestClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * 正規化名でアーティストを 1 件取得する。
   * 根拠: admin-server/server.js:289 (upsertArtist 内の SELECT)
   *
   * @param {string} normalizedName
   * @returns {Promise<Artist|null>}
   */
  async findByNormalizedName(normalizedName) {
    return /** @type {Artist|null} */ (
      await this.client.queryFirst(
        'SELECT id, name, normalized_name, created_at FROM artists WHERE normalized_name = ?',
        normalizedName,
      )
    );
  }

  /**
   * 新規アーティストを登録する。
   * 根拠: admin-server/server.js:292-295 (upsertArtist 内の INSERT)
   *
   * @param {NewArtist} input
   * @returns {Promise<{ id: number }>}
   */
  async insert(input) {
    const meta = await this.client.run(
      'INSERT INTO artists (name, normalized_name, created_at) VALUES (?, ?, ?)',
      input.name,
      input.normalizedName,
      input.createdAt,
    );
    return { id: /** @type {number} */ (meta.last_row_id) };
  }

  /**
   * 全アーティストを id 昇順で返す。
   * 根拠: admin-server/server.js:743 (buildStaticSiteData 内の SELECT)
   *
   * @returns {Promise<Artist[]>}
   */
  async findAll() {
    return /** @type {Artist[]} */ (
      await this.client.query(
        'SELECT id, name, normalized_name, created_at FROM artists ORDER BY id ASC',
      )
    );
  }
}
