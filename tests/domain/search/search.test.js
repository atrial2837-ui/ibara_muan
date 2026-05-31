import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseQuery } from '../../../src/domain/search/query-parser.js';
import { applyFieldFilters, applyGenreFilter, filterByTextIncludes } from '../../../src/domain/search/filter.js';
import { sortSongs } from '../../../src/domain/search/sort.js';
import { matchReasons } from '../../../src/domain/search/match.js';

const songs = [
  { title: '青と夏', artist: 'test', count: 5, genre: 'J-POP', genreText: 'J-POP', keyText: '', tagText: '', moodText: '', seasonText: '', daysSinceLast: 10, lastSung: '2026-05-01' },
  { title: 'lemon', artist: '米津玄師', count: 12, genre: 'J-POP', genreText: 'J-POP', keyText: '+2', tagText: '', moodText: 'しっとり', seasonText: '', daysSinceLast: 200, lastSung: '2025-10-01' },
];

describe('search domain', () => {
  it('parseQuery: field filter', () => {
    const q = parseQuery('title:青 count:>3');
    assert.equal(q.filters.length, 2);
    assert.deepEqual(q.tokens, []);
  });

  it('applyFieldFilters: count', () => {
    const result = applyFieldFilters(songs, [{ key: 'count', op: '>', val: '10' }]);
    assert.equal(result.length, 1);
    assert.equal(result[0].title, 'lemon');
  });

  it('applyGenreFilter', () => {
    assert.equal(applyGenreFilter(songs, 'J-POP').length, 2);
    assert.equal(applyGenreFilter(songs, 'all').length, 2);
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
});
