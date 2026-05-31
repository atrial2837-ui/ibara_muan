import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  inferSeasonTags,
  inferMoodTags,
  singerTags,
  trendLabel,
} from '../../../src/domain/analytics/tagging.js';

describe('tagging', () => {
  it('inferSeasonTags: 夏キーワード', () => {
    const tags = inferSeasonTags({ title: '青と夏', artist: 'test' });
    assert.ok(tags.includes('夏'));
  });

  it('singerTags: 定番', () => {
    assert.ok(singerTags({ count: 10 }).includes('定番'));
  });

  it('trendLabel: 履歴未確認', () => {
    assert.equal(trendLabel({}), '履歴未確認');
  });

  it('trendLabel: 最近', () => {
    assert.equal(trendLabel({ lastSung: '2026-05-01', daysSinceLast: 10, count: 3 }), '最近');
  });
});
