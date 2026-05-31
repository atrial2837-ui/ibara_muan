/**
 * @file tests/infra/in-memory/artist-repository.test.js
 * @description InMemoryArtistRepository の契約テスト実行。
 */

import { runArtistRepositoryContract } from '../../contract/artist-repository.contract.js';
import { InMemoryArtistRepository } from '../../../src/infra/in-memory/in-memory-artist-repository.js';

runArtistRepositoryContract('InMemoryArtistRepository', async () => {
  const repo = new InMemoryArtistRepository();
  return { repo };
});
