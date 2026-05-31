/**
 * @module adapter/http/admin-auth-middleware
 * @description Router の handler を Admin 認証で包むヘルパー。
 *
 * Web Standard Request の `x-admin-token` ヘッダーを読み取り、
 * evaluateAdminAuth で認可判定を行う。
 * 不許可の場合は 401 JSON レスポンスを返す。
 *
 * @副作用 なし (handler 呼び出し時のみ I/O が起きる可能性あり)
 */

import { evaluateAdminAuth } from '../../domain/policy/admin-auth.js';
import { mapErrorToResponse } from './error-mapper.js';

/**
 * Router の handler を Admin 認証で包む。
 *
 * @param {(ctx: import('./router.js').RouteContext) => Promise<Response>|Response} handler
 * @param {(env: object) => string|null|undefined} expectedTokenGetter
 *   env から期待トークンを取得する関数。
 *   例: (env) => env.ADMIN_TOKEN  (Cloudflare Workers)
 *   例: (_env) => process.env.ADMIN_TOKEN  (Node.js admin-server)
 * @param {{ strict?: boolean }} [options]
 * @returns {(ctx: import('./router.js').RouteContext) => Promise<Response>}
 */
export function wrapWithAdminAuth(handler, expectedTokenGetter, options) {
  return async (ctx) => {
    const token = ctx.request.headers.get('x-admin-token');
    const expected = expectedTokenGetter(ctx.env);
    const decision = evaluateAdminAuth({ token }, expected, options);

    if (!decision.allowed) {
      const err = Object.assign(new Error(decision.reason ?? 'Unauthorized'), {
        status: 401,
      });
      return mapErrorToResponse(err);
    }

    return handler(ctx);
  };
}
