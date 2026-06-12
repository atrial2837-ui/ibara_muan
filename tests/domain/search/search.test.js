import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseQuery } from '../../../src/domain/search/query-parser.js';
import { applyFieldFilters, applyGenreFilter, filterByTextIncludes } from '../../../src/domain/search/filter.js';
import { sortSongs } from '../../../src/domain/search/sort.js';
import { matchReasons } from '../../../src/domain/search/match.js';

const songs = [
  { title: '青と夏', artist: 'test', count: 5, genre: 'J-POP', genreText: 'J-POP', keyText: '', tagText: '夏 明るい', moodText: '明るい', seasonText: '夏', daysSinceLast: 10, lastSung: '2026-05-01' },
  { title: 'lemon', artist: '米津玄師', count: 12, genre: 'J-POP', genreText: 'J-POP', keyText: '+2', tagText: 'しっとり キー確認済み 定番', moodText: 'しっとり', seasonText: '', daysSinceLast: 200, lastSung: '2025-10-01' },
  { title: '少女レイ', artist: 'みきとP', count: 3, genre: 'ボカロ', genreText: 'ボカロ', keyText: '', tagText: '夏 切ない', moodText: '切ない', seasonText: '夏', daysSinceLast: 80, lastSung: '2026-03-01' },
  { title: 'メルト', artist: 'ryo', count: 9, genre: 'ボカロ', genreText: 'ボカロ', keyText: '', tagText: 'かわいい 定番', moodText: 'かわいい', seasonText: '', daysSinceLast: 5, lastSung: '2026-05-25' },
  { title: 'チルいカフェ', artist: 'Lofi Artist', count: 4, genre: 'J-POP', genreText: 'J-POP', keyText: '', tagText: 'chill', moodText: 'chill', seasonText: '', daysSinceLast: 60, lastSung: '2026-04-01' },
  { title: '激ロック', artist: 'Metal Band', count: 7, genre: 'アニソン', genreText: 'アニソン', keyText: '', tagText: '激しい', moodText: '激しい', seasonText: '', daysSinceLast: 45, lastSung: '2026-04-15' },
  { title: 'あの日の青春', artist: 'Nostalgic', count: 6, genre: 'J-POP', genreText: 'J-POP', keyText: '', tagText: 'ノスタルジック', moodText: 'ノスタルジック', seasonText: '', daysSinceLast: 90, lastSung: '2026-03-01' },
];

describe('search domain', () => {
  it('parseQuery: field filter', () => {
    const q = parseQuery('title:青 count:>3');
    assert.equal(q.filters.length, 2);
    assert.deepEqual(q.tokens, []);
  });

  it('parseQuery: natural language stale genre filter', () => {
    const q = parseQuery('最近歌っていないボカロ');
    assert.deepEqual(q.tokens, []);
    assert.deepEqual(q.filters, [
      { key: 'genre', op: ':', val: 'ボカロ' },
      { key: 'days', op: '>', val: '30' },
    ]);
  });

  it('applyFieldFilters: natural language filters can find stale vocaloid songs', () => {
    const q = parseQuery('最近歌っていないボカロ');
    const result = applyFieldFilters(songs, q.filters);
    assert.deepEqual(result.map((song) => song.title), ['少女レイ']);
  });

  it('parseQuery: natural language fresh genre filter', () => {
    const q = parseQuery('最近歌ったJ-POP');
    assert.deepEqual(q.tokens, []);
    assert.deepEqual(q.filters, [
      { key: 'genre', op: ':', val: 'J-POP' },
      { key: 'last', op: ':', val: 'fresh' },
    ]);
  });

  it('parseQuery: natural language mood and season filters', () => {
    const q = parseQuery('夏の切ないボカロ');
    assert.deepEqual(q.tokens, []);
    assert.deepEqual(q.filters, [
      { key: 'genre', op: ':', val: 'ボカロ' },
      { key: 'mood', op: ':', val: '切ない' },
      { key: 'season', op: ':', val: '夏' },
    ]);
  });

  it('applyFieldFilters: natural language facets can find songs', () => {
    const q = parseQuery('しっとりキーありJ-POP');
    const result = applyFieldFilters(songs, q.filters);
    assert.deepEqual(result.map((song) => song.title), ['lemon']);
  });

  it('applyFieldFilters: count', () => {
    const result = applyFieldFilters(songs, [{ key: 'count', op: '>', val: '10' }]);
    assert.equal(result.length, 1);
    assert.equal(result[0].title, 'lemon');
  });

  it('applyGenreFilter', () => {
    assert.equal(applyGenreFilter(songs, 'J-POP').length, 4);
    assert.equal(applyGenreFilter(songs, 'all').length, 7);
  });

  it('filterByTextIncludes', () => {
    assert.equal(filterByTextIncludes(songs, 'lemon').length, 1);
  });

  it('sortSongs: count-desc', () => {
    const sorted = sortSongs(songs, 'count-desc');
    assert.equal(sorted[0].title, 'lemon');
  });

  it('matchReasons', () => {
    const reasons = matchReasons(songs[0], '青');
    assert.ok(reasons.includes('曲名'));
  });

  it('parseQuery: natural language chill mood filter', () => {
    const q = parseQuery('chillな曲');
    assert.ok(q.filters.some(f => f.key === 'mood' && f.val === 'chill'));
  });

  it('parseQuery: natural language energetic mood filter', () => {
    const q = parseQuery('激しい曲');
    assert.ok(q.filters.some(f => f.key === 'mood' && f.val === '激しい'));
  });

  it('parseQuery: natural language nostalgic mood filter', () => {
    const q = parseQuery('ノスタルジックな曲');
    assert.ok(q.filters.some(f => f.key === 'mood' && f.val === 'ノスタルジック'));
  });

  it('parseQuery: natural language count filter', () => {
    const q = parseQuery('10回以上歌った曲');
    assert.ok(q.filters.some(f => f.key === 'count' && f.op === '>=' && f.val === '10'));
  });

  it('parseQuery: natural language 100 days filter', () => {
    const q = parseQuery('100日以上歌ってない曲');
    assert.ok(q.filters.some(f => f.key === 'days' && f.op === '>' && f.val === '100'));
  });

  it('parseQuery: natural language fresh filter', () => {
    const q = parseQuery('超最近歌った曲');
    assert.ok(q.filters.some(f => f.key === 'last' && f.val === 'fresh'));
  });

  it('parseQuery: natural language 殿堂入り filter', () => {
    const q = parseQuery('殿堂入り曲');
    assert.ok(q.filters.some(f => f.key === 'count' && f.op === '>=' && f.val === '15'));
  });

  it('parseQuery: natural language 準レア filter', () => {
    const q = parseQuery('準レア曲');
    assert.ok(q.filters.some(f => f.key === 'count' && f.op === '<=' && f.val === '3'));
  });

  it('parseQuery: natural language 定番 filter', () => {
    const q = parseQuery('定番曲');
    assert.ok(q.filters.some(f => f.key === 'tag' && f.val === '定番'));
  });

  it('parseQuery: natural language レア filter', () => {
    const q = parseQuery('レア曲');
    assert.ok(q.filters.some(f => f.key === 'tag' && f.val === 'レア'));
  });

  it('parseQuery: natural language 久しぶり filter', () => {
    const q = parseQuery('久しぶりの曲');
    assert.ok(q.filters.some(f => f.key === 'last' && f.val === 'stale'));
  });
});
