/**
 * @module infra/d1-rest/d1-rest-client
 * @description Cloudflare D1 REST API (fetch ベース) の低レベルクライアント。
 *   admin-server/server.js:191-228 の d1()/select()/selectOne()/execute() を
 *   クラスとして再実装したもの。
 *
 *   query / queryFirst / run の 3 メソッドで Repository から利用する。
 *   インターフェースは D1WorkerClient (infra/d1-worker) と揃えている。
 *
 * @typedef {import('./d1-rest-config.js').D1RestConfig} D1RestConfig
 */

export class D1RestClient {
  /** @param {D1RestConfig} config */
  constructor(config) {
    if (!config.accountId || !config.databaseId || !config.apiToken) {
      throw new Error('D1RestConfig is incomplete');
    }
    this.config = config;
  }

  /**
   * 内部: D1 REST API を fetch で叩く。
   * 根拠: admin-server/server.js:191-214 (d1 関数)
   *
   * @param {string} sql
   * @param {unknown[]} bindings
   * @returns {Promise<{ results: Record<string, unknown>[], meta: Record<string, unknown> }>}
   */
  async #raw(sql, bindings = []) {
    const { accountId, databaseId, apiToken } = this.config;
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params: bindings }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      const message =
        payload.errors?.map((item) => item.message).join('; ') ||
        JSON.stringify(payload);
      throw new Error(`D1 query failed: ${message}`);
    }
    const result = Array.isArray(payload.result) ? payload.result[0] : payload.result;
    if (result?.success === false) {
      throw new Error(`D1 SQL failed: ${JSON.stringify(result)}`);
    }
    return result || {};
  }

  /**
   * SELECT 複数行
   * 根拠: admin-server/server.js:216-219 (select 関数)
   *
   * @param {string} sql
   * @param {...unknown} bindings
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async query(sql, ...bindings) {
    const result = await this.#raw(sql, bindings);
    return result.results ?? [];
  }

  /**
   * SELECT 1 行 (なければ null)
   * 根拠: admin-server/server.js:221-223 (selectOne 関数)
   *
   * @param {string} sql
   * @param {...unknown} bindings
   * @returns {Promise<Record<string, unknown>|null>}
   */
  async queryFirst(sql, ...bindings) {
    const result = await this.#raw(sql, bindings);
    return (result.results ?? [])[0] ?? null;
  }

  /**
   * INSERT / UPDATE / DELETE (meta を返す)
   * 根拠: admin-server/server.js:225-228 (execute 関数)
   *
   * @param {string} sql
   * @param {...unknown} bindings
   * @returns {Promise<Record<string, unknown>>}
   */
  async run(sql, ...bindings) {
    const result = await this.#raw(sql, bindings);
    return result.meta ?? {};
  }
}
