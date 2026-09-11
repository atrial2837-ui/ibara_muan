/**
 * @module domain/auto-update/classify
 * @description YouTube自動更新の信頼度ゲート(純粋関数)。
 *
 * 方針:
 * - 枠情報(タイトル・配信日・URL)はRSS/API由来の事実なので常に自動登録してよい
 * - セトリ(コメント欄のタイムスタンプ)は精度で gating する
 *   - 高信頼 → 自動でD1投入(管理画面から後で修正可能)
 *   - 低信頼 → 手動承認キュー(review)に入れ、D1には触れない
 *   - 取得不可 → スキップ
 */

import { DEFAULT_EXCLUDE_LABELS } from './timestamps.js';

/** 対象タイトルの既定フィルタ(@ibaramuan の歌枠のみ) */
export const DEFAULT_TITLE_FILTER = '歌枠';

/** セトリ自動採用に必要なタイムスタンプ数の既定値 */
export const DEFAULT_AUTO_MIN_TIMESTAMPS = 8;

/** 自動採用してよい同時候補数の上限 */
export const DEFAULT_AUTO_MAX_MATCHES = 2;

/**
 * タイトルが取り込み対象(歌枠)か判定する。
 *
 * @param {string} title 動画タイトル
 * @param {string} [filter] 含まれるべき語(既定: '歌枠')
 * @returns {boolean}
 */
export function isUtawakuTitle(title, filter = DEFAULT_TITLE_FILTER) {
  return String(title ?? '').includes(filter);
}

/**
 * watch URL から11文字の動画IDを取り出す。取れなければ null。
 *
 * @param {string} url
 * @returns {string|null}
 */
export function extractVideoId(url) {
  const m = String(url ?? '').match(/[A-Za-z0-9_-]{11}/);
  return m ? m[0] : null;
}

/**
 * YouTubeの publishedAt(UTC) を JST の配信日 YYYY-MM-DD に変換する。
 *
 * @param {string} publishedAt ISO8601文字列
 * @returns {string} YYYY-MM-DD。パース不可なら ''
 */
export function toStreamedOn(publishedAt) {
  const t = Date.parse(String(publishedAt ?? ''));
  if (Number.isNaN(t)) return '';
  const jst = new Date(t + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/**
 * scanner/scan_utawaku の timestamps から addStream 用の songsText を作る。
 * 空ラベルは曲にならないので落とす。先頭の「01. 」のような連番も冗長なので落とす。
 *
 * @param {Array<{ label?: string }>} timestamps
 * @returns {{ text: string, lines: number, skipped: number }}
 */
export function buildSongsText(timestamps) {
  const list = Array.isArray(timestamps) ? timestamps : [];
  let skipped = 0;
  const lines = [];
  for (const ts of list) {
    const label = String(ts?.label ?? '')
      .trim()
      .replace(/^\d{1,3}\.\s*/, '');
    if (!label) {
      skipped += 1;
      continue;
    }
    lines.push(label);
  }
  return { text: lines.join('\n'), lines: lines.length, skipped };
}

/**
 * スキャン1件を分類する。
 *
 * @param {object} entry scan_utawaku/utawaku-scanner 形式の1件
 * @param {string} entry.status 'found'|'not_found'|'comments_disabled'|'video_unavailable'|'error'
 * @param {number} [entry.timestampCount]
 * @param {Array} [entry.matches]
 * @param {Array} [entry.timestamps]
 * @param {{ minTimestamps?: number, maxMatches?: number }} [options]
 * @returns {{
 *   setlistVerdict: 'auto'|'review'|'none',
 *   reason: string,
 *   songsText: string,
 *   songLines: number,
 *   frameOnly: boolean
 * }}
 */
export function classifyScanEntry(entry, options = {}) {
  const minTimestamps = options.minTimestamps ?? DEFAULT_AUTO_MIN_TIMESTAMPS;
  const maxMatches = options.maxMatches ?? DEFAULT_AUTO_MAX_MATCHES;
  const status = entry?.status ?? 'error';
  const empty = { songsText: '', songLines: 0 };

  if (status === 'video_unavailable' || status === 'error') {
    return { setlistVerdict: 'none', reason: status, frameOnly: false, ...empty };
  }
  if (status === 'comments_disabled') {
    return { setlistVerdict: 'review', reason: 'comments_disabled', frameOnly: true, ...empty };
  }
  if (status === 'not_found') {
    return { setlistVerdict: 'review', reason: 'no_timestamp_comment', frameOnly: true, ...empty };
  }
  if (status !== 'found') {
    return { setlistVerdict: 'none', reason: `unknown_status:${status}`, frameOnly: false, ...empty };
  }

  const built = buildSongsText(entry.timestamps);
  if (built.lines === 0) {
    return { setlistVerdict: 'review', reason: 'empty_labels', frameOnly: true, ...empty };
  }

  const timestampCount = Number(entry.timestampCount ?? built.lines);
  const matchCount = Array.isArray(entry.matches) ? entry.matches.length : 1;

  if (timestampCount < minTimestamps) {
    return {
      setlistVerdict: 'review',
      reason: `below_threshold:${timestampCount}<${minTimestamps}`,
      frameOnly: true,
      songsText: built.text,
      songLines: built.lines,
    };
  }
  if (matchCount > maxMatches) {
    return {
      setlistVerdict: 'review',
      reason: `multiple_candidates:${matchCount}`,
      frameOnly: true,
      songsText: built.text,
      songLines: built.lines,
    };
  }
  return {
    setlistVerdict: 'auto',
    reason: `high_confidence:${timestampCount}`,
    frameOnly: false,
    songsText: built.text,
    songLines: built.lines,
  };
}

/** 除外語リスト(再エクスポート: CLI側の既定値用) */
export { DEFAULT_EXCLUDE_LABELS };
