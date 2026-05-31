/**
 * @module infra/d1-worker/d1-worker-client
 * @description Cloudflare D1 Worker Binding (env.DB) の薄いラッパー。
 *   query / queryFirst / run の 3 メソッドで Repository から直接 env.DB を扱わなくて済む。
 *
 * @typedef {import('@cloudflare/workers-types').D1Database} D1Database  // 型情報用
 */

export class D1WorkerClient {
  /** @param {D1Database} db */
  constructor(db) {
    this.db = db;
  }

  /**
   * SELECT 複数行
   * @param {string} sql
   * @param {...*} bindings
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async query(sql, ...bindings) {
    const stmt = bindings.length
      ? this.db.prepare(sql).bind(...bindings)
      : this.db.prepare(sql);
    const { results } = await stmt.all();
    return results;
  }

  /**
   * SELECT 1 行 (なければ null)
   * @param {string} sql
   * @param {...*} bindings
   * @returns {Promise<Record<string, unknown>|null>}
   */
  async queryFirst(sql, ...bindings) {
    const stmt = bindings.length
      ? this.db.prepare(sql).bind(...bindings)
      : this.db.prepare(sql);
    const row = await stmt.first();
    return row ?? null;
  }

  /**
   * INSERT / UPDATE / DELETE (D1Result を返す)
   * @param {string} sql
   * @param {...*} bindings
   * @returns {Promise<import('@cloudflare/workers-types').D1Result>}
   */
  async run(sql, ...bindings) {
    const stmt = bindings.length
      ? this.db.prepare(sql).bind(...bindings)
      : this.db.prepare(sql);
    return await stmt.run();
  }
}
