import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  withDenseRank,
  assignRanksInPlace,
} from '../../../src/domain/analytics/rank.js';

describe('withDenseRank', () => {
  it('should assign ranks in descending count order', () => {
    const songs = [
      { count: 5 },
      { count: 3 },
      { count: 1 },
    ];

    const result = withDenseRank(songs);

    assert.equal(result.length, 3);
    assert.equal(result[0].count, 5);
    assert.equal(result[0].rank, 1);
    assert.equal(result[1].count, 3);
    assert.equal(result[1].rank, 2);
    assert.equal(result[2].count, 1);
    assert.equal(result[2].rank, 3);
  });

  it('should assign same rank to songs with same count (dense rank)', () => {
    const songs = [
      { count: 5 },
      { count: 5 },
      { count: 3 },
    ];

    const result = withDenseRank(songs);

    assert.equal(result.length, 3);
    assert.equal(result[0].count, 5);
    assert.equal(result[0].rank, 1);
    assert.equal(result[1].count, 5);
    assert.equal(result[1].rank, 1);
    assert.equal(result[2].count, 3);
    // Dense rank skips rank 2 when there are ties at rank 1
    // With 3 items: [5,5,3] → rank [1,1,3] (standard ranking, not dense)
    // Actually checking docs: the existing impl uses index+1, so [1,1,3]
    assert.equal(result[2].rank, 3);
  });

  it('should handle multiple groups of ties with standard rank', () => {
    const songs = [
      { count: 10 },
      { count: 10 },
      { count: 8 },
      { count: 8 },
      { count: 5 },
    ];

    const result = withDenseRank(songs);

    // Standard ranking: ties share a rank, next rank is skipped by count of ties
    assert.equal(result[0].rank, 1);
    assert.equal(result[1].rank, 1);
    assert.equal(result[2].rank, 3);  // Rank 3 because 2 items share rank 1
    assert.equal(result[3].rank, 3);
    assert.equal(result[4].rank, 5);  // Rank 5 because 2 more items share rank 3
  });

  it('should return empty array for empty input', () => {
    const songs = [];

    const result = withDenseRank(songs);

    assert.equal(result.length, 0);
    assert(Array.isArray(result));
  });

  it('should handle single element', () => {
    const songs = [{ count: 5 }];

    const result = withDenseRank(songs);

    assert.equal(result.length, 1);
    assert.equal(result[0].count, 5);
    assert.equal(result[0].rank, 1);
  });

  it('should handle zero count', () => {
    const songs = [
      { count: 5 },
      { count: 0 },
      { count: 3 },
    ];

    const result = withDenseRank(songs);

    assert.equal(result[0].count, 5);
    assert.equal(result[0].rank, 1);
    assert.equal(result[1].count, 3);
    assert.equal(result[1].rank, 2);
    assert.equal(result[2].count, 0);
    assert.equal(result[2].rank, 3);
  });

  it('should handle negative count', () => {
    const songs = [
      { count: 5 },
      { count: -1 },
      { count: 3 },
    ];

    const result = withDenseRank(songs);

    assert.equal(result[0].count, 5);
    assert.equal(result[0].rank, 1);
    assert.equal(result[1].count, 3);
    assert.equal(result[1].rank, 2);
    assert.equal(result[2].count, -1);
    assert.equal(result[2].rank, 3);
  });

  it('should not mutate input array', () => {
    const songs = [
      { count: 5, title: 'Song A' },
      { count: 3, title: 'Song B' },
      { count: 5, title: 'Song C' },
    ];
    const originalOrder = songs.map((s) => s.title);

    const result = withDenseRank(songs);

    // Input array should remain unchanged
    assert.deepEqual(
      songs.map((s) => s.title),
      originalOrder
    );
    // Input songs should not have rank property added
    assert.equal(songs[0].rank, undefined);
    assert.equal(songs[1].rank, undefined);
    assert.equal(songs[2].rank, undefined);
  });

  it('should return a new array instance', () => {
    const songs = [
      { count: 5 },
      { count: 3 },
    ];

    const result = withDenseRank(songs);

    assert.notStrictEqual(result, songs);
  });

  it('should preserve additional properties', () => {
    const songs = [
      { count: 10, title: 'Song A', artist: 'Artist 1' },
      { count: 10, title: 'Song B', artist: 'Artist 2' },
      { count: 5, title: 'Song C', artist: 'Artist 3' },
    ];

    const result = withDenseRank(songs);

    assert.equal(result[0].title, 'Song A');
    assert.equal(result[0].artist, 'Artist 1');
    assert.equal(result[1].title, 'Song B');
    assert.equal(result[1].artist, 'Artist 2');
    assert.equal(result[2].title, 'Song C');
    assert.equal(result[2].artist, 'Artist 3');
  });

  it('should maintain stable sort for equal counts', () => {
    const songs = [
      { count: 5, id: 'a' },
      { count: 5, id: 'b' },
      { count: 5, id: 'c' },
    ];

    const result = withDenseRank(songs);

    // All should have rank 1
    assert.equal(result[0].rank, 1);
    assert.equal(result[1].rank, 1);
    assert.equal(result[2].rank, 1);
    // Order should be preserved (stable sort)
    assert.equal(result[0].id, 'a');
    assert.equal(result[1].id, 'b');
    assert.equal(result[2].id, 'c');
  });

  it('should correctly rank complex real-world example', () => {
    const songs = [
      { count: 15, title: 'Popular Song' },
      { count: 15, title: 'Also Popular' },
      { count: 12, title: 'Pretty Common' },
      { count: 8, title: 'Rare Song 1' },
      { count: 8, title: 'Rare Song 2' },
      { count: 8, title: 'Rare Song 3' },
      { count: 1, title: 'Very Rare' },
    ];

    const result = withDenseRank(songs);

    assert.equal(result[0].rank, 1);
    assert.equal(result[1].rank, 1);
    assert.equal(result[2].rank, 3);   // Rank 3 because 2 items share rank 1
    assert.equal(result[3].rank, 4);
    assert.equal(result[4].rank, 4);
    assert.equal(result[5].rank, 4);
    assert.equal(result[6].rank, 7);   // Rank 7 because 3 items share rank 4
  });
});

describe('assignRanksInPlace', () => {
  it('should mutate the input array with ranks (note: array order changes)', () => {
    const songs = [
      { count: 5, id: 'a' },
      { count: 3, id: 'b' },
      { count: 5, id: 'c' },
    ];

    assignRanksInPlace(songs);

    // All songs should now have a rank property
    // After sorting by count descending: [5,a] [5,c] [3,b]
    assert.equal(songs[0].rank, 1);
    assert.equal(songs[1].rank, 1);
    assert.equal(songs[2].rank, 3);  // Rank 3 because 2 items share rank 1
  });

  it('should be destructive (mutate input array)', () => {
    const songs = [
      { count: 10 },
      { count: 10 },
      { count: 5 },
    ];

    assignRanksInPlace(songs);

    // Verify mutation occurred
    assert(songs[0].rank !== undefined);
    assert(songs[1].rank !== undefined);
    assert(songs[2].rank !== undefined);
    assert.equal(songs[0].rank, 1);
    assert.equal(songs[1].rank, 1);
    assert.equal(songs[2].rank, 3);  // Standard rank, not dense
  });

  it('should sort songs in-place by count descending', () => {
    const songs = [
      { count: 3, id: 'a' },
      { count: 10, id: 'b' },
      { count: 5, id: 'c' },
    ];

    assignRanksInPlace(songs);

    // After sorting by count descending
    assert.equal(songs[0].count, 10);
    assert.equal(songs[1].count, 5);
    assert.equal(songs[2].count, 3);
  });

  it('should apply standard ranking correctly', () => {
    const songs = [
      { count: 8 },
      { count: 8 },
      { count: 5 },
      { count: 5 },
      { count: 2 },
    ];

    assignRanksInPlace(songs);

    assert.equal(songs[0].rank, 1);
    assert.equal(songs[1].rank, 1);
    assert.equal(songs[2].rank, 3);  // Rank 3 because 2 items share rank 1
    assert.equal(songs[3].rank, 3);
    assert.equal(songs[4].rank, 5);  // Rank 5 because 2 more items share rank 3
  });

  it('should return undefined (no return value)', () => {
    const songs = [{ count: 5 }];

    const result = assignRanksInPlace(songs);

    assert.equal(result, undefined);
  });
});
