/**
 * @module domain/port/repositories/stream-song-repository
 * @description StreamSongRepository Port (interface) および関連 DTO 型定義。
 *
 * 根拠となる既存コード:
 *   - SoT 02 §5-4 (StreamSongRepository 候補)
 *   - functions/api/admin/[[path]].js:276 (findByStreamId: SELECT WHERE stream_id=? — 旧行取得)
 *   - functions/api/admin/[[path]].js:305-309 (insertBatch: INSERT INTO stream_songs ...)
 *   - functions/api/admin/[[path]].js:292 (deleteByStreamId: DELETE WHERE stream_id=? — 上書き時)
 *   - functions/api/data.js:225 (findAll: SELECT * FROM stream_songs — BuildDatasetUseCase)
 *
 * SoT 02 §5-4 案からの変更:
 *   - `findAll()` を追加 — data.js:225 が stream_songs を全取得するため
 *     (BuildDatasetUseCase が dates / streamRefs を埋めるのに必要)
 *
 * @副作用 なし (typedef のみ)
 */

/**
 * stream_songs テーブルの行。
 *
 * @typedef {object} StreamSong
 * @property {number}      id
 * @property {number}      stream_id
 * @property {number|null} song_id           - 未マッチ時は null
 * @property {number}      position          - 1-indexed, セトリ内順番
 * @property {string|null} raw_text          - 入力テキストそのまま
 * @property {string}      title_snapshot    - 登録時タイトルコピー
 * @property {string|null} artist_snapshot   - 登録時歌手名コピー
 * @property {string}      song_key_snapshot - 登録時 song_key コピー
 * @property {string}      created_at        - ISO8601 文字列
 */

/**
 * セトリ 1 行の新規登録に必要な入力 DTO。
 *
 * @typedef {object} NewStreamSong
 * @property {number}      streamId
 * @property {number|null} songId           - マッチした場合は song.id、未マッチは null
 * @property {number}      position         - 1-indexed
 * @property {string|null} rawText
 * @property {string}      titleSnapshot
 * @property {string|null} artistSnapshot
 * @property {string}      songKeySnapshot
 * @property {string}      createdAt        - ISO8601 文字列 (clock.now() から生成)
 */

/**
 * セトリ行の永続化 Port interface。
 *
 * @typedef {object} StreamSongRepository
 * @property {(streamId: number) => Promise<StreamSong[]>} findByStreamId
 *   - 根拠: admin:276 `SELECT * FROM stream_songs WHERE stream_id = ?`
 *   - addStream の上書き時に旧行を取得し sing_count デクリメントに使う
 * @property {(rows: NewStreamSong[]) => Promise<void>} insertBatch
 *   - 根拠: admin:305-309 `INSERT INTO stream_songs (stream_id, song_id, position, ...)`
 *   - 複数行を 1 トランザクション相当で挿入する
 * @property {(streamId: number) => Promise<void>} deleteByStreamId
 *   - 根拠: admin:292 上書き時に旧 stream_songs を DELETE してから再挿入
 * @property {() => Promise<StreamSong[]>} findAll
 *   - 根拠: data.js:225 `Promise.all([..., db.prepare('SELECT * FROM stream_songs').all()])`
 *   - BuildDatasetUseCase が dates / streamRefs を埋めるために全行取得する
 *   - SoT 02 §5-4 案には未記載のため追加
 */

export {};
