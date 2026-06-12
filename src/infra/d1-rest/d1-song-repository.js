/**
 * @module infra/d1-rest/d1-song-repository
 * @description SongRepository の D1 REST API 実装。
 *
 * SQL 根拠:
 *   - findByKey          : admin-server/server.js:313 `SELECT id FROM songs WHERE song_key = ?`
 *   - findByNormalizedTitle: admin-server/server.js:468 `SELECT id FROM songs WHERE normalized_title = ?`
 *   - findAll            : admin-server/server.js:235-239 (buildSongMaps) + 744 `SELECT * FROM songs ORDER BY id ASC`
 *   - insert             : admin-server/server.js:320-323 (upsertSong 内の INSERT INTO songs)
 *   - updateMetadata     : admin-server/server.js:300-306 (updateSongMetadata: UPDATE songs SET display_key, genre)
 *                          ※ saveSongMetadata:418 は引数違い (直接 SET); Port は updateSongMetadata の形を採用
 *   - search             : admin-server/server.js:402-412 (searchSongs: title/artist/display_key/genre LIKE, LIMIT 80)
 *   - findById           : admin-server/server.js:415-416 (saveSongMetadata で songId 確認)
 *
 * @typedef {import('../../domain/port/repositories/song-repository.js').Song} Song
 * @typedef {import('../../domain/port/repositories/song-repository.js').NewSong} NewSong
 * @typedef {import('../../domain/port/repositories/song-repository.js').SongMetadata} SongMetadata
 * @typedef {import('./d1-rest-client.js').D1RestClient} D1RestClient
 */

/** JOIN 済み Song を返すための共通 SELECT 句 */
const SONG_SELECT = `
  SELECT s.id, s.title, s.normalized_title, s.artist_id, s.song_key,
         s.display_key, s.genre, s.created_at,
         a.name AS artist
  FROM songs s
  LEFT JOIN artists a ON a.id = s.artist_id
`;

export class D1RestSongRepository {
  /** @param {D1RestClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * song_key で曲を 1 件取得する。
   * 根拠: admin-server/server.js:313 (upsertSong 内の SELECT)
   *
   * @param {string} songKey
   * @returns {Promise<Song|null>}
   */
  async findByKey(songKey) {
    return /** @type {Song|null} */ (
      await this.client.queryFirst(
        `${SONG_SELECT} WHERE s.song_key = ?`,
        songKey,
      )
    );
  }

  /**
   * normalized_title で曲を複数件取得する。
   * 根拠: admin-server/server.js:468 (syncKeyReference / importKeyReferenceCsv 内 SELECT)
   *
   * @param {string} normalizedTitle
   * @returns {Promise<Song[]>}
   */
  async findByNormalizedTitle(normalizedTitle) {
    return /** @type {Song[]} */ (
      await this.client.query(
        `${SONG_SELECT} WHERE s.normalized_title = ?`,
        normalizedTitle,
      )
    );
  }

  /**
   * 全曲を id 昇順で返す。
   * 根拠: admin-server/server.js:744 (buildStaticSiteData 内の SELECT)
   *
   * @returns {Promise<Song[]>}
   */
  async findAll() {
    return /** @type {Song[]} */ (
      await this.client.query(
        `${SONG_SELECT} ORDER BY s.id ASC`,
      )
    );
  }

  /**
   * 新規曲を登録する。
   * 根拠: admin-server/server.js:320-323 (upsertSong 内の INSERT)
   *
   * @param {NewSong} input
   * @returns {Promise<{ id: number }>}
   */
  async insert(input) {
    const meta = await this.client.run(
      `INSERT INTO songs
         (title, normalized_title, artist_id, song_key, display_key, genre, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.title,
      input.normalizedTitle,
      input.artistId,
      input.songKey,
      input.displayKey ?? '',
      input.genre ?? '',
      input.createdAt,
    );
    return { id: /** @type {number} */ (meta.last_row_id) };
  }

  /**
   * 曲のメタデータ (display_key / genre) を更新する。
   * display_key / genre は空文字の場合は既存値を保持する (COALESCE / NULLIF パターン)。
   * 根拠: admin-server/server.js:300-306 (updateSongMetadata)
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
           genre       = COALESCE(NULLIF(?, ''), genre)
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
   * タイトル / アーティスト / display_key / genre で曲を LIKE 検索する。
   * 根拠: admin-server/server.js:402-412 (searchSongs)
   *
   * @param {string} query  - 正規化済み検索文字列 (呼び出し元で normalize 済みであること)
   * @param {number} limit  - 最大取得件数 (admin-server は 80 固定)
   * @returns {Promise<Song[]>}
   */
  async search(query, limit = 80) {
    const q = `%${query}%`;
    return /** @type {Song[]} */ (
      await this.client.query(
        `SELECT s.id, s.title, s.normalized_title, s.artist_id, s.song_key,
                s.display_key, s.genre, s.created_at,
                a.name AS artist
         FROM songs s
         LEFT JOIN artists a ON a.id = s.artist_id
         WHERE s.title LIKE ? OR a.name LIKE ? OR s.display_key LIKE ? OR s.genre LIKE ?
         ORDER BY s.title ASC
         LIMIT ?`,
        q, q, q, q, limit,
      )
    );
  }

  /**
   * id で曲を 1 件取得する。
   * 根拠: admin-server/server.js:415-416 (saveSongMetadata で songId 存在確認)
   *
   * @param {number} id
   * @returns {Promise<Song|null>}
   */
  async findById(id) {
    return /** @type {Song|null} */ (
      await this.client.queryFirst(
        `${SONG_SELECT} WHERE s.id = ?`,
        id,
      )
    );
  }
}
