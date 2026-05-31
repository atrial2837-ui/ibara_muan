/**
 * @typedef {object} SongLite
 * @property {string} artist
 * @property {number} count
 * @property {*} [extra] // other fields are transparent
 */

/**
 * @typedef {object} ArtistRecord
 * @property {string} artist
 * @property {ReadonlyArray<SongLite>} songs
 * @property {number} totalCount
 * @property {number} songCount
 */

/**
 * Derives artist statistics from a list of songs.
 *
 * Groups songs by artist, calculates total play count and unique song count,
 * and sorts by total count descending.
 *
 * @param {ReadonlyArray<SongLite>} songs - Input songs (non-destructively processed)
 * @returns {ReadonlyArray<ArtistRecord>} Sorted artist records by totalCount (descending)
 *
 * - Groups by artist name (empty/falsy → '(不明)')
 * - totalCount = sum of count for all songs in group
 * - songCount = number of unique songs in group
 * - Sorted by totalCount descending
 * - Does not mutate input array
 */
export function deriveArtists(songs) {
  const byArtist = new Map();

  for (const song of songs) {
    const artist = song.artist || '(不明)';

    if (!byArtist.has(artist)) {
      byArtist.set(artist, {
        artist,
        songs: [],
        totalCount: 0,
        songCount: 0,
      });
    }

    const item = byArtist.get(artist);
    item.songs.push(song);
    item.totalCount += song.count;
    item.songCount += 1;
  }

  return Array.from(byArtist.values()).sort(
    (a, b) => b.totalCount - a.totalCount
  );
}
