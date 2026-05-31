/**
 * @module domain/port/repositories/artist-repository
 * @description ArtistRepository Port (interface) および関連 DTO 型定義。
 *
 * 根拠となる既存コード:
 *   - SoT 02 §5-2 (ArtistRepository 候補)
 *   - functions/api/admin/[[path]].js:215 (findByNormalizedName: SELECT id FROM artists WHERE normalized_name=?)
 *   - functions/api/admin/[[path]].js:217 (insert: INSERT INTO artists (name, normalized_name, created_at))
 *   - functions/api/data.js:225 (findAll: SELECT * FROM artists — BuildDatasetUseCase で使用)
 *
 * SoT 02 §5-2 案からの変更:
 *   なし (案をそのまま採用)
 *
 * @副作用 なし (typedef のみ)
 */

/**
 * artists テーブルの行。
 *
 * @typedef {object} Artist
 * @property {number} id
 * @property {string} name            - 表示名
 * @property {string} normalized_name - NFKC 正規化 + trim + lower
 * @property {string} created_at      - ISO8601 文字列
 */

/**
 * アーティストの新規登録に必要な入力 DTO。
 *
 * @typedef {object} NewArtist
 * @property {string} name           - 表示名 (空の場合は '(不明)' を渡す)
 * @property {string} normalizedName - normalizedKey(name) の結果
 * @property {string} createdAt      - ISO8601 文字列 (clock.now() から生成)
 */

/**
 * アーティストの永続化 Port interface。
 *
 * @typedef {object} ArtistRepository
 * @property {(normalizedName: string) => Promise<Artist|null>} findByNormalizedName
 *   - 根拠: admin:215 `SELECT id FROM artists WHERE normalized_name = ?`
 *   - upsertArtist で重複チェックに使用
 * @property {(input: NewArtist) => Promise<{ id: number }>} insert
 *   - 根拠: admin:217 `INSERT INTO artists (name, normalized_name, created_at)`
 * @property {() => Promise<Artist[]>} findAll
 *   - 根拠: data.js:225 `Promise.all([..., db.prepare('SELECT ...').all()])`
 *   - BuildDatasetUseCase が全アーティストを一括取得する際に使用
 */

export {};
