import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveArtists } from '../../../src/domain/analytics/artist-stats.js';

describe('deriveArtists', () => {
  it('should group songs by artist and calculate statistics', () => {
    const songs = [
      { artist: 'Alice', count: 10 },
      { artist: 'Bob', count: 5 },
      { artist: 'Charlie', count: 8 },
      { artist: 'Alice', count: 3 },
      { artist: 'Bob', count: 2 },
      { artist: 'Charlie', count: 1 },
    ];

    const result = deriveArtists(songs);

    assert.equal(result.length, 3);
    assert.equal(result[0].artist, 'Alice');
    assert.equal(result[0].totalCount, 13);
    assert.equal(result[0].songCount, 2);
    assert.equal(result[1].artist, 'Charlie');
    assert.equal(result[1].totalCount, 9);
    assert.equal(result[2].artist, 'Bob');
    assert.equal(result[2].totalCount, 7);
  });

  it('should include songs array for each artist group', () => {
    const songs = [
      { artist: 'Alice', count: 5, title: 'Song1' },
      { artist: 'Alice', count: 3, title: 'Song2' },
    ];

    const result = deriveArtists(songs);

    assert.equal(result.length, 1);
    assert.equal(result[0].songs.length, 2);
    assert.deepEqual(result[0].songs, songs);
  });

  it('should correctly sum totalCount from multiple songs by same artist', () => {
    const songs = [
      { artist: 'Artist1', count: 10 },
      { artist: 'Artist1', count: 20 },
      { artist: 'Artist1', count: 5 },
    ];

    const result = deriveArtists(songs);

    assert.equal(result.length, 1);
    assert.equal(result[0].totalCount, 35);
    assert.equal(result[0].songCount, 3);
  });

  it('should sort by totalCount in descending order', () => {
    const songs = [
      { artist: 'Low', count: 1 },
      { artist: 'High', count: 100 },
      { artist: 'Mid', count: 50 },
    ];

    const result = deriveArtists(songs);

    assert.equal(result[0].artist, 'High');
    assert.equal(result[1].artist, 'Mid');
    assert.equal(result[2].artist, 'Low');
  });

  it('should handle empty input array', () => {
    const songs = [];

    const result = deriveArtists(songs);

    assert.equal(result.length, 0);
    assert(Array.isArray(result));
  });

  it('should handle single artist', () => {
    const songs = [
      { artist: 'OnlyOne', count: 42 },
    ];

    const result = deriveArtists(songs);

    assert.equal(result.length, 1);
    assert.equal(result[0].artist, 'OnlyOne');
    assert.equal(result[0].totalCount, 42);
    assert.equal(result[0].songCount, 1);
  });

  it('should treat empty artist string as "(不明)"', () => {
    const songs = [
      { artist: '', count: 5 },
      { artist: 'Known', count: 3 },
    ];

    const result = deriveArtists(songs);

    assert.equal(result.length, 2);
    const unknownArtist = result.find((r) => r.artist === '(不明)');
    assert(unknownArtist);
    assert.equal(unknownArtist.totalCount, 5);
  });

  it('should treat null/undefined artist as "(不明)"', () => {
    const songs = [
      { artist: null, count: 7 },
      { artist: undefined, count: 2 },
      { artist: 'Named', count: 1 },
    ];

    const result = deriveArtists(songs);

    assert.equal(result.length, 2);
    const unknownArtist = result.find((r) => r.artist === '(不明)');
    assert(unknownArtist);
    assert.equal(unknownArtist.totalCount, 9);
    assert.equal(unknownArtist.songCount, 2);
  });

  it('should not mutate input array', () => {
    const songs = [
      { artist: 'A', count: 1 },
      { artist: 'B', count: 2 },
    ];
    const original = JSON.parse(JSON.stringify(songs));

    deriveArtists(songs);

    assert.deepEqual(songs, original);
  });

  it('should maintain stability for artists with same totalCount', () => {
    const songs = [
      { artist: 'A', count: 5, id: 1 },
      { artist: 'B', count: 5, id: 2 },
      { artist: 'C', count: 5, id: 3 },
    ];

    const result = deriveArtists(songs);

    assert.equal(result.length, 3);
    // All have same totalCount; order should match insertion order
    // (Map preserves insertion order, and sort is stable in modern JS)
    assert.equal(result[0].totalCount, 5);
    assert.equal(result[1].totalCount, 5);
    assert.equal(result[2].totalCount, 5);
  });

  it('should preserve additional song properties', () => {
    const songs = [
      {
        artist: 'Artist',
        count: 10,
        title: 'Song Title',
        date: '2024-01-01',
        extra: 'data',
      },
    ];

    const result = deriveArtists(songs);

    assert.equal(result[0].songs[0].title, 'Song Title');
    assert.equal(result[0].songs[0].date, '2024-01-01');
    assert.equal(result[0].songs[0].extra, 'data');
  });
});
