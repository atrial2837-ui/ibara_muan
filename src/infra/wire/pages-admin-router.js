/**
 * @module infra/wire/pages-admin-router
 * @description Cloudflare Pages Functions 用 Admin Router の composition root。
 *
 * HTTP entrypoint から具体的な外部依存の組み立てを切り離し、
 * UseCase は Port 経由で実行されるようにする。
 */

import { buildAdminRouter } from '../../adapter/http/admin-router.js';
import { resolveAdminAuthStrict } from '../../adapter/http/resolve-admin-auth-strict.js';
import { jsonResponse } from '../../adapter/http/json-presenter.js';
import { FetchGitHubActionsGateway } from '../github/fetch-github-actions-gateway.js';
import { SystemClock } from '../clock/system-clock.js';
import { createD1WorkerDeps } from './d1-worker-deps.js';
import { triggerStaticBuild } from '../../usecase/trigger-static-build.js';

/**
 * @param {object} env
 * @returns {import('../../adapter/http/router.js').Router}
 */
export function createPagesAdminRouter(env) {
  return buildAdminRouter({
    pathPrefix: '',
    getDeps: (ctx) => createD1WorkerDeps(ctx.env),
    getAdminToken: (env) => env.ADMIN_TOKEN,
    authStrict: resolveAdminAuthStrict(env.ADMIN_AUTH_STRICT),
    staticDataHandler: async (ctx) => {
      const e = ctx.env;
      const github = new FetchGitHubActionsGateway({ token: e.GITHUB_ACTIONS_TOKEN || '' });
      const clock = new SystemClock();
      const result = await triggerStaticBuild(
        { github, clock },
        {
          owner: e.GITHUB_OWNER || 'atrial2837-ui',
          repo: e.GITHUB_REPO || 'ibara_muan',
          workflow: e.GITHUB_STATIC_WORKFLOW || 'update-static-data.yml',
          ref: e.GITHUB_STATIC_REF || 'main',
          environment: e.GITHUB_STATIC_ENV || 'production',
        },
      );
      return jsonResponse(result);
    },
  });
}
