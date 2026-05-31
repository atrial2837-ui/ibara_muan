/**
 * @module infra/admin-api/fetch-admin-api-gateway
 * @description fetch を使った AdminApiGateway のフロント向け実装。
 *
 * ブラウザ (docs/js/admin.js) から `/api/admin/*` を呼び出す HTTP 通信を抽象化する。
 */

/**
 * fetch を使用して Admin API を呼び出す Gateway (フロント用)。
 *
 * @implements {import('../../domain/port/gateways/admin-api-gateway.js').AdminApiGateway}
 */
export class FetchAdminApiGateway {
  /**
   * @param {{
   *   baseUrl?: string,
   *   tokenProvider?: () => string | null,
   *   fetchImpl?: typeof fetch
   * }} [options={}]
   */
  constructor({ baseUrl = '', tokenProvider = () => null, fetchImpl = fetch } = {}) {
    this.baseUrl = baseUrl;
    this.tokenProvider = tokenProvider;
    this.fetch = fetchImpl;
  }

  /**
   * Admin API に HTTP リクエストを送信する (内部メソッド)。
   *
   * @private
   * @param {string} path - API パス (例: '/songs/search')
   * @param {unknown} [body] - リクエストボディ (undefined なら GET)
   * @returns {Promise<unknown>} レスポンス JSON
   * @throws {Error} HTTP 非 2xx の場合
   */
  async request(path, body) {
    const headers = { 'content-type': 'application/json' };
    const token = this.tokenProvider();
    if (token) {
      headers['x-admin-token'] = token;
    }

    const response = await this.fetch(`${this.baseUrl}/api/admin${path}`, {
      method: body == null ? 'GET' : 'POST',
      headers,
      body: body == null ? undefined : JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Admin API ${path} failed: HTTP ${response.status}`);
    }
    return data;
  }

  /**
   * 曲を検索する。
   *
   * 根拠: docs/js/admin.js `GET /api/admin/songs/search?q=`
   *
   * @param {string} query - 検索クエリ
   * @returns {Promise<import('../../domain/port/gateways/admin-api-gateway.js').Song[]>}
   */
  async searchSongs(query) {
    const headers = { 'content-type': 'application/json' };
    const token = this.tokenProvider();
    if (token) {
      headers['x-admin-token'] = token;
    }
    const response = await this.fetch(`${this.baseUrl}/api/admin/songs/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Admin API search failed: HTTP ${response.status}`);
    }
    return data.songs || [];
  }

  /**
   * ストリーム追加をプレビューする。
   *
   * 根拠: docs/js/admin.js `POST /api/admin/preview-stream`
   *
   * @param {import('../../domain/port/gateways/admin-api-gateway.js').StreamInput} input
   * @returns {Promise<{ songs: import('../../domain/port/gateways/admin-api-gateway.js').PreviewSong[] }>}
   */
  async previewStream(input) {
    return await this.request('/preview-stream', input);
  }

  /**
   * ストリームを追加する。
   *
   * 根拠: docs/js/admin.js `POST /api/admin/streams`
   *
   * @param {import('../../domain/port/gateways/admin-api-gateway.js').StreamInput} input
   * @returns {Promise<{ streamId: number, count: number }>}
   */
  async addStream(input) {
    return await this.request('/streams', input);
  }

  /**
   * 曲のメタデータを保存する。
   *
   * 根拠: docs/js/admin.js `POST /api/admin/songs/metadata`
   *
   * @param {number} songId
   * @param {string} displayKey
   * @param {string} genre
   * @returns {Promise<void>}
   */
  async saveSongMetadata(songId, displayKey, genre) {
    await this.request('/songs/metadata', { songId, displayKey, genre });
  }

  /**
   * キー参照情報を CSV テキストからインポートする。
   *
   * 根拠: docs/js/admin.js `POST /api/admin/key-reference/import-csv`
   *
   * @param {string} csvText
   * @returns {Promise<{ updated: number }>}
   */
  async importKeyReferenceCsv(csvText) {
    return await this.request('/key-reference/import-csv', { csvText });
  }

  /**
   * キー参照情報を URL から同期する。
   *
   * 根拠: docs/js/admin.js `POST /api/admin/key-reference/sync-url`
   *
   * @param {string} url
   * @returns {Promise<{ updated: number }>}
   */
  async syncKeyReferenceUrl(url) {
    return await this.request('/key-reference/sync-url', { url });
  }

  /**
   * 静的データジェネレーションワークフローをトリガーする。
   *
   * 根拠: docs/js/admin.js `POST /api/admin/static-data/generate`
   *
   * @returns {Promise<{
   *   ok: boolean,
   *   owner: string,
   *   repo: string,
   *   workflow: string,
   *   ref: string,
   *   requestedAt: string
   * }>}
   */
  async triggerStaticDataGeneration() {
    return await this.request('/static-data/generate', {});
  }
}
