/**
 * @module tests/contract/artist-repository.contract
 * @description ArtistRepository の契約テスト (共通テストスイート)。
 *
 * 任意の ArtistRepository 実装に対して同一テストを実行できる。
 *
 * @example
 * import { runArtistRepositoryContract } from '../../contract/artist-repository.contract.js';
 * import { InMemoryArtistRepository } from '../../../src/infra/in-memory/in-memory-artist-repository.js';
 *
 * runArtistRepositoryContract('InMemoryArtistRepository', async () => {
 *   const repo = new InMemoryArtistRepository();
 *   return { repo };
 * });
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * @typedef {import('../../src/domain/port/repositories/artist-repository.js').ArtistRepository} ArtistRepository
 * @typedef {import('../../src/domain/port/repositories/artist-repository.js').NewArtist} NewArtist
 */

/** @returns {NewArtist} */
function makeArtist(overrides = {}) {
  return {
    name: 'テストアーティスト',
    normalizedName: 'テストアーティスト',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * @param {string} label
 * @param {() => Promise<{ repo: ArtistRepository, cleanup?: () => Promise<void> }>} factory
 */
export function runArtistRepositoryContract(label, factory) {
  test(`${label}: findByNormalizedName - 存在しない名前は null を返す`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const result = await repo.findByNormalizedName('nonexistent');
      assert.equal(result, null);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: insert then findByNormalizedName - 登録後に名前で取得できる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const artist = makeArtist();
      await repo.insert(artist);
      const found = await repo.findByNormalizedName(artist.normalizedName);
      assert.ok(found !== null);
      assert.equal(found.name, artist.name);
      assert.equal(found.normalized_name, artist.normalizedName);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: insert - 返り値に id が含まれる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const { id } = await repo.insert(makeArtist());
      assert.equal(typeof id, 'number');
      assert.ok(id > 0);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: insert - 複数の異なるアーティストを登録できる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const { id: id1 } = await repo.insert(makeArtist({ normalizedName: 'artist1' }));
      const { id: id2 } = await repo.insert(makeArtist({ normalizedName: 'artist2' }));
      assert.notEqual(id1, id2);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: insert - 同一 normalized_name の重複登録は Error を throw する`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const artist = makeArtist();
      await repo.insert(artist);
      await assert.rejects(() => repo.insert(artist), Error);
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

  test(`${label}: findAll - 複数登録後に全件取得できる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      await repo.insert(makeArtist({ normalizedName: 'a1' }));
      await repo.insert(makeArtist({ normalizedName: 'a2' }));
      await repo.insert(makeArtist({ normalizedName: 'a3' }));
      const all = await repo.findAll();
      assert.equal(all.length, 3);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: findAll - 各行に id, name, normalized_name, created_at が含まれる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const artist = makeArtist();
      await repo.insert(artist);
      const [row] = await repo.findAll();
      assert.ok(typeof row.id === 'number');
      assert.equal(row.name, artist.name);
      assert.equal(row.normalized_name, artist.normalizedName);
      assert.equal(row.created_at, artist.createdAt);
    } finally {
      await cleanup?.();
    }
  });

  test(`${label}: insert - 返り値 id でデータが区別できる`, async () => {
    const { repo, cleanup } = await factory();
    try {
      const { id: id1 } = await repo.insert(makeArtist({ name: 'A', normalizedName: 'a' }));
      const { id: id2 } = await repo.insert(makeArtist({ name: 'B', normalizedName: 'b' }));
      const all = await repo.findAll();
      const ids = all.map((r) => r.id);
      assert.ok(ids.includes(id1));
      assert.ok(ids.includes(id2));
    } finally {
      await cleanup?.();
    }
  });
}
