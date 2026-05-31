/**
 * @module domain/port/repositories/song-channel-stats-repository
 * @description SongChannelStatsRepository Port (interface) および関連 DTO 型定義。
 *
 * 根拠となる既存コード:
 *   - SoT 02 §5-5 (SongChannelStatsRepository 候補)
 *   - functions/api/admin/[[path]].js:309-315 (upsertIncrement: INSERT OR REPLACE INTO song_channel_stats)
 *   - functions/api/admin/[[path]].js:279-283 (decrementBySongIds: UPDATE SET sing_count = MAX(0, sing_count-1) WHERE song_id IN (?))
 *   - functions/api/data.js:225 (findAll / findByChannelId: SELECT * FROM song_channel_stats)
 *
 * SoT 02 §5-5 案からの変更:
 *   なし (案をそのまま採用。upsertIncrement と decrementBySongIds の両方が必要な点は
 *   SoT 02 §5 の課題例にも明記済み)
 *
 * sing_count の不変条件:
 *   `sing_count >= 0` — デクリメント時は `CASE WHEN sing_count > 0 THEN sing_count - 1 ELSE 0 END`
 *   (admin:280-283 より)
 *
 * @副作用 なし (typedef のみ)
 */

/**
 * song_channel_stats テーブルの行。
 *
 * @typedef {object} SongChannelStat
 * @property {number}      song_id
 * @property {number}      channel_id
 * @property {number}      sing_count    - 0 以上
 * @property {number|null} source_index  - スプレッドシートの行番号
 * @property {string}      created_at    - ISO8601 文字列
 * @property {string}      updated_at    - ISO8601 文字列
 */

/**
 * 曲チャンネル別統計の永続化 Port interface。
 *
 * @typedef {object} SongChannelStatsRepository
 * @property {(songId: number, channelId: number, updatedAt: string) => Promise<void>} upsertIncrement
 *   - 根拠: admin:309-315 `INSERT INTO song_channel_stats ... ON CONFLICT(song_id, channel_id) DO UPDATE SET sing_count = sing_count + 1`
 *   - addStream のセトリ 1 行ごとに呼び出し
 *   - updatedAt は clock.now() から生成した ISO8601 文字列
 * @property {(songIds: number[], channelId: number, updatedAt: string) => Promise<void>} decrementBySongIds
 *   - 根拠: admin:279-283 `UPDATE song_channel_stats SET sing_count = MAX(0, sing_count-1) WHERE song_id IN (?) AND channel_id = ?`
 *   - addStream の上書き時に旧セトリの統計を巻き戻す
 *   - updatedAt は clock.now() から生成した ISO8601 文字列
 * @property {(channelId: number) => Promise<SongChannelStat[]>} findByChannelId
 *   - 根拠: data.js:83 `statsBySong = new Map(...filter(s => s.channel_id === channel.id)...)`
 *   - BuildDatasetUseCase がチャンネル別統計を取得する際に使用
 * @property {() => Promise<SongChannelStat[]>} findAll
 *   - 根拠: data.js:225 `Promise.all([..., db.prepare('SELECT * FROM song_channel_stats').all()])`
 *   - 全チャンネルまとめて一括取得 (mergeChannels 用)
 */

export {};
