/**
 * @module infra/in-memory/fake-clock
 * @description Clock Port の テスト用フェイク実装。
 *
 * コンストラクタで初期 Date を受け取り、advance(ms) で時刻を進める。
 * 副作用なし — 内部に Date オブジェクトを保持するだけ。
 *
 * @副作用 なし
 */

/**
 * テスト用の固定時刻 Clock 実装。
 *
 * @implements {import('../../domain/port/clock.js').Clock}
 */
export class FakeClock {
  /**
   * @param {Date} [initial] - 初期時刻。省略時は 2026-01-01T00:00:00.000Z。
   */
  constructor(initial = new Date('2026-01-01T00:00:00.000Z')) {
    /** @type {Date} */
    this._current = new Date(initial.getTime());
  }

  /**
   * 現在時刻を返す。
   *
   * @returns {Date}
   */
  now() {
    return new Date(this._current.getTime());
  }

  /**
   * 内部時刻を ms ミリ秒進める。
   *
   * @param {number} ms - 進めるミリ秒数 (負値で巻き戻しも可)
   * @returns {this}
   */
  advance(ms) {
    this._current = new Date(this._current.getTime() + ms);
    return this;
  }

  /**
   * 内部時刻を任意の Date に設定する。
   *
   * @param {Date} date
   * @returns {this}
   */
  set(date) {
    this._current = new Date(date.getTime());
    return this;
  }
}
