import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { getTimestampCoverage } from '../../../src/usecase/timestamp/get-timestamp-coverage.js';
import { ValidationError } from '../../../src/domain/error/validation-error.js';

function fakeRepo(rows) {
  return {
    calls: [],
    async countApprovedByChannel(channelCode) {
      this.calls.push(channelCode);
      return rows;
    },
  };
}

describe('getTimestampCoverage', () => {
  let deps;
  beforeEach(() => {
    deps = { timestamps: fakeRepo([{ streamIndex: 160, count: 24 }, { streamIndex: 177, count: 26 }]) };
  });

  it('枠番号から曲数を引ける形にして返す', async () => {
    const coverage = await getTimestampCoverage(deps, { channelCode: 'main' });
    assert.deepEqual(coverage, { 160: 24, 177: 26 });
  });

  it('チャンネルをリポジトリへ渡す', async () => {
    await getTimestampCoverage(deps, { channelCode: 'main' });
    assert.deepEqual(deps.timestamps.calls, ['main']);
  });

  it('1件も無ければ空オブジェクト', async () => {
    deps.timestamps = fakeRepo([]);
    assert.deepEqual(await getTimestampCoverage(deps, { channelCode: 'main' }), {});
  });

  it('null が返っても壊れない', async () => {
    deps.timestamps = fakeRepo(null);
    assert.deepEqual(await getTimestampCoverage(deps, { channelCode: 'main' }), {});
  });

  it('枠番号が整数でない行は捨てる', async () => {
    deps.timestamps = fakeRepo([{ streamIndex: NaN, count: 3 }, { streamIndex: 1, count: 2 }]);
    assert.deepEqual(await getTimestampCoverage(deps, { channelCode: 'main' }), { 1: 2 });
  });

  it('channelCode が main 以外なら弾く', async () => {
    await assert.rejects(() => getTimestampCoverage(deps, { channelCode: 'other' }), ValidationError);
    await assert.rejects(() => getTimestampCoverage(deps, { channelCode: undefined }), ValidationError);
  });
});
