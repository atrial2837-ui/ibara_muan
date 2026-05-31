/**
 * @module domain/port/gateways/github-actions-gateway
 * @description GitHubActionsGateway Port (interface)。
 *
 * GitHub Actions の `workflow_dispatch` イベントを発火させる
 * 外部 I/O 操作を抽象化する。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:427-456 (triggerStaticDataWorkflow)
 *   - admin:434 `fetch('https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches', { method: 'POST' })`
 *   - admin:428-432 環境変数: GITHUB_ACTIONS_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_STATIC_WORKFLOW, GITHUB_STATIC_REF
 *   - SoT 02 §7-1 (GitHub Actions 外部副作用)
 *   - SoT 20 §4 (GitHubActionsGateway interface 例)
 *
 * 実装の所在 (Phase 2B 以降):
 *   - infra/github/ (fetch を使った実装、env 設定は infra 層で解決)
 *
 * @副作用 なし (typedef のみ)
 */

/**
 * GitHub Actions workflow_dispatch の発火パラメータ。
 *
 * @typedef {object} WorkflowDispatchInput
 * @property {string} owner    - GitHub オーナー (例: 'atrial2837-ui')
 * @property {string} repo     - リポジトリ名 (例: 'ibara_muan')
 * @property {string} workflow - ワークフローファイル名 (例: 'update-static-data.yml')
 * @property {string} ref      - ブランチ/タグ (例: 'main')
 * @property {Record<string, string>} [inputs] - workflow_dispatch inputs
 */

/**
 * GitHub Actions 操作の Port interface。
 *
 * @typedef {object} GitHubActionsGateway
 * @property {(input: WorkflowDispatchInput) => Promise<void>} dispatchWorkflow
 *   - 根拠: admin:434 `POST https://api.github.com/repos/.../actions/workflows/.../dispatches`
 *   - 発火成功時は void を返し、失敗時は Error を throw する
 *   - HTTP 204 以外は非 2xx エラーとして扱う (admin:451-455 のエラーハンドリング)
 */

export {};
