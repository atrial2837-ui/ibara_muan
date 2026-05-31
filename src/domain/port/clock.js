/**
 * @module domain/port/clock
 * @description 現在時刻取得の Port (interface)。
 *
 * Domain は `new Date()` / `Date.now()` を直接呼ばない原則のため、
 * UseCase は Clock を依存注入で受け取り `clock.now()` を使う。
 *
 * 実装例:
 *   - SystemClock : `{ now: () => new Date() }` (本番)
 *   - FakeClock   : `{ now: () => new Date('2026-01-01') }` (テスト)
 *
 * 根拠: SoT 02 §7-3 (`todayIso` が `new Date()` を副作用として持つ問題),
 *        SoT 20 §1 原則 2 (Domain は runtime 非依存), §4 (Clock interface)
 *
 * @副作用 なし (typedef のみ)
 */

/**
 * 現在時刻を返す Port interface。
 *
 * @typedef {object} Clock
 * @property {() => Date} now - 現在時刻を返す。副作用は呼び出し元の責任。
 */

export {};
