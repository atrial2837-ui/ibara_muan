/**
 * @module usecase/trigger-static-build
 * @description GitHub Actions workflow_dispatch を発火させる UseCase。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:427-456 (triggerStaticDataWorkflow)
 *   - admin-server/server.js (同等部分)
 *   - SoT 02 §7-1 (GitHub Actions 外部副作用)
 *
 * @副作用 あり (GitHub API に POST)
 */

import { ValidationError } from '../domain/error/validation-error.js';

/**
 * @typedef {object} TriggerStaticBuildDeps
 * @property {import('../domain/port/gateways/github-actions-gateway.js').GitHubActionsGateway} github
 * @property {import('../domain/port/clock.js').Clock} clock
 */

/**
 * @typedef {object} TriggerStaticBuildInput
 * @property {string} owner   - GitHub リポジトリオーナー
 * @property {string} repo    - リポジトリ名
 * @property {string} workflow - ワークフローファイル名 (例: 'update-static-data.yml')
 * @property {string} ref     - ブランチ/タグ (例: 'main')
 * @property {string} [environment] - 静的データ生成対象環境 (production / staging)
 */

/**
 * @typedef {object} TriggerStaticBuildResult
 * @property {boolean} ok - 常に true
 * @property {string} owner
 * @property {string} repo
 * @property {string} workflow
 * @property {string} ref
 * @property {string} environment
 * @property {string} requestedAt - ISO8601 文字列
 */

/**
 * GitHub Actions workflow_dispatch を発火させる。
 *
 * admin:427-456 の triggerStaticDataWorkflow と同じロジック。
 * 入力検証 → deps.github.dispatchWorkflow → 結果を返す。
 *
 * @param {TriggerStaticBuildDeps} deps
 * @param {TriggerStaticBuildInput} input
 * @returns {Promise<TriggerStaticBuildResult>}
 * @throws {ValidationError} 必須入力が欠落している場合
 * @throws {Error} GitHub API エラー (dispatchWorkflow が throw する)
 */
export async function triggerStaticBuild(deps, input) {
  // 入力検証
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
  const requestedAt = deps.clock.now().toISOString();

  // GitHub Actions gateway を呼び出し
  await deps.github.dispatchWorkflow({
    owner: input.owner,
    repo: input.repo,
    workflow: input.workflow,
    ref: input.ref,
    inputs: {
      source: 'cloudflare-admin',
      requested_at: requestedAt,
      environment,
    },
  });

  // 成功を返す (admin:455 と互換)
  return {
    ok: true,
    owner: input.owner,
    repo: input.repo,
    workflow: input.workflow,
    ref: input.ref,
    environment,
    requestedAt,
  };
}
