/**
 * @module domain/port/gateways/admin-api-gateway
 * @description AdminApiGateway Port (interface)。フロントエンド専用。
 *
 * ブラウザ (docs/js/admin.js) から `/api/admin/*` を呼び出す
 * HTTP 通信を抽象化する。Domain 層はこの interface を通じて
 * フロントの UseCase から admin API を呼び出す。
 *
 * 根拠となる既存コード:
 *   - docs/js/admin.js: 各種 fetch('/api/admin/...') 呼び出し
 *   - docs/js/admin.js:363-372 (triggerStaticData: POST /api/admin/static-data/generate)
 *   - docs/js/admin.js:336-345 (syncKeyReference: POST /api/admin/key-reference/sync-url)
 *   - docs/js/admin.js (searchSongs: GET /api/admin/songs/search?q=)
 *   - docs/js/admin.js (previewStream: POST /api/admin/preview-stream)
 *   - docs/js/admin.js (addStream: POST /api/admin/streams)
 *   - docs/js/admin.js (saveSongMetadata: POST /api/admin/songs/metadata)
 *   - SoT 20 §4 (AdminApiGateway — フロント用)
 *   - SoT 20 §3 (infra/fetch-admin-api/: フロントから /api/admin を叩く Gateway 実装)
 *
 * 実装の所在 (Phase 2B 以降):
 *   - infra/fetch-admin-api/ (fetch を使ったブラウザ向け実装)
 *
 * 注意: このインターフェースはフロントエンドの UseCase からのみ使用する。
 * サーバー側 (pages-functions / admin-server) は Repository を直接使う。
 *
 * @副作用 なし (typedef のみ)
 */

/**
 * プレビュー結果の曲情報 DTO。
 *
 * @typedef {object} PreviewSong
 * @property {string}      title
 * @property {string}      artist
 * @property {string}      songKey
 * @property {'exact'|'title'|'ambiguous'|'new'} match
 */

/**
 * addStream / previewStream の入力 DTO。
 *
 * @typedef {object} StreamInput
 * @property {string} channelCode
 * @property {string} streamedOn  - YYYY-MM-DD
 * @property {string} title
 * @property {string} url
 * @property {string} songsText
 */

/**
 * フロントエンドから admin API を呼び出す Port interface。
 *
 * @typedef {object} AdminApiGateway
 * @property {(query: string) => Promise<import('../repositories/song-repository.js').Song[]>} searchSongs
 *   - 根拠: docs/js/admin.js `GET /api/admin/songs/search?q=`
 * @property {(input: StreamInput) => Promise<{ songs: PreviewSong[] }>} previewStream
 *   - 根拠: docs/js/admin.js `POST /api/admin/preview-stream`
 * @property {(input: StreamInput) => Promise<{ streamId: number, count: number }>} addStream
 *   - 根拠: docs/js/admin.js `POST /api/admin/streams`
 * @property {(songId: number, displayKey: string, genre: string) => Promise<void>} saveSongMetadata
 *   - 根拠: docs/js/admin.js `POST /api/admin/songs/metadata`
 * @property {(csvText: string) => Promise<{ updated: number }>} importKeyReferenceCsv
 *   - 根拠: docs/js/admin.js `POST /api/admin/key-reference/import-csv`
 * @property {(url: string) => Promise<{ updated: number }>} syncKeyReferenceUrl
 *   - 根拠: docs/js/admin.js `POST /api/admin/key-reference/sync-url`
 * @property {() => Promise<{ ok: boolean, owner: string, repo: string, workflow: string, ref: string, requestedAt: string }>} triggerStaticDataGeneration
 *   - 根拠: docs/js/admin.js:363-372 `POST /api/admin/static-data/generate`
 */

export {};
