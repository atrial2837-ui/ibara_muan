/**
 * @module tests/contract/stream-repository.contract
 * @description StreamRepository の契約テスト (共通テストスイート)。
 *
 * 任意の StreamRepository 実装に対して同一テストを実行できる。
 *
 * @example
 * import { runStreamRepositoryContract } from '../../contract/stream-repository.contract.js';
 * import { InMemoryStreamRepository } from '../../../src/infra/in-memory/in-memory-stream-repository.js';
 *
 * runStreamRepositoryContract('InMemoryStreamRepository', async () => {
 *   const repo = new InMemoryStreamRepository();
 *   return { repo };
 * });
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * @typedef {import('../../src/domain/port/repositories/stream-repository.js').StreamRepository} StreamRepository
 * @typedef {import('../../src/domain/port/repositories/stream-repository.js').NewStream} NewStream
 */

/** @returns {NewStream} */
function makeStream(overrides = {}) {
  return {
    channelId: 1,
    sourceIndex: null,
    streamedOn: '2026-01-01',
    title: 'テスト配信',
    url: 'https://example.com/watch?v=abc',
    urlKey: 'abc',
    songCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * @param {string} label
 * @param {() => Promise<{ repo: StreamRepository, cleanup?: () => Promise<void> }>} factory
 */
export function runStreamRepositoryContract(label, factory) {
  test(`${label}: findByChannelDateUrlKey - 存在しない場合は null を返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const result = await repo.findByChannelDateUrlKey(1, '2026-01-01', 'notfound');
      assert.equal(result, null);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: insert then findByChannelDateUrlKey - 登録後に取得できる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const stream = makeStream();
      await repo.insert(stream);
      const found = await repo.findByChannelDateUrlKey(
        stream.channelId,
        stream.streamedOn,
        stream.urlKey
      );
      assert.ok(found !== null);
      assert.equal(found.channel_id, stream.channelId);
      assert.equal(found.streamed_on, stream.streamedOn);
      assert.equal(found.url_key, stream.urlKey);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: insert - 返り値に id が含まれる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const { id } = await repo.insert(makeStream());
      assert.equal(typeof id, 'number');
      assert.ok(id > 0);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: insert - UNIQUE(channel_id, streamed_on, url_key) 違反は Error`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const stream = makeStream();
      await repo.insert(stream);
      await assert.rejects(() => repo.insert(stream), Error);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: update - song_count が更新される`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const { id } = await repo.insert(makeStream({ songCount: 0 }));
      await repo.update(id, { song_count: 5 });
      const all = await repo.findAll();
      const found = all.find((r) => r.id === id);
      assert.ok(found !== null);
      assert.equal(found.song_count, 5);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findAllByChannel - 指定チャンネルの歌枠のみ返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.insert(makeStream({ channelId: 1, urlKey: 'k1' }));
      await repo.insert(makeStream({ channelId: 2, urlKey: 'k2' }));
      await repo.insert(makeStream({ channelId: 1, urlKey: 'k3' }));
      const ch1 = await repo.findAllByChannel(1);
      assert.equal(ch1.length, 2);
      assert.ok(ch1.every((r) => r.channel_id === 1));
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findAll - 全件取得できる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.insert(makeStream({ channelId: 1, urlKey: 'x1' }));
      await repo.insert(makeStream({ channelId: 2, urlKey: 'x2' }));
      const all = await repo.findAll();
      assert.equal(all.length, 2);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: nextSourceIndex - 空のチャンネルは 1 を返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const next = await repo.nextSourceIndex(99);
      assert.equal(next, 1);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: nextSourceIndex - max(source_index) + 1 を返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.insert(makeStream({ channelId: 1, urlKey: 'a', sourceIndex: 3 }));
      await repo.insert(makeStream({ channelId: 1, urlKey: 'b', sourceIndex: 7 }));
      const next = await repo.nextSourceIndex(1);
      assert.equal(next, 8);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: nextSourceIndex - 別チャンネルの source_index は無視する`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.insert(makeStream({ channelId: 2, urlKey: 'z', sourceIndex: 100 }));
      const next = await repo.nextSourceIndex(1);
      assert.equal(next, 1);
    } finally {
      await cleanup?.();
    }
  });
}
