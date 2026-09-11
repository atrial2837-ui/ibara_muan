import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { saveApprovedTimestamps } from '../../../src/usecase/timestamp/save-approved-timestamps.js';
import { ValidationError } from '../../../src/domain/error/validation-error.js';

/** replaceApproved の呼び出しを記録するだけの偽リポジトリ */
function fakeRepo() {
  return {
    calls: [],
    async replaceApproved(channelCode, streamIndex, items, reviewedAt, reviewerNote) {
      this.calls.push({ channelCode, streamIndex, items, reviewedAt, reviewerNote });
      return items.length;
    },
  };
}

const FIXED_NOW = new Date('2026-08-05T12:00:00.000Z');

describe('saveApprovedTimestamps', () => {
  let deps;
  beforeEach(() => {
    deps = { timestamps: fakeRepo(), clock: { now: () => FIXED_NOW } };
  });

  const input = (over = {}) => ({
    channelCode: 'main',
    streamIndex: 160,
    items: [{ songIndex: 1, timeSeconds: 1346 }, { songIndex: 0, timeSeconds: 940 }],
    ...over,
  });

  it('件数を返し、リポジトリへ渡す', async () => {
    const result = await saveApprovedTimestamps(deps, input());
    assert.deepEqual(result, { count: 2 });
    assert.equal(deps.timestamps.calls.length, 1);
    assert.equal(deps.timestamps.calls[0].channelCode, 'main');
    assert.equal(deps.timestamps.calls[0].streamIndex, 160);
  });

  it('songIndex の昇順に並べ替えてから渡す', async () => {
    await saveApprovedTimestamps(deps, input());
    assert.deepEqual(deps.timestamps.calls[0].items, [
      { songIndex: 0, timeSeconds: 940 },
      { songIndex: 1, timeSeconds: 1346 },
    ]);
  });

  it('審査日時に現在時刻を入れる', async () => {
    await saveApprovedTimestamps(deps, input());
    assert.equal(deps.timestamps.calls[0].reviewedAt, FIXED_NOW.toISOString());
  });

  it('空配列でも保存できる（打刻を全消しする操作）', async () => {
    const result = await saveApprovedTimestamps(deps, input({ items: [] }));
    assert.deepEqual(result, { count: 0 });
    assert.deepEqual(deps.timestamps.calls[0].items, []);
  });

  it('reviewerNote は前後の空白を落とし、空なら null', async () => {
    await saveApprovedTimestamps(deps, input({ reviewerNote: '  管理者打刻  ' }));
    assert.equal(deps.timestamps.calls[0].reviewerNote, '管理者打刻');
    await saveApprovedTimestamps(deps, input({ reviewerNote: '   ' }));
    assert.equal(deps.timestamps.calls[1].reviewerNote, null);
  });

  it('channelCode が main 以外なら弾く', async () => {
    await assert.rejects(
      () => saveApprovedTimestamps(deps, input({ channelCode: 'other' })),
      ValidationError,
    );
  });

  it('streamIndex が整数でなければ弾く', async () => {
    await assert.rejects(() => saveApprovedTimestamps(deps, input({ streamIndex: -1 })), ValidationError);
    await assert.rejects(() => saveApprovedTimestamps(deps, input({ streamIndex: 1.5 })), ValidationError);
  });

  it('items が配列でなければ弾く', async () => {
    await assert.rejects(() => saveApprovedTimestamps(deps, input({ items: null })), ValidationError);
  });

  it('songIndex が重複していれば弾く', async () => {
    await assert.rejects(
      () => saveApprovedTimestamps(deps, input({
        items: [{ songIndex: 0, timeSeconds: 10 }, { songIndex: 0, timeSeconds: 20 }],
      })),
      ValidationError,
    );
  });

  it('timeSeconds が範囲外なら弾く', async () => {
    await assert.rejects(
      () => saveApprovedTimestamps(deps, input({ items: [{ songIndex: 0, timeSeconds: -1 }] })),
      ValidationError,
    );
    await assert.rejects(
      () => saveApprovedTimestamps(deps, input({ items: [{ songIndex: 0, timeSeconds: 86401 }] })),
      ValidationError,
    );
  });

  it('件数が多すぎれば弾く', async () => {
    const items = Array.from({ length: 201 }, (_, i) => ({ songIndex: i, timeSeconds: i }));
    await assert.rejects(() => saveApprovedTimestamps(deps, input({ items })), ValidationError);
  });

  it('弾いたときはリポジトリを呼ばない', async () => {
    await assert.rejects(() => saveApprovedTimestamps(deps, input({ channelCode: 'x' })), ValidationError);
    assert.equal(deps.timestamps.calls.length, 0);
  });
});
