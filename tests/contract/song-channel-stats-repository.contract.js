/**
 * @module tests/contract/song-channel-stats-repository.contract
 * @description SongChannelStatsRepository の契約テスト (共通テストスイート)。
 *
 * 任意の SongChannelStatsRepository 実装に対して同一テストを実行できる。
 *
 * @example
 * import { runSongChannelStatsRepositoryContract } from '../../contract/song-channel-stats-repository.contract.js';
 * import { InMemorySongChannelStatsRepository } from '../../../src/infra/in-memory/in-memory-song-channel-stats-repository.js';
 *
 * runSongChannelStatsRepositoryContract('InMemorySongChannelStatsRepository', async () => {
 *   const repo = new InMemorySongChannelStatsRepository();
 *   return { repo };
 * });
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * @typedef {import('../../src/domain/port/repositories/song-channel-stats-repository.js').SongChannelStatsRepository} SongChannelStatsRepository
 */

const NOW = '2026-01-01T00:00:00.000Z';

/**
 * @param {string} label
 * @param {() => Promise<{ repo: SongChannelStatsRepository, cleanup?: () => Promise<void> }>} factory
 */
export function runSongChannelStatsRepositoryContract(label, factory) {
  test(`${label}: findAll - 空の場合は空配列を返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const all = await repo.findAll();
      assert.deepEqual(all, []);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: upsertIncrement - 新規行は sing_count=1 で作成される`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.upsertIncrement(1, 1, NOW);
      const all = await repo.findAll();
      assert.equal(all.length, 1);
      assert.equal(all[0].sing_count, 1);
      assert.equal(all[0].song_id, 1);
      assert.equal(all[0].channel_id, 1);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: upsertIncrement - 既存行は sing_count が +1 される`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.upsertIncrement(1, 1, NOW);
      await repo.upsertIncrement(1, 1, NOW);
      await repo.upsertIncrement(1, 1, NOW);
      const all = await repo.findAll();
      assert.equal(all[0].sing_count, 3);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: decrementBySongIds - sing_count が 1 デクリメントされる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.upsertIncrement(1, 1, NOW);
      await repo.upsertIncrement(1, 1, NOW);
      await repo.decrementBySongIds([1], 1, NOW);
      const all = await repo.findAll();
      assert.equal(all[0].sing_count, 1);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: decrementBySongIds - sing_count が 0 のとき 0 のまま (負にならない)`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.upsertIncrement(1, 1, NOW);
      await repo.decrementBySongIds([1], 1, NOW); // → 0
      await repo.decrementBySongIds([1], 1, NOW); // → 0 (not -1)
      const all = await repo.findAll();
      assert.equal(all[0].sing_count, 0);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: decrementBySongIds - 複数 songId を一括処理できる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.upsertIncrement(1, 1, NOW);
      await repo.upsertIncrement(2, 1, NOW);
      await repo.upsertIncrement(3, 1, NOW);
      await repo.decrementBySongIds([1, 2], 1, NOW);
      const all = await repo.findAll();
      const map = new Map(all.map((r) => [r.song_id, r.sing_count]));
      assert.equal(map.get(1), 0);
      assert.equal(map.get(2), 0);
      assert.equal(map.get(3), 1); // デクリメントされていない
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findByChannelId - 指定チャンネルの統計のみ返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.upsertIncrement(1, 1, NOW);
      await repo.upsertIncrement(2, 2, NOW);
      await repo.upsertIncrement(3, 1, NOW);
      const ch1 = await repo.findByChannelId(1);
      assert.equal(ch1.length, 2);
      assert.ok(ch1.every((r) => r.channel_id === 1));
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findByChannelId - 存在しないチャンネルは空配列を返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const result = await repo.findByChannelId(999);
      assert.deepEqual(result, []);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: upsertIncrement - (song_id, channel_id) が異なれば別行になる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.upsertIncrement(1, 1, NOW);
      await repo.upsertIncrement(1, 2, NOW);
      await repo.upsertIncrement(2, 1, NOW);
      const all = await repo.findAll();
      assert.equal(all.length, 3);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: SongChannelStat 行に必須フィールドが含まれる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.upsertIncrement(5, 3, NOW);
      const [row] = await repo.findAll();
      assert.equal(row.song_id, 5);
      assert.equal(row.channel_id, 3);
      assert.equal(typeof row.sing_count, 'number');
      assert.equal(row.created_at, NOW);
      assert.equal(row.updated_at, NOW);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: decrementBySongIds - 存在しない songId は無視する`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.upsertIncrement(1, 1, NOW);
      // song_id=999 は存在しないが、エラーにならない
      await repo.decrementBySongIds([999], 1, NOW);
      const all = await repo.findAll();
      assert.equal(all[0].sing_count, 1); // 変化なし
    } finally {
      await cleanup?.();
    }
  });
}
