/**
 * @typedef {object} SongWithCount
 * @property {number} count
 * @property {*} [extra] // other fields are transparent
 */

/**
 * Standard ranking: assigns rank based on descending count order.
 *
 * - Songs are sorted by count (descending)
 * - Same count values receive the same rank
 * - Skips ranks after ties (1,1,3 not 1,1,2)
 * - Returns a NEW array with rank field added (non-destructive)
 * - Input array is not modified
 *
 * @template {SongWithCount} T
 * @param {ReadonlyArray<T>} songs - Input songs with count property (not modified)
 * @returns {Array<T & { rank: number }>} New array with rank field added, sorted by count descending
 *
 * @example
 * withDenseRank([{count:5}, {count:3}, {count:1}])
 * // => [{count:5, rank:1}, {count:3, rank:2}, {count:1, rank:3}]
 *
 * @example
 * withDenseRank([{count:5}, {count:5}, {count:3}])
 * // => [{count:5, rank:1}, {count:5, rank:1}, {count:3, rank:3}]
 */
export function withDenseRank(songs) {
  // Create sorted copy with rank property
  const sorted = songs
    .map((song, originalIndex) => ({ ...song, _originalIndex: originalIndex }))
    .sort((a, b) => b.count - a.count);

  let previousCount = null;
  let previousRank = 0;

  // Assign rank values
  sorted.forEach((song, index) => {
    if (previousCount !== null && song.count === previousCount) {
      song.rank = previousRank;
    } else {
      song.rank = index + 1;
      previousRank = song.rank;
    }
    previousCount = song.count;
  });

  // Remove internal tracking property
  return sorted.map(({ _originalIndex, ...rest }) => rest);
}

/**
 * @deprecated Use withDenseRank instead. This function mutates the input array.
 *
 * Performs standard ranking in-place on the input array.
 * Mutates the input array by sorting it and adding rank properties.
 * Provided for backward compatibility with legacy code (assignRanks).
 *
 * @template {SongWithCount} T
 * @param {Array<T>} songs - Input array (MUTATED - both sorted and ranked)
 * @returns {void}
 */
export function assignRanksInPlace(songs) {
  // Sort the array in-place by count descending
  songs.sort((a, b) => b.count - a.count);

  let previousCount = null;
  let previousRank = 0;

  // Add rank property to each song
  songs.forEach((song, index) => {
    if (previousCount !== null && song.count === previousCount) {
      song.rank = previousRank;
    } else {
      song.rank = index + 1;
      previousRank = song.rank;
    }
    previousCount = song.count;
  });
}
