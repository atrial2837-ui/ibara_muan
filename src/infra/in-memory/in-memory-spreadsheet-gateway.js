/**
 * @module infra/in-memory/in-memory-spreadsheet-gateway
 * @description SpreadsheetGateway Port の インメモリ実装。
 *
 * コンストラクタで Map<url, csvText> を受け取り、fetchCsv(url) に対して固定テキストを返す。
 * 未登録の URL は Error を throw する。
 *
 * @副作用 なし
 */

/**
 * @typedef {import('../../domain/port/gateways/spreadsheet-gateway.js').SpreadsheetGateway} SpreadsheetGateway
 */

/**
 * SpreadsheetGateway の インメモリ実装。
 *
 * @implements {SpreadsheetGateway}
 */
export class InMemorySpreadsheetGateway {
  /**
   * @param {Map<string, string>|Record<string, string>} csvMap
   *   url → csvText のマッピング。Map または plain object で指定する。
   */
  constructor(csvMap = new Map()) {
    /** @type {Map<string, string>} */
    this._map =
      csvMap instanceof Map ? new Map(csvMap) : new Map(Object.entries(csvMap));
  }

  /**
   * @param {string} url
   * @returns {Promise<string>}
   */
  async fetchCsv(url) {
    if (!this._map.has(url)) {
      throw new Error(`InMemorySpreadsheetGateway: unknown URL "${url}"`);
    }
    return /** @type {string} */ (this._map.get(url));
  }
}
