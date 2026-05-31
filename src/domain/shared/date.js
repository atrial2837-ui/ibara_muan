/**
 * @module shared/date
 * @description 日付操作のドメイン共通ユーティリティ。
 *
 * 既存実装の所在 (Phase 2 でこれらを本モジュールへ差し替え予定):
 *   - docs/js/utils.js:12         (parseDate → parseDateIso)
 *   - docs/js/utils.js:21         (fmtDate → formatDateRaw)
 *   - docs/js/utils.js:26         (fmtMonth → formatMonth)
 *   - docs/js/utils.js:37         (monthKey)
 *   - docs/js/utils.js:40         (daysSince)
 *   - docs/js/utils.js:45         (daysClass)
 *   - functions/api/data.js:17    (monthKey)
 *   - functions/api/data.js:21    (daysSince)
 *   - admin-server/server.js:145  (todayIso)
 *   - admin-server/server.js:545  (monthKey)
 *   - admin-server/server.js:549  (daysSince)
 *   - functions/api/admin/[[path]].js:27  (todayIso)
 *   - tools/generate_static_data.mjs:17   (monthKey)
 *   - tools/generate_static_data.mjs:22   (daysSince)
 *
 * 副作用禁止: fetch / DOM / fs / process / env / new Date() / Date.now() の
 * 内部呼び出しゼロ。「現在」が必要な関数はすべて引数で受け取る。
 */

/**
 * @typedef {string} DateIso
 * YYYY-MM-DD 形式の日付文字列。
 */

// ─── parseDateIso ─────────────────────────────────────────────────────────────

/**
 * 日付文字列または Date オブジェクトを Date に変換する。
 *
 * 受け付ける形式:
 *   - 'YYYY-MM-DD' (ISO8601 形式、SoT §3-5 バリデーション正規表現)
 *   - 'YYYY/MM/DD' (旧来の日本式スラッシュ区切り、import_supabase.py:43 互換)
 *   - Date オブジェクト (そのまま返す)
 *
 * 既存 `parseDate` (utils.js:12) は YYYY/MM/DD のみ受け付け、かつ `d.setHours(0,0,0,0)` で
 * 時刻を切り捨てる。本関数もその振る舞いを再現する。
 *
 * @param {string | Date | null | undefined} text - 変換対象
 * @returns {Date | null} 成功時は時刻ゼロの Date、失敗時は null
 */
export function parseDateIso(text) {
  if (!text) return null;
  if (text instanceof Date) {
    if (Number.isNaN(text.getTime())) return null;
    const copy = new Date(text.getTime());
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
  // YYYY-MM-DD または YYYY/MM/DD を受け付ける
  const m = String(text).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  d.setHours(0, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// ─── monthKey ─────────────────────────────────────────────────────────────────

/**
 * Date または DateIso 文字列を 'YYYY-MM' 形式のキーに変換する。
 *
 * 文字列入力の場合は先頭 7 文字をスライスする (data.js:17, admin-server:545,
 * generate_static_data.mjs:17 と同一の振る舞い)。空文字・falsy の場合は '' を返す。
 *
 * Date オブジェクト入力の場合は utils.js:37 互換で計算する。
 *
 * @param {Date | DateIso | string | null | undefined} date - 変換対象
 * @returns {string} 'YYYY-MM' または ''
 */
export function monthKey(date) {
  if (!date) return '';
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  // 文字列の場合は先頭 7 文字をスライス (既存実装の最多派)
  const s = String(date).trim();
  if (!s) return '';
  return s.slice(0, 7);
}

// ─── daysSince ────────────────────────────────────────────────────────────────

/**
 * 指定日から今日 (today) までの経過日数を返す。
 *
 * 既存実装 (data.js:21, admin-server:549, generate_static_data.mjs:22) は内部で
 * `new Date()` を呼ぶ副作用を持つ。本関数は `today` を必須引数化して副作用を排除する。
 *
 * 日付文字列入力時は `${dateText}T00:00:00` でローカル時刻 midnight としてパースする
 * (既存実装と同一の振る舞い)。
 *
 * @param {Date | DateIso | string | null | undefined} date - 基準日
 * @param {Date | DateIso | string} today - 今日の日付 (引数必須)
 * @returns {number | null} 経過日数 (正: 過去, 負: 未来)、無効入力時は null
 */
export function daysSince(date, today) {
  if (!date) return null;

  /** @param {Date | DateIso | string} v */
  const toMidnight = (v) => {
    if (v instanceof Date) {
      const copy = new Date(v.getTime());
      copy.setHours(0, 0, 0, 0);
      return copy;
    }
    const s = String(v).trim();
    // YYYY-MM-DD 形式なら T00:00:00 を付けてローカル時刻としてパース (既存実装互換)
    const parsed = new Date(`${s}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const d = toMidnight(date);
  if (!d) return null;
  const t = toMidnight(today);
  if (!t) return null;

  return Math.floor((t - d) / 86400000);
}

// ─── dayOfWeek ────────────────────────────────────────────────────────────────

/**
 * Date または DateIso 文字列から曜日番号 (0=日, 1=月, ..., 6=土) を返す。
 *
 * SoT §3-5: `dayOfWeek: 0-6 (JavaScript Date.getDay())`
 *
 * @param {Date | DateIso | string | null | undefined} date - 変換対象
 * @returns {number | null} 0..6 の整数、無効入力時は null
 */
export function dayOfWeek(date) {
  if (!date) return null;
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return null;
    return date.getDay();
  }
  const s = String(date).trim();
  const parsed = new Date(`${s}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getDay();
}

// ─── formatDateRaw ────────────────────────────────────────────────────────────

/**
 * Date または DateIso 文字列を 'YYYY/MM/DD' 形式に変換する。
 *
 * 旧 `fmtDate` (utils.js:21) および `fmtApiDate` 互換。
 * 無効・falsy の場合は '—' を返す (utils.js:22 の既存振る舞い)。
 *
 * @param {Date | DateIso | string | null | undefined} date - 変換対象
 * @returns {string} 'YYYY/MM/DD' または '—'
 */
export function formatDateRaw(date) {
  if (!date) return '—';
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return '—';
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }
  const d = parseDateIso(date);
  if (!d) return '—';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// ─── formatMonth ──────────────────────────────────────────────────────────────

/**
 * Date または DateIso 文字列を月表示文字列に変換する。
 *
 * 旧 `fmtMonth` (utils.js:26) 互換。出力形式は 'YYYY/MM'。
 *
 * TODO: SoT の説明では 'YYYY年M月' 系とあるが、実際の utils.js:26-27 は
 * 'YYYY/MM' を返す。既存の振る舞いを忠実に再現する。
 *
 * @param {Date | DateIso | string | null | undefined} date - 変換対象
 * @returns {string} 'YYYY/MM' または '—'
 */
export function formatMonth(date) {
  if (!date) return '—';
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return '—';
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  const d = parseDateIso(date);
  if (!d) return '—';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── daysClass ────────────────────────────────────────────────────────────────

/**
 * daysSince の戻り値からラベルを返す。
 *
 * 閾値は utils.js:45-50 の既存実装を厳密に再現:
 *   - null       → 'never'  (一度も歌われていない)
 *   - <= 30      → 'fresh'  (30日以内)
 *   - >= 180     → 'stale'  (180日以上)
 *   - それ以外   → ''       (31〜179日)
 *
 * @param {number | null | undefined} daysSinceValue - daysSince() の戻り値
 * @returns {'never' | 'fresh' | 'stale' | ''}
 */
export function daysClass(daysSinceValue) {
  if (daysSinceValue == null) return 'never';
  if (daysSinceValue <= 30) return 'fresh';
  if (daysSinceValue >= 180) return 'stale';
  return '';
}

// ─── todayIso ─────────────────────────────────────────────────────────────────

/**
 * Date オブジェクトを ISO8601 文字列に変換する。
 *
 * 既存実装 (admin/[[path]].js:27, admin-server:145) は `new Date().toISOString()` を
 * 副作用として呼ぶ。本関数は `now` を必須引数化して副作用を排除する。
 *
 * @param {Date} now - 現在時刻 (引数必須)
 * @returns {string} ISO8601 文字列 (例: '2026-05-24T12:34:56.789Z')
 */
export function todayIso(now) {
  return now.toISOString();
}
