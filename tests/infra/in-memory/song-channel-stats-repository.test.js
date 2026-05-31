/**
 * @file tests/infra/in-memory/song-channel-stats-repository.test.js
 * @description InMemorySongChannelStatsRepository の契約テスト実行。
 */

import { runSongChannelStatsRepositoryContract } from '../../contract/song-channel-stats-repository.contract.js';
import { InMemorySongChannelStatsRepository } from '../../../src/infra/in-memory/in-memory-song-channel-stats-repository.js';

runSongChannelStatsRepositoryContract('InMemorySongChannelStatsRepository', async () => {
  const repo = new InMemorySongChannelStatsRepository();
  return { repo };
});
