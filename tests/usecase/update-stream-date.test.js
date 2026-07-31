/**
 * @file tests/usecase/update-stream-date.test.js
 * @description updateStreamDate UseCase のテスト。
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { updateStreamDate } from '../../src/usecase/update-stream-date.js';
import { ValidationError } from '../../src/domain/error/validation-error.js';
import { NotFoundError } from '../../src/domain/error/not-found-error.js';
import {
  InMemoryChannelRepository,
  InMemoryStreamRepository,
} from '../../src/infra/in-memory/index.js';

function setup() {
  const channels = new InMemoryChannelRepository([
    { id: 1, code: 'new', name: '新ch', sort_order: 1, created_at: '2026-01-01T00:00:00.000Z' },
    { id: 2, code: 'old', name: '旧ch', sort_order: 2, created_at: '2026-01-01T00:00:00.000Z' },
  ]);
  const streams = new InMemoryStreamRepository();
  return { deps: { channels, streams }, channels, streams };
}

/** URL 付きの歌枠 (url_key = url) */
function insertWithUrl(streams, overrides = {}) {
  return streams.insert({
    channelId: 1,
    sourceIndex: 1,
    streamedOn: '2026-07-31',
    title: 'むあゆる歌枠第2弾なのよ',
    url: 'https://www.youtube.com/live/abc',
    urlKey: 'https://www.youtube.com/live/abc',
    songCount: 10,
    createdAt: '2026-07-31T00:00:00.000Z',
    ...overrides,
  });
}

/** URL 無しの歌枠 (url_key = "code:date:title") */
function insertWithoutUrl(streams, overrides = {}) {
  return streams.insert({
    channelId: 1,
    sourceIndex: 2,
    streamedOn: '2026-07-31',
    title: 'タイトルのみ',
    url: '',
    urlKey: 'new:2026-07-31:タイトルのみ',
    songCount: 3,
    createdAt: '2026-07-31T00:00:00.000Z',
    ...overrides,
  });
}

describe('updateStreamDate', () => {
  test('配信日を変更できる', async () => {
    const { deps, streams } = setup();
    const { id } = await insertWithUrl(streams);

    const result = await updateStreamDate(deps, { streamId: id, streamedOn: '2026-07-08' });

    assert.equal(result.streamId, id);
    assert.equal(result.previousStreamedOn, '2026-07-31');
    assert.equal(result.streamedOn, '2026-07-08');

    const row = await streams.findById(id);
    assert.equal(row.streamed_on, '2026-07-08');
  });

  test('URL 付き歌枠の url_key は変わらない', async () => {
    const { deps, streams } = setup();
    const { id } = await insertWithUrl(streams);

    await updateStreamDate(deps, { streamId: id, streamedOn: '2026-07-08' });

    const row = await streams.findById(id);
    assert.equal(row.url_key, 'https://www.youtube.com/live/abc');
  });

  test('URL 無し歌枠の url_key は新しい配信日で再計算される', async () => {
    const { deps, streams } = setup();
    const { id } = await insertWithoutUrl(streams);

    await updateStreamDate(deps, { streamId: id, streamedOn: '2026-07-08' });

    const row = await streams.findById(id);
    assert.equal(row.url_key, 'new:2026-07-08:タイトルのみ');
  });

  test('文字列の streamId も受け付ける', async () => {
    const { deps, streams } = setup();
    const { id } = await insertWithUrl(streams);

    const result = await updateStreamDate(deps, { streamId: String(id), streamedOn: '2026-07-08' });

    assert.equal(result.streamedOn, '2026-07-08');
  });

  test('同じ配信日を指定した場合は何も変わらない', async () => {
    const { deps, streams } = setup();
    const { id } = await insertWithUrl(streams);

    const result = await updateStreamDate(deps, { streamId: id, streamedOn: '2026-07-31' });

    assert.equal(result.previousStreamedOn, '2026-07-31');
    assert.equal(result.streamedOn, '2026-07-31');
    const row = await streams.findById(id);
    assert.equal(row.streamed_on, '2026-07-31');
  });

  test('存在しない歌枠は NotFoundError', async () => {
    const { deps } = setup();
    await assert.rejects(
      () => updateStreamDate(deps, { streamId: 999, streamedOn: '2026-07-08' }),
      NotFoundError,
    );
  });

  test('配信日の書式が不正なら ValidationError', async () => {
    const { deps, streams } = setup();
    const { id } = await insertWithUrl(streams);

    await assert.rejects(
      () => updateStreamDate(deps, { streamId: id, streamedOn: '2026/07/08' }),
      ValidationError,
    );
    await assert.rejects(
      () => updateStreamDate(deps, { streamId: id, streamedOn: '' }),
      ValidationError,
    );
  });

  test('streamId が不正なら ValidationError', async () => {
    const { deps } = setup();
    await assert.rejects(
      () => updateStreamDate(deps, { streamId: 'abc', streamedOn: '2026-07-08' }),
      ValidationError,
    );
  });

  test('同一チャンネルで (配信日, url_key) が重複する場合は ValidationError', async () => {
    const { deps, streams } = setup();
    const { id } = await insertWithoutUrl(streams);
    // 移動先の日付に同じ url_key の歌枠が既にある
    await streams.insert({
      channelId: 1,
      sourceIndex: 3,
      streamedOn: '2026-07-08',
      title: 'タイトルのみ',
      url: '',
      urlKey: 'new:2026-07-08:タイトルのみ',
      songCount: 1,
      createdAt: '2026-07-08T00:00:00.000Z',
    });

    await assert.rejects(
      () => updateStreamDate(deps, { streamId: id, streamedOn: '2026-07-08' }),
      ValidationError,
    );

    const row = await streams.findById(id);
    assert.equal(row.streamed_on, '2026-07-31');
  });

  test('別チャンネルの同一 url_key とは衝突しない', async () => {
    const { deps, streams } = setup();
    const { id } = await insertWithoutUrl(streams);
    await streams.insert({
      channelId: 2,
      sourceIndex: 1,
      streamedOn: '2026-07-08',
      title: 'タイトルのみ',
      url: '',
      urlKey: 'new:2026-07-08:タイトルのみ',
      songCount: 1,
      createdAt: '2026-07-08T00:00:00.000Z',
    });

    await updateStreamDate(deps, { streamId: id, streamedOn: '2026-07-08' });

    const row = await streams.findById(id);
    assert.equal(row.streamed_on, '2026-07-08');
  });
});
