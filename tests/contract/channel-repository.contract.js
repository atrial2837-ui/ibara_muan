/**
 * @module tests/contract/channel-repository.contract
 * @description ChannelRepository の契約テスト (共通テストスイート)。
 *
 * 任意の ChannelRepository 実装に対して同一テストを実行できる。
 *
 * @example
 * import { runChannelRepositoryContract } from '../../contract/channel-repository.contract.js';
 * import { InMemoryChannelRepository } from '../../../src/infra/in-memory/in-memory-channel-repository.js';
 *
 * runChannelRepositoryContract('InMemoryChannelRepository', async () => {
 *   const repo = new InMemoryChannelRepository([
 *     { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2026-01-01T00:00:00.000Z' },
 *   ]);
 *   return { repo };
 * });
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * @typedef {import('../../src/domain/port/repositories/channel-repository.js').Channel} Channel
 * @typedef {import('../../src/domain/port/repositories/channel-repository.js').ChannelRepository} ChannelRepository
 */

/** @type {Channel[]} */
const SEED_CHANNELS = [
  { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 2, code: 'old', name: '旧ch', sort_order: 2, created_at: '2026-01-01T00:00:00.000Z' },
];

/**
 * @param {string} label
 * @param {() => Promise<{ repo: ChannelRepository, cleanup?: () => Promise<void> }>} factory
 *   factory は SEED_CHANNELS を初期データとして持つ repo を返すことを期待する。
 *   空状態から構築する場合は _insert などで追加すること。
 */
export function runChannelRepositoryContract(label, factory) {
  test(`${label}: findAll - 全チャンネルを返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const all = await repo.findAll();
      assert.equal(all.length, 2);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findAll - sort_order 昇順で返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const all = await repo.findAll();
      const orders = all.map((c) => c.sort_order);
      const sorted = [...orders].sort((a, b) => a - b);
      assert.deepEqual(orders, sorted);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findAll - 各行に必須フィールドが含まれる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const [ch] = await repo.findAll();
      assert.equal(typeof ch.id, 'number');
      assert.equal(typeof ch.code, 'string');
      assert.equal(typeof ch.name, 'string');
      assert.equal(typeof ch.sort_order, 'number');
      assert.equal(typeof ch.created_at, 'string');
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findByCode - 存在する code のチャンネルを返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const ch = await repo.findByCode('new');
      assert.ok(ch !== null);
      assert.equal(ch.code, 'new');
      assert.equal(ch.name, '新ch');
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findByCode - 存在しない code は null を返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const ch = await repo.findByCode('notfound');
      assert.equal(ch, null);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findByCode - 'old' チャンネルを取得できる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const ch = await repo.findByCode('old');
      assert.ok(ch !== null);
      assert.equal(ch.code, 'old');
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findAll - findByCode の結果と整合する`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const all = await repo.findAll();
      const byCode = await repo.findByCode('new');
      const fromAll = all.find((c) => c.code === 'new');
      assert.ok(fromAll !== undefined);
      assert.deepEqual(byCode, fromAll);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findByCode - 大文字小文字を区別する`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const ch = await repo.findByCode('NEW');
      assert.equal(ch, null);
    } finally {
      await cleanup?.();
    }
  });
}
