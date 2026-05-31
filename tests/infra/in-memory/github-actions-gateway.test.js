/**
 * @file tests/infra/in-memory/github-actions-gateway.test.js
 * @description InMemoryGitHubActionsGateway の単独テスト。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryGitHubActionsGateway } from '../../../src/infra/in-memory/in-memory-github-actions-gateway.js';

/** @type {import('../../../src/domain/port/gateways/github-actions-gateway.js').WorkflowDispatchInput} */
const INPUT = {
  owner: 'atrial2837-ui',
  repo: 'ibara_muan',
  workflow: 'update-static-data.yml',
  ref: 'main',
};

test('InMemoryGitHubActionsGateway: 初期状態は calls が空', () => {
  const gw = new InMemoryGitHubActionsGateway();
  assert.deepEqual(gw.calls, []);
});

test('InMemoryGitHubActionsGateway: dispatchWorkflow は呼び出し履歴を記録する', async () => {
  const gw = new InMemoryGitHubActionsGateway();
  await gw.dispatchWorkflow(INPUT);
  assert.equal(gw.calls.length, 1);
  assert.deepEqual(gw.calls[0], INPUT);
});

test('InMemoryGitHubActionsGateway: 複数回呼ぶと複数の履歴が記録される', async () => {
  const gw = new InMemoryGitHubActionsGateway();
  await gw.dispatchWorkflow(INPUT);
  await gw.dispatchWorkflow({ ...INPUT, ref: 'develop' });
  assert.equal(gw.calls.length, 2);
  assert.equal(gw.calls[1].ref, 'develop');
});

test('InMemoryGitHubActionsGateway: dispatchWorkflow は Promise<void> を返す', async () => {
  const gw = new InMemoryGitHubActionsGateway();
  const result = await gw.dispatchWorkflow(INPUT);
  assert.equal(result, undefined);
});

test('InMemoryGitHubActionsGateway: reset() で呼び出し履歴がクリアされる', async () => {
  const gw = new InMemoryGitHubActionsGateway();
  await gw.dispatchWorkflow(INPUT);
  gw.reset();
  assert.deepEqual(gw.calls, []);
});

test('InMemoryGitHubActionsGateway: 記録された引数はコピーなので後から変更しても影響しない', async () => {
  const gw = new InMemoryGitHubActionsGateway();
  const input = { ...INPUT };
  await gw.dispatchWorkflow(input);
  input.ref = 'mutated';
  assert.equal(gw.calls[0].ref, 'main'); // コピーなので変化しない
});
