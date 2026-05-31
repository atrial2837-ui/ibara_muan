/**
 * @file tests/infra/in-memory/song-repository.test.js
 * @description InMemorySongRepository の契約テスト実行。
 */

import { runSongRepositoryContract } from '../../contract/song-repository.contract.js';
import { InMemorySongRepository } from '../../../src/infra/in-memory/in-memory-song-repository.js';
import { InMemoryArtistRepository } from '../../../src/infra/in-memory/in-memory-artist-repository.js';

runSongRepositoryContract('InMemorySongRepository', async () => {
  const artistRepo = new InMemoryArtistRepository();
  const repo = new InMemorySongRepository(artistRepo);
  return { repo };
});
