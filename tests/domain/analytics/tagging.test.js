import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  inferSeasonTags,
  inferMoodTags,
  singerTags,
  trendLabel,
  inferGenreTags,
  inferStatsTags,
  inferCompoundTags,
  inferAllTags,
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

  it('inferMoodTags: chill', () => {
    const tags = inferMoodTags({ title: 'チルいカフェ', artist: 'Lofi Artist', genre: 'J-POP' });
    assert.ok(tags.includes('chill'));
  });

  it('inferMoodTags: 激しい', () => {
    const tags = inferMoodTags({ title: '激ロック', artist: 'Metal Band', genre: 'アニソン' });
    assert.ok(tags.includes('激しい'));
  });

  it('inferMoodTags: ノスタルジック', () => {
    const tags = inferMoodTags({ title: 'あの日の青春', artist: 'Nostalgic', genre: 'J-POP' });
    assert.ok(tags.includes('ノスタルジック'));
  });

  it('inferMoodTags: エモい', () => {
    const tags = inferMoodTags({ title: '夕焼けの別れ', artist: 'Emo Artist', genre: 'J-POP' });
    assert.ok(tags.includes('エモい'));
  });

  it('inferMoodTags: 和風', () => {
    const tags = inferMoodTags({ title: '桜の花', artist: '和風 Artist', genre: 'J-POP' });
    assert.ok(tags.includes('和風'));
  });

  it('inferMoodTags: アコースティック', () => {
    const tags = inferMoodTags({ title: 'アコースティックギター', artist: 'Acoustic', genre: 'J-POP' });
    assert.ok(tags.includes('アコースティック'));
  });

  // --- Genre-based tags ---
  it('inferGenreTags: ボカロ', () => {
    const tags = inferGenreTags({ genre: 'ボカロ' });
    assert.ok(tags.includes('ボカロ'));
  });

  it('inferGenreTags: アニソン', () => {
    const tags = inferGenreTags({ genre: 'アニソン' });
    assert.ok(tags.includes('アニソン'));
    assert.ok(tags.includes('盛り上がる'));
  });

  it('inferGenreTags: K-POP', () => {
    const tags = inferGenreTags({ genre: 'K-POP' });
    assert.ok(tags.includes('K-POP'));
    assert.ok(tags.includes('かわいい'));
  });

  it('inferGenreTags: ディズニー', () => {
    const tags = inferGenreTags({ genre: 'ディズニー' });
    assert.ok(tags.includes('ディズニー'));
    assert.ok(tags.includes('明るい'));
  });

  it('inferGenreTags: 童謡・唱歌', () => {
    const tags = inferGenreTags({ genre: '童謡・唱歌' });
    assert.ok(tags.includes('童謡'));
    assert.ok(tags.includes('ノスタルジック'));
  });

  it('inferGenreTags: アイドル', () => {
    const tags = inferGenreTags({ genre: 'アイドル' });
    assert.ok(tags.includes('アイドル'));
    assert.ok(tags.includes('盛り上がる'));
  });

  // --- Stats-based tags ---
  it('inferStatsTags: 定番 (count >= 10)', () => {
    const tags = inferStatsTags({ count: 12 });
    assert.ok(tags.includes('定番'));
  });

  it('inferStatsTags: レア (count <= 2)', () => {
    const tags = inferStatsTags({ count: 1 });
    assert.ok(tags.includes('レア'));
  });

  it('inferStatsTags: 超久しぶり (daysSinceLast >= 365)', () => {
    const tags = inferStatsTags({ daysSinceLast: 400 });
    assert.ok(tags.includes('超久しぶり'));
  });

  it('inferStatsTags: 久しぶり (daysSinceLast >= 180)', () => {
    const tags = inferStatsTags({ daysSinceLast: 200 });
    assert.ok(tags.includes('久しぶり'));
  });

  it('inferStatsTags: 最近 (daysSinceLast <= 30)', () => {
    const tags = inferStatsTags({ daysSinceLast: 10 });
    assert.ok(tags.includes('最近'));
  });

  it('inferStatsTags: キー確認済み', () => {
    const tags = inferStatsTags({ displayKey: '+2' });
    assert.ok(tags.includes('キー確認済み'));
  });

  // --- Compound tags ---
  it('inferCompoundTags: chill + 夜', () => {
    const tags = inferCompoundTags({ moodTags: ['chill'], seasonTags: ['夜'] });
    assert.ok(tags.includes('夜chill'));
  });

  it('inferCompoundTags: しっとり + 恋愛', () => {
    const tags = inferCompoundTags({ moodTags: ['しっとり'], seasonTags: ['恋愛'] });
    assert.ok(tags.includes('ラブソング'));
  });

  it('inferCompoundTags: 盛り上がる + 夏', () => {
    const tags = inferCompoundTags({ moodTags: ['盛り上がる'], seasonTags: ['夏'] });
    assert.ok(tags.includes('夏フェス'));
  });

  // --- inferAllTags integration ---
  it('inferAllTags: ボカロ曲に複数タグが付与される', () => {
    const result = inferAllTags({
      title: 'メルト',
      artist: 'ryo',
      genre: 'ボカロ',
      count: 15,
      daysSinceLast: 400,
      displayKey: '+2',
    });
    assert.ok(result.genreTags.includes('ボカロ'));
    assert.ok(result.statsTags.includes('定番'));
    assert.ok(result.statsTags.includes('超久しぶり'));
    assert.ok(result.statsTags.includes('キー確認済み'));
  });
});
