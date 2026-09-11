/**
 * @module domain/port/repositories/song-repository
 * @description SongRepository Port (interface) および関連 DTO 型定義。
 *
 * 根拠となる既存コード:
 *   - SoT 02 §5-1 (SongRepository 候補)
 *   - functions/api/admin/[[path]].js:239 (findByKey: selectOne WHERE song_key=?)
 *   - functions/api/admin/[[path]].js:215 (findByNormalizedName ← upsertSong 内の title 検索)
 *   - functions/api/admin/[[path]].js:244 (insert: INSERT INTO songs)
 *   - functions/api/admin/[[path]].js:240-241 (updateMetadata: UPDATE songs SET display_key, genre)
 *   - functions/api/data.js:225 (findAll: SELECT * FROM songs)
 *   - functions/api/admin/[[path]].js:329-339 (search: LIKE 検索, 最大 80 件)
 *   - functions/api/admin/[[path]].js:343 (findById: SELECT WHERE id=?)
 *   - SoT 20 §4 (SongRepository interface 例: search メソッド追加)
 *
 * SoT 02 §5-1 案からの変更:
 *   - `search(query, limit)` を追加 — admin:329-339 の songs/search?q= エンドポイントが必要
 *   - `findById(id)` を追加 — admin:343 の saveSongMetadata が id で引くため
 *
 * @副作用 なし (typedef のみ)
 */

/**
 * DB から JOIN 済みの曲行。`artist` は `artists.name AS artist` の結果。
 * song-resolver.js の SongRow と同型 (再利用を推奨)。
 *
 * @typedef {object} Song
 * @property {number}      id
 * @property {string}      title
 * @property {string}      normalized_title
 * @property {number|null} artist_id
 * @property {string}      artist          - JOIN 済み artists.name
 * @property {string}      song_key
 * @property {string}      display_key     - 未設定時は ''
 * @property {string}      genre           - 未設定時は ''
 * @property {string}      created_at      - ISO8601 文字列
 */

/**
 * 曲の新規登録に必要な入力 DTO。
 *
 * @typedef {object} NewSong
 * @property {string}  title           - 表示用タイトル
 * @property {string}  normalizedTitle - normalizedKey(title) の結果
 * @property {number}  artistId        - artists.id (upsert 後の値)
 * @property {string}  songKey         - buildSongKey で生成したキー
 * @property {string}  [displayKey]    - 省略時は '' で登録
 * @property {string}  [genre]         - 省略時は '' で登録
 * @property {string}  createdAt       - ISO8601 文字列 (clock.now() から生成)
 */

/**
 * メタデータ更新に必要な入力 DTO (updateMetadata 用)。
 *
 * @typedef {object} SongMetadata
 * @property {string} displayKey - 正規化済み DisplayKey (parseDisplayKey 済み)
 * @property {string} genre      - 正規化済み Genre (parseGenre 済み)
 * @property {string} [title]           - 表示用タイトル
 * @property {string} [normalizedTitle] - normalizedKey(title) の結果
 * @property {number} [artistId]        - artists.id
 * @property {string} [songKey]         - buildSongKey で生成したキー
 */

/**
 * 曲の永続化 Port interface。
 *
 * @typedef {object} SongRepository
 * @property {(songKey: string) => Promise<Song|null>} findByKey
 *   - 根拠: admin:239 `SELECT * FROM songs WHERE song_key = ?`
 *   - upsertSong で重複チェックに使用
 * @property {(normalizedTitle: string) => Promise<Song[]>} findByNormalizedTitle
 *   - 根拠: admin:397-401 `SELECT * FROM songs WHERE normalized_title LIKE ?`
 *   - importKeyReferenceCsv の 2 段階マッチング (exact 失敗時)
 * @property {() => Promise<Song[]>} findAll
 *   - 根拠: data.js:225 `Promise.all([..., db.prepare('SELECT ...').all()])`
 *   - BuildDatasetUseCase が全曲を一括取得し buildSongMaps に渡す
 * @property {(input: NewSong) => Promise<{ id: number }>} insert
 *   - 根拠: admin:244 `INSERT INTO songs (title, normalized_title, artist_id, song_key, ...)`
 * @property {(id: number, metadata: SongMetadata) => Promise<void>} updateMetadata
 *   - 根拠: admin:240-241 `UPDATE songs SET display_key=?, genre=? WHERE id=?`
 *   - saveSongMetadata / importKeyReferenceCsv が呼び出し
 * @property {(rows: Array<{ id: number } & SongMetadata>) => Promise<void>} [updateMetadataBatch]
 *   - CSV同期の大量更新用。実装があれば複数曲を少数のDBリクエストへまとめる
 * @property {(query: string, limit: number) => Promise<Song[]>} search
 *   - 根拠: admin:329-339 searchSongs — title/artist/song_key/genre で LIKE 検索, 最大 80 件
 *   - SoT 20 §4 にも明記 (SoT 02 §5-1 案には未記載のため追加)
 * @property {(id: number) => Promise<Song|null>} [findById]
 *   - 根拠: admin:343 `if (!songId) throw` — saveSongMetadata で id 検証に使用
 *   - optional: UseCase 実装によっては findByKey に統一できる可能性あり
 */

export {};
