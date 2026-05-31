/**
 * @file tests/infra/in-memory/channel-repository.test.js
 * @description InMemoryChannelRepository の契約テスト実行。
 */

import { runChannelRepositoryContract } from '../../contract/channel-repository.contract.js';
import { InMemoryChannelRepository } from '../../../src/infra/in-memory/in-memory-channel-repository.js';

/** @type {import('../../../src/domain/port/repositories/channel-repository.js').Channel[]} */
const SEED = [
  { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 2, code: 'old', name: '旧ch', sort_order: 2, created_at: '2026-01-01T00:00:00.000Z' },
];

runChannelRepositoryContract('InMemoryChannelRepository', async () => {
  const repo = new InMemoryChannelRepository(SEED);
  return { repo };
});
