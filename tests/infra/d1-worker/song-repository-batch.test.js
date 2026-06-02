/**
 * @module tests/infra/d1-worker/song-repository-batch.test
 * @description D1SongRepository の大量メタデータ更新がSQL変数上限を踏まないことを検証する。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D1SongRepository } from '../../../src/infra/d1-worker/d1-song-repository.js';

function createFakeClient() {
  const batchCalls = [];
  const db = {
    prepare(sql) {
      return {
        bind(...bindings) {
          return { sql, bindings };
        },
      };
    },
    async batch(stmts) {
      batchCalls.push(stmts);
      return stmts.map(() => ({ success: true }));
    },
  };

  return {
    client: { db },
    batchCalls,
  };
}

test('D1SongRepository.updateMetadataBatch: 1ステートメント3変数でbatch実行する', async () => {
  const { client, batchCalls } = createFakeClient();
  const repo = new D1SongRepository(client);
  const rows = Array.from({ length: 205 }, (_, index) => ({
    id: index + 1,
    displayKey: `+${index % 12}`,
    genre: 'ボカロ',
  }));

  await repo.updateMetadataBatch(rows);

  assert.equal(batchCalls.length, 3);
  assert.equal(batchCalls[0].length, 100);
  assert.equal(batchCalls[1].length, 100);
  assert.equal(batchCalls[2].length, 5);

  for (const batch of batchCalls) {
    for (const stmt of batch) {
      assert.equal(stmt.bindings.length, 3);
      assert.match(stmt.sql, /WHERE id = \?/);
      assert.doesNotMatch(stmt.sql, /CASE id/);
    }
  }
});

test('D1SongRepository.updateMetadataBatch: 空配列ではbatchを呼ばない', async () => {
  const { client, batchCalls } = createFakeClient();
  const repo = new D1SongRepository(client);

  await repo.updateMetadataBatch([]);

  assert.equal(batchCalls.length, 0);
});
