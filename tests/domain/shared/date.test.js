/**
 * @file tests/domain/shared/date.test.js
 * @description shared/date モジュールの単体テスト (Node built-in test runner)
 *
 * 実行方法: node --test tests/domain/shared/date.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateIso,
  monthKey,
  daysSince,
  dayOfWeek,
  formatDateRaw,
  formatMonth,
  daysClass,
  todayIso,
} from '../../../src/domain/shared/date.js';

// ─── parseDateIso ─────────────────────────────────────────────────────────────

test('parseDateIso: YYYY-MM-DD 形式を Date に変換する', () => {
  const result = parseDateIso('2026-05-24');
  assert.ok(result instanceof Date);
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 4); // 0-indexed
  assert.equal(result.getDate(), 24);
  assert.equal(result.getHours(), 0);
  assert.equal(result.getMinutes(), 0);
});

test('parseDateIso: YYYY/MM/DD 形式を Date に変換する', () => {
  const result = parseDateIso('2026/05/24');
  assert.ok(result instanceof Date);
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 4);
  assert.equal(result.getDate(), 24);
});

test('parseDateIso: 1桁月日 (YYYY/M/D) を受け付ける', () => {
  const result = parseDateIso('2026/1/3');
  assert.ok(result instanceof Date);
  assert.equal(result.getMonth(), 0);
  assert.equal(result.getDate(), 3);
});

test('parseDateIso: 不正な文字列は null を返す', () => {
  assert.equal(parseDateIso('not-a-date'), null);
  // 注意: new Date(year, month-1, day) は月のオーバーフローを繰り越すため
  // '2026-13-01' は null にならず 2027-01-01 になる (JavaScript の仕様)。
  // 完全なバリデーションは呼び出し元が行う想定。
  assert.equal(parseDateIso('abc/def/ghi'), null);
});

test('parseDateIso: 空文字は null を返す', () => {
  assert.equal(parseDateIso(''), null);
});

test('parseDateIso: null は null を返す', () => {
  assert.equal(parseDateIso(null), null);
});

test('parseDateIso: undefined は null を返す', () => {
  assert.equal(parseDateIso(undefined), null);
});

test('parseDateIso: Date オブジェクトは時刻ゼロにして返す', () => {
  const input = new Date(2026, 4, 24, 15, 30, 0);
  const result = parseDateIso(input);
  assert.ok(result instanceof Date);
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getHours(), 0);
});

test('parseDateIso: 無効な Date オブジェクトは null を返す', () => {
  assert.equal(parseDateIso(new Date('invalid')), null);
});

// ─── monthKey ─────────────────────────────────────────────────────────────────

test('monthKey: YYYY-MM-DD 文字列から YYYY-MM を返す', () => {
  assert.equal(monthKey('2026-05-24'), '2026-05');
});

test('monthKey: YYYY/MM/DD 文字列の先頭7文字を返す', () => {
  // 文字列はスライス方式なので YYYY/MM になる
  assert.equal(monthKey('2026/05/24'), '2026/05');
});

test('monthKey: Date オブジェクトから YYYY-MM を返す', () => {
  const d = new Date(2026, 4, 24); // 2026-05-24
  assert.equal(monthKey(d), '2026-05');
});

test('monthKey: Date で月が1桁のときゼロパディングする', () => {
  const d = new Date(2026, 0, 1); // 2026-01-01
  assert.equal(monthKey(d), '2026-01');
});

test('monthKey: null は空文字列を返す', () => {
  assert.equal(monthKey(null), '');
});

test('monthKey: undefined は空文字列を返す', () => {
  assert.equal(monthKey(undefined), '');
});

test('monthKey: 空文字は空文字列を返す', () => {
  assert.equal(monthKey(''), '');
});

test('monthKey: 不正な Date オブジェクトは空文字列を返す', () => {
  assert.equal(monthKey(new Date('invalid')), '');
});

// ─── daysSince ────────────────────────────────────────────────────────────────

test('daysSince: 同日は 0 を返す', () => {
  assert.equal(daysSince('2026-05-24', '2026-05-24'), 0);
});

test('daysSince: 1日前は 1 を返す', () => {
  assert.equal(daysSince('2026-05-23', '2026-05-24'), 1);
});

test('daysSince: 30日前は 30 を返す', () => {
  assert.equal(daysSince('2026-04-24', '2026-05-24'), 30);
});

test('daysSince: 未来日は負の値を返す', () => {
  const result = daysSince('2026-05-25', '2026-05-24');
  assert.equal(result, -1);
});

test('daysSince: null は null を返す', () => {
  assert.equal(daysSince(null, '2026-05-24'), null);
});

test('daysSince: 空文字は null を返す', () => {
  assert.equal(daysSince('', '2026-05-24'), null);
});

test('daysSince: Date オブジェクト同士でも動作する', () => {
  const date = new Date(2026, 4, 1); // 2026-05-01
  const today = new Date(2026, 4, 24); // 2026-05-24
  assert.equal(daysSince(date, today), 23);
});

test('daysSince: 不正な日付文字列は null を返す', () => {
  assert.equal(daysSince('invalid', '2026-05-24'), null);
});

// ─── dayOfWeek ────────────────────────────────────────────────────────────────

test('dayOfWeek: 2026-01-01 は木曜日 (4)', () => {
  // 2026年1月1日は木曜日
  assert.equal(dayOfWeek('2026-01-01'), 4);
});

test('dayOfWeek: 2026-05-24 は日曜日 (0)', () => {
  // 2026年5月24日は日曜日
  assert.equal(dayOfWeek('2026-05-24'), 0);
});

test('dayOfWeek: 2026-05-25 は月曜日 (1)', () => {
  assert.equal(dayOfWeek('2026-05-25'), 1);
});

test('dayOfWeek: Date オブジェクトでも動作する', () => {
  const d = new Date(2026, 0, 1); // 2026-01-01
  assert.equal(dayOfWeek(d), 4);
});

test('dayOfWeek: null は null を返す', () => {
  assert.equal(dayOfWeek(null), null);
});

test('dayOfWeek: 不正な文字列は null を返す', () => {
  assert.equal(dayOfWeek('invalid'), null);
});

// ─── formatDateRaw ────────────────────────────────────────────────────────────

test('formatDateRaw: YYYY-MM-DD → YYYY/MM/DD に変換する', () => {
  assert.equal(formatDateRaw('2026-05-24'), '2026/05/24');
});

test('formatDateRaw: YYYY/MM/DD → YYYY/MM/DD をそのまま返す', () => {
  assert.equal(formatDateRaw('2026/05/24'), '2026/05/24');
});

test('formatDateRaw: Date オブジェクトを YYYY/MM/DD に変換する', () => {
  const d = new Date(2026, 4, 24); // 2026-05-24
  assert.equal(formatDateRaw(d), '2026/05/24');
});

test('formatDateRaw: 月が1桁のときゼロパディングする', () => {
  const d = new Date(2026, 0, 3); // 2026-01-03
  assert.equal(formatDateRaw(d), '2026/01/03');
});

test('formatDateRaw: null は "—" を返す', () => {
  assert.equal(formatDateRaw(null), '—');
});

test('formatDateRaw: 空文字は "—" を返す', () => {
  assert.equal(formatDateRaw(''), '—');
});

test('formatDateRaw: 不正な文字列は "—" を返す', () => {
  assert.equal(formatDateRaw('invalid'), '—');
});

// ─── formatMonth ──────────────────────────────────────────────────────────────

test('formatMonth: YYYY-MM-DD → YYYY/MM を返す', () => {
  assert.equal(formatMonth('2026-05-24'), '2026/05');
});

test('formatMonth: Date オブジェクトを YYYY/MM に変換する', () => {
  const d = new Date(2026, 4, 24); // 2026-05-24
  assert.equal(formatMonth(d), '2026/05');
});

test('formatMonth: 月が1桁のときゼロパディングする', () => {
  const d = new Date(2026, 0, 1); // 2026-01-01
  assert.equal(formatMonth(d), '2026/01');
});

test('formatMonth: null は "—" を返す', () => {
  assert.equal(formatMonth(null), '—');
});

test('formatMonth: 不正な文字列は "—" を返す', () => {
  assert.equal(formatMonth('invalid'), '—');
});

// ─── daysClass ────────────────────────────────────────────────────────────────

test('daysClass: null は "never" を返す', () => {
  assert.equal(daysClass(null), 'never');
});

test('daysClass: undefined は "never" を返す', () => {
  assert.equal(daysClass(undefined), 'never');
});

test('daysClass: 0 は "fresh" を返す (境界値)', () => {
  assert.equal(daysClass(0), 'fresh');
});

test('daysClass: 30 は "fresh" を返す (境界値)', () => {
  assert.equal(daysClass(30), 'fresh');
});

test('daysClass: 31 は "" を返す (fresh 超過)', () => {
  assert.equal(daysClass(31), '');
});

test('daysClass: 179 は "" を返す (stale 未満)', () => {
  assert.equal(daysClass(179), '');
});

test('daysClass: 180 は "stale" を返す (境界値)', () => {
  assert.equal(daysClass(180), 'stale');
});

test('daysClass: 365 は "stale" を返す', () => {
  assert.equal(daysClass(365), 'stale');
});

test('daysClass: 負の値 (未来) は "fresh" を返す', () => {
  // -1 <= 30 なので 'fresh'
  assert.equal(daysClass(-1), 'fresh');
});

// ─── todayIso ─────────────────────────────────────────────────────────────────

test('todayIso: fixed Date を toISOString() と同等の文字列に変換する', () => {
  const now = new Date('2026-05-24T12:34:56.789Z');
  assert.equal(todayIso(now), '2026-05-24T12:34:56.789Z');
});

test('todayIso: エポック基準の Date を正しく変換する', () => {
  const now = new Date(0);
  assert.equal(todayIso(now), '1970-01-01T00:00:00.000Z');
});

test('todayIso: 引数と Date#toISOString() の結果が一致する', () => {
  const now = new Date(2026, 4, 24, 0, 0, 0, 0);
  assert.equal(todayIso(now), now.toISOString());
});
