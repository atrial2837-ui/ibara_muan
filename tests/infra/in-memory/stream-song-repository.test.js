/**
 * @file tests/infra/in-memory/stream-song-repository.test.js
 * @description InMemoryStreamSongRepository の契約テスト実行。
 */

import { runStreamSongRepositoryContract } from '../../contract/stream-song-repository.contract.js';
import { InMemoryStreamSongRepository } from '../../../src/infra/in-memory/in-memory-stream-song-repository.js';

runStreamSongRepositoryContract('InMemoryStreamSongRepository', async () => {
  const repo = new InMemoryStreamSongRepository();
  return { repo };
});
