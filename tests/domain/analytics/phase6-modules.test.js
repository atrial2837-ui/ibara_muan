import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { collectDatasetIssues, evaluateSyncHealth } from '../../../src/domain/analytics/data-quality.js';
import { setlistBalance } from '../../../src/domain/setlist/setlist-analysis.js';
import { computeComebacks } from '../../../src/domain/analytics/comeback.js';
import { countStreamsThisMonth, heatLevel } from '../../../src/domain/analytics/dashboard.js';

describe('data-quality', () => {
  it('collectDatasetIssues: ジャンル未分類', () => {
    const issues = collectDatasetIssues({
      combined: {
        stats: { keyPublished: false },
        songs: [{ title: 'A', artist: 'B', count: 1, genre: '未分類', streamRefs: [{}] }],
        streams: [],
      },
    });
    assert.ok(issues.some((i) => i.type === 'ジャンル未分類'));
  });

  it('evaluateSyncHealth', () => {
    const result = evaluateSyncHealth({
      elapsedMs: 100,
      updateDate: '2026-05-22',
      now: new Date('2026-05-24'),
    });
    assert.equal(result.ok, true);
    assert.equal(result.ageDays, 2);
  });
});

describe('setlistBalance', () => {
  it('ジャンル集計', () => {
    const balance = setlistBalance([
      { genre: 'J-POP', moodTags: ['しっとり'], displayKey: '+1', daysSinceLast: 200 },
      { genre: 'J-POP', moodTags: ['かわいい'], displayKey: '', daysSinceLast: 10 },
    ]);
    assert.equal(balance.genres[0][0], 'J-POP');
    assert.equal(balance.keys, 1);
    assert.equal(balance.stale, 1);
  });
});

describe('computeComebacks', () => {
  it('最大ギャップを返す', () => {
    const result = computeComebacks([
      { title: 'A', dates: ['2024-01-01', '2024-06-01', '2025-01-01'] },
    ]);
    assert.equal(result.length, 1);
    assert.ok(result[0].maxGap >= 180);
  });
});

describe('dashboard', () => {
  it('heatLevel', () => {
    assert.equal(heatLevel(0), '');
    assert.equal(heatLevel(10), 'l2');
  });

  it('countStreamsThisMonth', () => {
    const today = new Date('2026-05-24');
    const count = countStreamsThisMonth([
      { monthKey: '2026-05', songs: [] },
      { monthKey: '2026-04', songs: [] },
    ], today);
    assert.equal(count, 1);
  });
});
