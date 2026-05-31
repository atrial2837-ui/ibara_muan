/**
 * @module domain/port/repositories/channel-repository
 * @description ChannelRepository Port (interface) および関連型定義。
 *
 * 根拠となる既存コード:
 *   - SoT 02 §5-6 (ChannelRepository 候補)
 *   - functions/api/admin/[[path]].js:160-162 (findAll: SELECT * FROM channels)
 *   - functions/api/admin/[[path]].js:257-258 (findByCode: SELECT WHERE code=?)
 *   - functions/api/data.js:225 (findAll: SELECT * FROM channels — BuildDatasetUseCase)
 *
 * SoT 02 §5-6 案からの変更:
 *   なし (案をそのまま採用)
 *
 * @副作用 なし (typedef のみ)
 */

/**
 * channels テーブルの行。
 *
 * @typedef {object} Channel
 * @property {number} id
 * @property {string} code        - チャンネル識別子 (例: 'new', 'old')
 * @property {string} name        - 表示名 (例: '新ch', '旧ch')
 * @property {number} sort_order
 * @property {string} created_at  - ISO8601 文字列
 */

/**
 * チャンネルの永続化 Port interface。
 * チャンネルは管理 UI で直接 CRUD しないため read-only のみ。
 *
 * @typedef {object} ChannelRepository
 * @property {() => Promise<Channel[]>} findAll
 *   - 根拠: admin:160-162 `SELECT * FROM channels` (getChannels)
 *   - 根拠: data.js:225 BuildDatasetUseCase が全チャンネルを取得
 * @property {(code: string) => Promise<Channel|null>} findByCode
 *   - 根拠: admin:257-258 `SELECT * FROM channels WHERE code = ?`
 *   - addStream で channel_code → channel.id の解決に使用
 */

export {};
