/**
 * @file tests/usecase/list-streams.test.js
 * @description listStreams UseCase のテスト。
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { listStreams } from '../../src/usecase/list-streams.js';
import { ValidationError } from '../../src/domain/error/validation-error.js';
import {
  InMemoryChannelRepository,
  InMemoryStreamRepository,
} from '../../src/infra/in-memory/index.js';

async function setup() {
  const channels = new InMemoryChannelRepository([
    { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2026-01-01T00:00:00.000Z' },
    { id: 2, code: 'old', name: '旧ch', sort_order: 2, created_at: '2026-01-01T00:00:00.000Z' },
  ]);
  const streams = new InMemoryStreamRepository();

  await streams.insert({
    channelId: 1, sourceIndex: 1, streamedOn: '2026-07-08', title: '7月8日の枠',
    url: 'https://example.com/a', urlKey: 'a', songCount: 12, createdAt: '2026-07-08T00:00:00.000Z',
  });
  await streams.insert({
    channelId: 1, sourceIndex: 2, streamedOn: '2026-07-31', title: '7月31日の枠',
    url: 'https://example.com/b', urlKey: 'b', songCount: 8, createdAt: '2026-07-31T00:00:00.000Z',
  });
  await streams.insert({
    channelId: 2, sourceIndex: 1, streamedOn: '2026-06-01', title: '旧chの枠',
    url: '', urlKey: 'old:2026-06-01:旧chの枠', songCount: 5, createdAt: '2026-06-01T00:00:00.000Z',
  });

  return { deps: { channels, streams } };
}

describe('listStreams', () => {
  test('全チャンネルを配信日の新しい順に返す', async () => {
    const { deps } = await setup();
    const result = await listStreams(deps);

    assert.equal(result.total, 3);
    assert.deepEqual(
      result.streams.map((s) => s.streamedOn),
      ['2026-07-31', '2026-07-08', '2026-06-01'],
    );
  });

  test('channelCode で絞り込める', async () => {
    const { deps } = await setup();
    const result = await listStreams(deps, { channelCode: 'old' });

    assert.equal(result.total, 1);
    assert.equal(result.streams[0].channelCode, 'old');
    assert.equal(result.streams[0].title, '旧chの枠');
  });

  test('limit で件数を制限しても total は絞り込み後の総数', async () => {
    const { deps } = await setup();
    const result = await listStreams(deps, { limit: 1 });

    assert.equal(result.streams.length, 1);
    assert.equal(result.total, 3);
  });

  test('チャンネルコードを DTO に含める', async () => {
    const { deps } = await setup();
    const result = await listStreams(deps, { channelCode: 'new' });

    assert.ok(result.streams.every((s) => s.channelCode === 'new'));
    assert.equal(result.streams[0].songCount, 8);
    assert.equal(result.streams[0].url, 'https://example.com/b');
  });

  test('未知のチャンネルコードは ValidationError', async () => {
    const { deps } = await setup();
    await assert.rejects(() => listStreams(deps, { channelCode: 'unknown' }), ValidationError);
  });
});
