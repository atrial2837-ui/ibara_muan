/**
 * @module usecase/trigger-auto-update
 * @description YouTube自動更新の GitHub Actions workflow_dispatch を発火させる UseCase。
 *
 * trigger-static-build.js と同型。対象ワークフローが auto-update.yml で、
 * mode / min_timestamps の入力を受け付ける点だけが異なる。
 *
 * @副作用 あり (GitHub API に POST)
 */

import { ValidationError } from '../domain/error/validation-error.js';
import { DEFAULT_AUTO_MIN_TIMESTAMPS } from '../domain/auto-update/classify.js';

/**
 * @typedef {object} TriggerAutoUpdateDeps
 * @property {import('../domain/port/gateways/github-actions-gateway.js').GitHubActionsGateway} github
 * @property {import('../domain/port/clock.js').Clock} clock
 */

/**
 * @typedef {object} TriggerAutoUpdateInput
 * @property {string} owner - GitHub リポジトリオーナー
 * @property {string} repo - リポジトリ名
 * @property {string} workflow - ワークフローファイル名 (例: 'auto-update.yml')
 * @property {string} ref - ブランチ/タグ (例: 'main')
 * @property {string} [environment] - 対象環境 (production / staging)
 * @property {string} [mode] - 実行モード (full / scan-only)
 * @property {number|string} [minTimestamps] - セトリ自動採用に必要なタイムスタンプ数
 */

/**
 * @typedef {object} TriggerAutoUpdateResult
 * @property {boolean} ok - 常に true
 * @property {string} owner
 * @property {string} repo
 * @property {string} workflow
 * @property {string} ref
 * @property {string} environment
 * @property {string} mode
 * @property {number} minTimestamps
 * @property {string} requestedAt - ISO8601 文字列
 */

const MODES = ['full', 'scan-only'];

/**
 * YouTube自動更新 workflow_dispatch を発火させる。
 *
 * @param {TriggerAutoUpdateDeps} deps
 * @param {TriggerAutoUpdateInput} input
 * @returns {Promise<TriggerAutoUpdateResult>}
 * @throws {ValidationError} 入力が不正な場合
 * @throws {Error} GitHub API エラー (dispatchWorkflow が throw する)
 */
export async function triggerAutoUpdate(deps, input) {
  if (!input.owner || typeof input.owner !== 'string') {
    throw new ValidationError('owner は空でない文字列である必要があります');
  }
  if (!input.repo || typeof input.repo !== 'string') {
    throw new ValidationError('repo は空でない文字列である必要があります');
  }
  if (!input.workflow || typeof input.workflow !== 'string') {
    throw new ValidationError('workflow は空でない文字列である必要があります');
  }
  if (!input.ref || typeof input.ref !== 'string') {
    throw new ValidationError('ref は空でない文字列である必要があります');
  }

  const environment = typeof input.environment === 'string' && input.environment
    ? input.environment
    : 'production';

  const mode = typeof input.mode === 'string' && input.mode ? input.mode : 'full';
  if (!MODES.includes(mode)) {
    throw new ValidationError(`mode は ${MODES.join(' / ')} のいずれかである必要があります`);
  }

  const minTimestamps = Number(input.minTimestamps ?? DEFAULT_AUTO_MIN_TIMESTAMPS);
  if (!Number.isInteger(minTimestamps) || minTimestamps < 1) {
    throw new ValidationError('minTimestamps は1以上の整数である必要があります');
  }

  const requestedAt = deps.clock.now().toISOString();

  await deps.github.dispatchWorkflow({
    owner: input.owner,
    repo: input.repo,
    workflow: input.workflow,
    ref: input.ref,
    inputs: {
      source: 'cloudflare-admin',
      requested_at: requestedAt,
      environment,
      mode,
      min_timestamps: String(minTimestamps),
    },
  });

  return {
    ok: true,
    owner: input.owner,
    repo: input.repo,
    workflow: input.workflow,
    ref: input.ref,
    environment,
    mode,
    minTimestamps,
    requestedAt,
  };
}
