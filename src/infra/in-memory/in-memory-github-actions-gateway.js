/**
 * @module infra/in-memory/in-memory-github-actions-gateway
 * @description GitHubActionsGateway Port の インメモリ実装。
 *
 * dispatchWorkflow の呼び出し履歴を `calls` 配列に記録する。
 * テストで呼び出し回数・引数を検証するために使用する。
 *
 * @副作用 なし (インスタンス内配列への追加のみ)
 */

/**
 * @typedef {import('../../domain/port/gateways/github-actions-gateway.js').GitHubActionsGateway} GitHubActionsGateway
 * @typedef {import('../../domain/port/gateways/github-actions-gateway.js').WorkflowDispatchInput} WorkflowDispatchInput
 */

/**
 * GitHubActionsGateway の インメモリ実装。
 *
 * @implements {GitHubActionsGateway}
 */
export class InMemoryGitHubActionsGateway {
  constructor() {
    /**
     * dispatchWorkflow に渡された引数の履歴。
     * @type {WorkflowDispatchInput[]}
     */
    this.calls = [];
  }

  /**
   * @param {WorkflowDispatchInput} input
   * @returns {Promise<void>}
   */
  async dispatchWorkflow(input) {
    this.calls.push({ ...input });
  }

  /**
   * 呼び出し履歴をリセットする (テスト用補助メソッド)。
   * @returns {void}
   */
  reset() {
    this.calls = [];
  }
}
