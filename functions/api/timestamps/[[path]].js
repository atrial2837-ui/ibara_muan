/**
 * @module functions/api/timestamps/[[path]]
 * @description コミュニティタイムスタンプ公開 API エントリポイント。
 *
 * Cloudflare Pages Functions のキャッチオール。
 * /api/timestamps/:channelCode/:streamIndex を処理する。
 *
 * CORS: GET・POST を許可。OPTIONS プリフライトはここで処理する。
 */

import { buildTimestampRouter } from '../../../src/adapter/http/timestamp-router.js';
import { createD1WorkerDeps } from '../../../src/infra/wire/d1-worker-deps.js';
import { mapErrorToResponse } from '../../../src/adapter/http/error-mapper.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
};

const router = buildTimestampRouter({
  getDeps: (ctx) => createD1WorkerDeps(ctx.env),
});

/**
 * @param {{ request: Request, env: object }} context
 */
export async function onRequest({ request, env }) {
  // CORS プリフライト
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'D1 binding DB is missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
    });
  }

  try {
    const response = await router.dispatch(request, env);
    // CORS ヘッダーをすべてのレスポンスに付与
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
    return new Response(response.body, {
      status:  response.status,
      headers,
    });
  } catch (error) {
    const res = mapErrorToResponse(error);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  }
}
