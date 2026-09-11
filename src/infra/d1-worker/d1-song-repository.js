/**
 * @module infra/d1-worker/d1-song-repository
 * @description SongRepository の D1 Worker Binding 実装。
 *
 * SQL 根拠:
 *   - findByKey        ← admin:239  `SELECT id FROM songs WHERE song_key = ?` を拡張
 *   - findByNormalizedTitle ← admin:400 `SELECT id FROM songs WHERE normalized_title = ?` を拡張
 *   - findAll          ← data.js:226 `SELECT * FROM songs ORDER BY id ASC`
 *   - insert           ← admin:244  `INSERT INTO songs (title, normalized_title, artist_id, song_key, display_key, genre, created_at)`
 *   - updateMetadata   ← admin:226-231 `UPDATE songs SET display_key = COALESCE(NULLIF(?, ''), display_key), genre = ...`
 *   - search           ← admin:329-339 LIKE 検索 title/artist/display_key/genre, 最大 80 件
 *   - findById         ← admin:343 saveSongMetadata が id で引くため
 *
 * @typedef {import('../../../src/domain/port/repositories/song-repository.js').Song} Song
 * @typedef {import('../../../src/domain/port/repositories/song-repository.js').NewSong} NewSong
 * @typedef {import('../../../src/domain/port/repositories/song-repository.js').SongMetadata} SongMetadata
 * @typedef {import('./d1-worker-client.js').D1WorkerClient} D1WorkerClient
 */

const METADATA_BATCH_SIZE = 100;

export class D1SongRepository {
  /** @param {D1WorkerClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * song_key で 1 件取得 (なければ null)。
   * 根拠: admin:239 の `SELECT id FROM songs WHERE song_key = ?` を JOIN 付きに拡張。
   *
   * @param {string} songKey
   * @returns {Promise<Song|null>}
   */
  async findByKey(songKey) {
    return this.client.queryFirst(
      `SELECT s.id, s.title, s.normalized_title, s.artist_id, s.song_key, s.display_key, s.genre, s.created_at,
              a.name AS artist
       FROM songs s
       LEFT JOIN artists a ON a.id = s.artist_id
       WHERE s.song_key = ?`,
      songKey,
    );
  }

  /**
   * normalized_title で複数件取得。
   * 根拠: admin:400 `SELECT id FROM songs WHERE normalized_title = ?` を JOIN 付きに拡張。
   * importKeyReferenceCsv の 2 段階マッチング (exact 失敗時) で使用。
   *
   * @param {string} normalizedTitle
   * @returns {Promise<Song[]>}
   */
  async findByNormalizedTitle(normalizedTitle) {
    return this.client.query(
      `SELECT s.id, s.title, s.normalized_title, s.artist_id, s.song_key, s.display_key, s.genre, s.created_at,
              a.name AS artist
       FROM songs s
       LEFT JOIN artists a ON a.id = s.artist_id
       WHERE s.normalized_title = ?`,
      normalizedTitle,
    );
  }

  /**
   * 全曲を id 昇順で取得。
   * 根拠: data.js:226 `SELECT * FROM songs ORDER BY id ASC`。
   * BuildDatasetUseCase が全曲を一括取得する際に使用。
   *
   * @returns {Promise<Song[]>}
   */
  async findAll() {
    return this.client.query(
      `SELECT s.id, s.title, s.normalized_title, s.artist_id, s.song_key, s.display_key, s.genre, s.created_at,
              a.name AS artist
       FROM songs s
       LEFT JOIN artists a ON a.id = s.artist_id
       ORDER BY s.id ASC`,
    );
  }

  /**
   * 新規曲を挿入し、挿入した行の id を返す。
   * 根拠: admin:244-248 `INSERT INTO songs (title, normalized_title, artist_id, song_key, display_key, genre, created_at)`.
   *
   * @param {NewSong} input
   * @returns {Promise<{ id: number }>}
   */
  async insert(input) {
    const result = await this.client.run(
      `INSERT INTO songs (title, normalized_title, artist_id, song_key, display_key, genre, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.title,
      input.normalizedTitle,
      input.artistId,
      input.songKey,
      input.displayKey ?? '',
      input.genre ?? '',
      input.createdAt,
    );
    return { id: result.meta.last_row_id };
  }

  /**
   * display_key / genre を COALESCE(NULLIF(?, ''), ...) ロジックで更新。
   * 根拠: admin:226-231 updateSongMetadata の `COALESCE(NULLIF(?, ''), display_key)` を完全再現。
   *
   * @param {number} id
   * @param {SongMetadata} metadata
   * @returns {Promise<void>}
   */
  async updateMetadata(id, metadata) {
    await this.client.run(
      `UPDATE songs
       SET title       = COALESCE(?, title),
           normalized_title = COALESCE(?, normalized_title),
           artist_id   = COALESCE(?, artist_id),
           song_key    = COALESCE(?, song_key),
           display_key = COALESCE(NULLIF(?, ''), display_key),
           genre = COALESCE(NULLIF(?, ''), genre)
       WHERE id = ?`,
      metadata.title ?? null,
      metadata.normalizedTitle ?? null,
      metadata.artistId ?? null,
      metadata.songKey ?? null,
      metadata.displayKey,
      metadata.genre,
      id,
    );
  }

  /**
   * CSV同期などの大量更新を少数のD1リクエストにまとめる。
   *
   * @param {Array<{ id: number } & SongMetadata>} rows
   * @returns {Promise<void>}
   */
  async updateMetadataBatch(rows) {
    const sql = `UPDATE songs
       SET display_key = COALESCE(NULLIF(?, ''), display_key),
           genre = COALESCE(NULLIF(?, ''), genre)
       WHERE id = ?`;

    for (let index = 0; index < rows.length; index += METADATA_BATCH_SIZE) {
      const chunk = rows.slice(index, index + METADATA_BATCH_SIZE);
      if (!chunk.length) continue;
      const stmts = chunk.map((row) =>
        this.client.db
          .prepare(sql)
          .bind(row.displayKey, row.genre, row.id),
      );
      await this.client.db.batch(stmts);
    }
  }

  /**
   * title / artist / display_key / genre で LIKE 検索。最大 80 件。
   * 根拠: admin:329-339 searchSongs 関数。
   *
   * @param {string} query   - 検索文字列 (normalize 済みを想定)
   * @param {number} limit   - 上限件数 (通常 80)
   * @returns {Promise<Song[]>}
   */
  async search(query, limit) {
    const q = `%${query}%`;
    return this.client.query(
      `SELECT s.id, s.title, s.normalized_title, s.artist_id, s.song_key,
              s.display_key, s.genre, s.created_at,
              a.name AS artist
       FROM songs s
       LEFT JOIN artists a ON a.id = s.artist_id
       WHERE s.title LIKE ? OR a.name LIKE ? OR s.display_key LIKE ? OR s.genre LIKE ?
       ORDER BY s.title ASC
       LIMIT ?`,
      q,
      q,
      q,
      q,
      limit,
    );
  }

  /**
   * id で 1 件取得 (なければ null)。
   * 根拠: admin:343 saveSongMetadata が songId で検証するため。
   *
   * @param {number} id
   * @returns {Promise<Song|null>}
   */
  async findById(id) {
    return this.client.queryFirst(
      `SELECT s.id, s.title, s.normalized_title, s.artist_id, s.song_key, s.display_key, s.genre, s.created_at,
              a.name AS artist
       FROM songs s
       LEFT JOIN artists a ON a.id = s.artist_id
       WHERE s.id = ?`,
      id,
    );
  }
}
