/**
 * @module domain/port/repositories/stream-repository
 * @description StreamRepository Port (interface) および関連 DTO 型定義。
 *
 * 根拠となる既存コード:
 *   - SoT 02 §5-3 (StreamRepository 候補)
 *   - functions/api/admin/[[path]].js:269-271 (findByChannelDateUrlKey: SELECT WHERE channel_id=? AND streamed_on=? AND url_key=?)
 *   - functions/api/admin/[[path]].js:292-298 (insert: INSERT INTO streams OR REPLACE)
 *   - functions/api/admin/[[path]].js:276-284 (update: 旧 stream の song_count 更新)
 *   - functions/api/data.js:225 (findAll: SELECT * FROM streams — BuildDatasetUseCase)
 *   - admin-server/server.js (findAllByChannel: generate_static_data で channel 別取得)
 *   - functions/api/admin/[[path]].js:251-254 (nextSourceIndex: MAX(source_index) + 1)
 *
 * SoT 02 §5-3 案からの変更:
 *   なし (案をそのまま採用。findAllByChannel / findAll の両方が必要な理由は
 *   SoT 02 §5-3 本文に明記済み)
 *
 * @副作用 なし (typedef のみ)
 */

/**
 * streams テーブルの行。
 *
 * @typedef {object} Stream
 * @property {number}      id
 * @property {number}      channel_id
 * @property {number|null} source_index  - 枠番号 (スプレッドシート列番号)
 * @property {string}      streamed_on   - YYYY-MM-DD
 * @property {string|null} title
 * @property {string|null} url
 * @property {string}      url_key       - 重複判定キー
 * @property {number}      song_count    - 記録上の曲数
 * @property {string}      created_at    - ISO8601 文字列
 */

/**
 * 歌枠の新規登録に必要な入力 DTO。
 *
 * @typedef {object} NewStream
 * @property {number}      channelId
 * @property {number|null} sourceIndex  - 省略時は null
 * @property {string}      streamedOn   - YYYY-MM-DD
 * @property {string|null} title
 * @property {string|null} url
 * @property {string}      urlKey
 * @property {number}      songCount
 * @property {string}      createdAt    - ISO8601 文字列 (clock.now() から生成)
 */

/**
 * 歌枠更新に使うパーシャル DTO (update メソッド用)。
 *
 * @typedef {Partial<Pick<Stream, 'song_count' | 'source_index' | 'title' | 'url'>>} StreamPatch
 */

/**
 * 歌枠の永続化 Port interface。
 *
 * @typedef {object} StreamRepository
 * @property {(channelId: number, streamedOn: string, urlKey: string) => Promise<Stream|null>} findByChannelDateUrlKey
 *   - 根拠: admin:269-271 `SELECT * FROM streams WHERE channel_id=? AND streamed_on=? AND url_key=?`
 *   - addStream の重複チェック・既存取得に使用
 * @property {(input: NewStream) => Promise<{ id: number }>} insert
 *   - 根拠: admin:292-298 `INSERT INTO streams (...)`
 * @property {(id: number, patch: StreamPatch) => Promise<void>} update
 *   - 根拠: admin:276-284 旧 stream の song_count を更新 (デクリメント後の補正)
 * @property {(channelId: number) => Promise<Stream[]>} findAllByChannel
 *   - 根拠: admin-server (generate_static_data) で channel 別に歌枠を取得
 *   - SoT 02 §5-3 に明記
 * @property {() => Promise<Stream[]>} findAll
 *   - 根拠: data.js:225 `Promise.all([..., db.prepare('SELECT * FROM streams').all()])`
 *   - BuildDatasetUseCase が全歌枠を一括取得する
 * @property {(channelId: number) => Promise<number>} nextSourceIndex
 *   - 根拠: admin:251-254 `SELECT MAX(source_index) FROM streams WHERE channel_id=?`
 *   - 新規 stream 登録時に source_index を採番する
 */

export {};
