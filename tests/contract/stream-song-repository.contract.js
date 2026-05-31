/**
 * @module tests/contract/stream-song-repository.contract
 * @description StreamSongRepository の契約テスト (共通テストスイート)。
 *
 * 任意の StreamSongRepository 実装に対して同一テストを実行できる。
 *
 * @example
 * import { runStreamSongRepositoryContract } from '../../contract/stream-song-repository.contract.js';
 * import { InMemoryStreamSongRepository } from '../../../src/infra/in-memory/in-memory-stream-song-repository.js';
 *
 * runStreamSongRepositoryContract('InMemoryStreamSongRepository', async () => {
 *   const repo = new InMemoryStreamSongRepository();
 *   return { repo };
 * });
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * @typedef {import('../../src/domain/port/repositories/stream-song-repository.js').StreamSongRepository} StreamSongRepository
 * @typedef {import('../../src/domain/port/repositories/stream-song-repository.js').NewStreamSong} NewStreamSong
 */

/**
 * @param {Partial<NewStreamSong>} overrides
 * @returns {NewStreamSong}
 */
function makeStreamSong(overrides = {}) {
  return {
    streamId: 1,
    songId: 10,
    position: 1,
    rawText: '曲名 / アーティスト',
    titleSnapshot: '曲名',
    artistSnapshot: 'アーティスト',
    songKeySnapshot: '曲名__アーティスト',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * @param {string} label
 * @param {() => Promise<{ repo: StreamSongRepository, cleanup?: () => Promise<void> }>} factory
 */
export function runStreamSongRepositoryContract(label, factory) {
  test(`${label}: findByStreamId - 存在しない stream_id は空配列を返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const result = await repo.findByStreamId(9999);
      assert.deepEqual(result, []);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: insertBatch then findByStreamId - 登録後に取得できる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const rows = [makeStreamSong({ position: 1 }), makeStreamSong({ position: 2 })];
      await repo.insertBatch(rows);
      const found = await repo.findByStreamId(1);
      assert.equal(found.length, 2);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findByStreamId - position の昇順で返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.insertBatch([
        makeStreamSong({ position: 3 }),
        makeStreamSong({ position: 1 }),
        makeStreamSong({ position: 2 }),
      ]);
      const found = await repo.findByStreamId(1);
      const positions = found.map((r) => r.position);
      assert.deepEqual(positions, [1, 2, 3]);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: insertBatch - UNIQUE(stream_id, position) 違反は Error`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.insertBatch([makeStreamSong({ position: 1 })]);
      await assert.rejects(
        () => repo.insertBatch([makeStreamSong({ position: 1 })]),
        Error
      );
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: deleteByStreamId - 指定 stream の行が削除される`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.insertBatch([makeStreamSong({ streamId: 1, position: 1 })]);
      await repo.insertBatch([makeStreamSong({ streamId: 2, position: 1 })]);
      await repo.deleteByStreamId(1);
      const s1 = await repo.findByStreamId(1);
      const s2 = await repo.findByStreamId(2);
      assert.deepEqual(s1, []);
      assert.equal(s2.length, 1);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findAll - 空の場合は空配列を返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const all = await repo.findAll();
      assert.deepEqual(all, []);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findAll - insertBatch 後に全件取得できる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.insertBatch([
        makeStreamSong({ streamId: 1, position: 1 }),
        makeStreamSong({ streamId: 2, position: 1 }),
      ]);
      const all = await repo.findAll();
      assert.equal(all.length, 2);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: insertBatch - song_id が null の行も受け付ける`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.insertBatch([makeStreamSong({ songId: null })]);
      const found = await repo.findByStreamId(1);
      assert.equal(found[0].song_id, null);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: StreamSong 行に必須フィールドが含まれる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const input = makeStreamSong();
      await repo.insertBatch([input]);
      const [row] = await repo.findByStreamId(1);
      assert.equal(typeof row.id, 'number');
      assert.equal(row.stream_id, input.streamId);
      assert.equal(row.position, input.position);
      assert.equal(row.title_snapshot, input.titleSnapshot);
      assert.equal(row.song_key_snapshot, input.songKeySnapshot);
      assert.equal(row.created_at, input.createdAt);
    } finally {
      await cleanup?.();
    }
  });
}
