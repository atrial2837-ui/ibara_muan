/**
 * @module domain/analytics/data-quality
 * @description データ品質チェックの純粋関数群。
 *
 * 既存: docs/js/admin.js:123-168 (collectIssues)
 * @副作用 なし
 */

import { formatDateRaw, parseDateIso } from '../shared/date.js';

/**
 * @typedef {object} QualityIssue
 * @property {string} type
 * @property {string} place
 * @property {string} detail
 */

/**
 * @param {{ title?: string, artist?: string }} song
 * @returns {string}
 */
export function songDisplayKey(song) {
  return `${song.title || ''} / ${song.artist || ''}`;
}

/**
 * 集約データセットから品質問題を収集する。
 *
 * @param {object} data - /api/data 互換の { channels, combined }
 * @returns {QualityIssue[]}
 */
export function collectDatasetIssues(data) {
  const issues = [];
  const datasets = [
    ['new', data.channels?.new],
    ['old', data.channels?.old],
    ['combined', data.combined],
  ].filter(([, dataset]) => dataset);

  for (const [scope, dataset] of datasets) {
    for (const song of dataset.songs || []) {
      if (song.count > 0 && (!song.streamRefs || !song.streamRefs.length)) {
        issues.push({ type: '履歴未確認', place: scope, detail: songDisplayKey(song) });
      }
      if (!song.genre || song.genre === '未分類') {
        issues.push({ type: 'ジャンル未分類', place: scope, detail: songDisplayKey(song) });
      }
      if (dataset.stats?.keyPublished && !song.displayKey) {
        issues.push({ type: 'キー未登録', place: scope, detail: songDisplayKey(song) });
      }
    }
    for (const stream of dataset.streams || []) {
      if (stream.songCount && stream.songs && stream.songCount !== stream.songs.length) {
        issues.push({
          type: '曲数不一致',
          place: `${scope} 第${stream.index}枠`,
          detail: `${formatDateRaw(parseDateIso(stream.date))}: 表示${stream.songs.length} / 記録${stream.songCount}`,
        });
      }
      const seen = new Map();
      for (const song of stream.songs || []) {
        const key = song.key || songDisplayKey(song);
        seen.set(key, (seen.get(key) || 0) + 1);
      }
      for (const [key, count] of seen.entries()) {
        if (count > 1) {
          issues.push({
            type: '同一枠内重複',
            place: `${scope} 第${stream.index}枠`,
            detail: `${key} x${count}`,
          });
        }
      }
    }
  }
  return issues;
}

/**
 * API 応答時間と更新日から同期状態を評価する。
 *
 * @param {object} params
 * @param {number} params.elapsedMs
 * @param {string|Date|null|undefined} params.updateDate
 * @param {Date|string} params.now
 * @param {{ slowMs?: number, freshDays?: number }} [thresholds]
 * @returns {{ ok: boolean, ageDays: number|null }}
 */
export function evaluateSyncHealth(params, thresholds = {}) {
  const slowMs = thresholds.slowMs ?? 3000;
  const freshDays = thresholds.freshDays ?? 3;
  const update = parseDateIso(params.updateDate);
  const now = params.now instanceof Date ? params.now : parseDateIso(params.now);
  const ageDays = update && now ? Math.floor((now - update) / 86400000) : null;
  const ok = params.elapsedMs < slowMs && (ageDays == null || ageDays <= freshDays);
  return { ok, ageDays };
}

/**
 * 品質問題からサマリーを集計する。
 *
 * @param {QualityIssue[]} issues
 * @returns {Map<string, number>}
 */
export function summarizeIssueTypes(issues) {
  const summary = new Map();
  for (const issue of issues) {
    summary.set(issue.type, (summary.get(issue.type) || 0) + 1);
  }
  return summary;
}
