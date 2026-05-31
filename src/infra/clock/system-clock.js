/**
 * @module infra/clock/system-clock
 * @description 本番用 Clock 実装。システムの現在時刻を返す。
 */

/**
 * システム時刻を返す Clock 実装。
 *
 * @implements {import('../../domain/port/clock.js').Clock}
 */
export class SystemClock {
  /**
   * 現在時刻を返す。
   *
   * @returns {Date} 現在時刻の Date インスタンス
   */
  now() {
    return new Date();
  }
}
