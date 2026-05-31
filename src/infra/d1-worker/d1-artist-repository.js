/**
 * @module infra/d1-worker/d1-artist-repository
 * @description ArtistRepository の D1 Worker Binding 実装。
 *
 * SQL 根拠:
 *   - findByNormalizedName ← admin:215 `SELECT id FROM artists WHERE normalized_name = ?`
 *   - insert               ← admin:217 `INSERT INTO artists (name, normalized_name, created_at)`
 *   - findAll              ← data.js:226 `SELECT * FROM artists ORDER BY id ASC`
 *
 * @typedef {import('../../../src/domain/port/repositories/artist-repository.js').Artist} Artist
 * @typedef {import('../../../src/domain/port/repositories/artist-repository.js').NewArtist} NewArtist
 * @typedef {import('./d1-worker-client.js').D1WorkerClient} D1WorkerClient
 */

export class D1ArtistRepository {
  /** @param {D1WorkerClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * normalized_name で 1 件取得 (なければ null)。
   * 根拠: admin:215 upsertArtist の重複チェック `SELECT id FROM artists WHERE normalized_name = ?`。
   *
   * @param {string} normalizedName
   * @returns {Promise<Artist|null>}
   */
  async findByNormalizedName(normalizedName) {
    return this.client.queryFirst(
      `SELECT id, name, normalized_name, created_at
       FROM artists
       WHERE normalized_name = ?`,
      normalizedName,
    );
  }

  /**
   * 新規アーティストを挿入し、挿入した行の id を返す。
   * 根拠: admin:217-221 `INSERT INTO artists (name, normalized_name, created_at) VALUES (?, ?, ?)`.
   *
   * @param {NewArtist} input
   * @returns {Promise<{ id: number }>}
   */
  async insert(input) {
    const result = await this.client.run(
      `INSERT INTO artists (name, normalized_name, created_at)
       VALUES (?, ?, ?)`,
      input.name,
      input.normalizedName,
      input.createdAt,
    );
    return { id: result.meta.last_row_id };
  }

  /**
   * 全アーティストを id 昇順で取得。
   * 根拠: data.js:226 `SELECT * FROM artists ORDER BY id ASC`。
   * BuildDatasetUseCase が全アーティストを一括取得する際に使用。
   *
   * @returns {Promise<Artist[]>}
   */
  async findAll() {
    return this.client.query(
      `SELECT id, name, normalized_name, created_at
       FROM artists
       ORDER BY id ASC`,
    );
  }
}
