import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { updateStreamInfo } from '../../src/usecase/update-stream-info.js';
import { ValidationError } from '../../src/domain/error/validation-error.js';
import { NotFoundError } from '../../src/domain/error/not-found-error.js';
import {
  InMemoryChannelRepository,
  InMemoryStreamRepository,
  FakeClock,
} from '../../src/infra/in-memory/index.js';

describe('updateStreamInfo', () => {
  let deps;
  beforeEach(async () => {
    const channels = new InMemoryChannelRepository([
      { id: 1, code: 'main', name: '茨むあん', sort_order: 1, created_at: '2026-01-01T00:00:00.000Z' },
    ]);
    const streams = new InMemoryStreamRepository();
    await streams.insert({
      channelId: 1, sourceIndex: 7, streamedOn: '2026-08-02', title: '旧タイトル',
      url: 'https://example.com/old', urlKey: 'https://example.com/old', songCount: 3,
      createdAt: '2026-08-02T00:00:00.000Z',
    });
    deps = { channels, streams, clock: new FakeClock() };
  });

  it('指定フィールドだけ更新して song_count は変えない', async () => {
    const result = await updateStreamInfo(deps, { streamId: 1, title: '新タイトル' });
    assert.deepEqual(result, { ok: true, streamId: 1 });
    const stream = await deps.streams.findById(1);
    assert.equal(stream.title, '新タイトル');
    assert.equal(stream.url, 'https://example.com/old');
    assert.equal(stream.streamed_on, '2026-08-02');
    assert.equal(stream.song_count, 3);
  });

  it('存在しない枠は NotFoundError', async () => {
    await assert.rejects(() => updateStreamInfo(deps, { streamId: 999, title: 'x' }), NotFoundError);
  });

  it('日付形式が不正なら ValidationError', async () => {
    await assert.rejects(() => updateStreamInfo(deps, { streamId: 1, streamedOn: '2026/08/02' }), ValidationError);
  });
});
