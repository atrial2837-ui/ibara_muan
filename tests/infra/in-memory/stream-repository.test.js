/**
 * @file tests/infra/in-memory/stream-repository.test.js
 * @description InMemoryStreamRepository の契約テスト実行。
 */

import { runStreamRepositoryContract } from '../../contract/stream-repository.contract.js';
import { InMemoryStreamRepository } from '../../../src/infra/in-memory/in-memory-stream-repository.js';

runStreamRepositoryContract('InMemoryStreamRepository', async () => {
  const repo = new InMemoryStreamRepository();
  return { repo };
});
