/**
 * @module infra/in-memory/in-memory-setlist-store
 * @description SetlistStore Port の インメモリ実装。
 *
 * Map ベースの単純実装 (key は固定値 'default')。
 * テスト・開発時の依存性注入に使用する。
 *
 * @副作用 なし (インスタンス内 Map への書き込みのみ)
 */

/**
 * @typedef {import('../../domain/port/gateways/setlist-store.js').Setlist} Setlist
 * @typedef {import('../../domain/port/gateways/setlist-store.js').SetlistStore} SetlistStore
 */

const STORE_KEY = 'default';

/**
 * SetlistStore の インメモリ実装。
 *
 * @implements {SetlistStore}
 */
export class InMemorySetlistStore {
  constructor() {
    /** @type {Map<string, Setlist>} */
    this._map = new Map();
  }

  /**
   * @returns {Setlist|null}
   */
  load() {
    return this._map.has(STORE_KEY)
      ? { .../** @type {Setlist} */ (this._map.get(STORE_KEY)), songKeys: [.../** @type {Setlist} */ (this._map.get(STORE_KEY)).songKeys] }
      : null;
  }

  /**
   * @param {Setlist} value
   * @returns {void}
   */
  save(value) {
    this._map.set(STORE_KEY, { songKeys: [...value.songKeys] });
  }

  /**
   * @returns {void}
   */
  clear() {
    this._map.delete(STORE_KEY);
  }
}
