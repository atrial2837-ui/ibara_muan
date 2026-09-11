/**
 * @module domain/auto-update/timestamps
 * @description コメント本文からのタイムスタンプ検出(純粋関数)。
 *
 * Free/utawaku-scanner の src/detector/timestampDetector.ts を
 * ibara_muan の自動更新フロー用に移植したもの。ネットワーク・ファイルI/Oなし。
 * 仕様(正規表現・除外語の扱い)は移植元と同一。
 */

/** 0:00 / 12:34 / 1:23:45 を検出する */
export const TIMESTAMP_PATTERN = /\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/g;

/** "1:23:45" → 5025 のように秒へ換算する */
export function toSeconds(raw) {
  const parts = String(raw).split(':').map((p) => Number.parseInt(p, 10));
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/**
 * タイムスタンプ直後の文字列(曲名などのラベル)を取り出す。
 * 「次のタイムスタンプ」か「行末」のどちらか早い方までを範囲とする。
 */
function labelOf(text, match, nextIndex) {
  const start = match.index + match.raw.length;
  const lineEnd = text.indexOf('\n', start);
  const candidates = [nextIndex, lineEnd === -1 ? undefined : lineEnd, text.length].filter(
    (n) => n !== undefined,
  );
  return text.slice(start, Math.min(...candidates)).trim();
}

/** 本文中のタイムスタンプを出現順にすべて取り出す */
export function findTimestamps(text) {
  const pattern = new RegExp(TIMESTAMP_PATTERN.source, 'g');
  const raws = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    raws.push({ raw: m[0], index: m.index });
  }
  return raws.map((r, i) => ({
    raw: r.raw,
    seconds: toSeconds(r.raw),
    index: r.index,
    label: labelOf(text, r, raws[i + 1]?.index),
  }));
}

/** 既定の除外ラベル。歌枠セトリの区切りマーカーで、曲ではない */
export const DEFAULT_EXCLUDE_LABELS = ['Start', 'End', '声出し'];

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * ラベルが除外対象か判定する。
 * 除外語を取り除いた残りに文字・数字が無い場合だけ除外するため、
 * "Endless" や "Weekend" のような曲名を巻き込まない。
 */
export function isExcludedLabel(label, excludeLabels) {
  const hit = excludeLabels.some((word) =>
    String(label).toLowerCase().includes(String(word).toLowerCase()),
  );
  if (!hit) return false;

  let rest = String(label);
  for (const word of excludeLabels) {
    rest = rest.replace(new RegExp(escapeRegExp(word), 'gi'), '');
  }
  return !/[\p{L}\p{N}]/u.test(rest);
}

/** Start / End / 声出し などの区切りマーカーを取り除く */
export function excludeMarkerTimestamps(matches, excludeLabels) {
  if (!excludeLabels || excludeLabels.length === 0) return matches;
  return matches.filter((m) => !isExcludedLabel(m.label, excludeLabels));
}

/** 同じ時刻を指すタイムスタンプを1件に畳む(最初の出現を残す) */
export function dedupeTimestamps(matches) {
  const seen = new Set();
  return matches.filter((m) => {
    if (seen.has(m.seconds)) return false;
    seen.add(m.seconds);
    return true;
  });
}

/**
 * 1コメント分の判定を行う。
 *
 * @param {string} text コメント本文(プレーンテキスト)
 * @param {{ minimumTimestampCount: number, dedupe?: boolean, excludeLabels?: readonly string[] }} options
 * @returns {{ count: number, timestamps: object[], excluded: object[], matched: boolean }}
 */
export function detectTimestamps(text, options) {
  const found = findTimestamps(String(text ?? ''));
  const excludeLabels = options.excludeLabels ?? [];
  const kept = excludeMarkerTimestamps(found, excludeLabels);
  const timestamps = options.dedupe ? dedupeTimestamps(kept) : kept;
  const keptIds = new Set(kept.map((m) => m.index));

  return {
    count: timestamps.length,
    timestamps,
    excluded: found.filter((m) => !keptIds.has(m.index)),
    matched: timestamps.length >= options.minimumTimestampCount,
  };
}
