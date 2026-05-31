/**
 * @module adapter/http/admin-router
 * @description Admin API ルート定義の共有ビルダー。
 *
 * Cloudflare Pages Functions と admin-server が同じルート定義を使う。
 * 差分は pathPrefix と static-data ハンドラのみ。
 */

import { Router } from './router.js';
import { wrapWithAdminAuth } from './admin-auth-middleware.js';
import { jsonResponse } from './json-presenter.js';
import { readJsonBody } from './read-json-body.js';

import { previewStream } from '../../usecase/preview-stream.js';
import { addStream } from '../../usecase/add-stream.js';
import { searchSongs } from '../../usecase/search-songs.js';
import { saveSongMetadata } from '../../usecase/save-song-metadata.js';
import { syncKeyReferenceCsv } from '../../usecase/sync-key-reference-csv.js';
import { syncKeyReferenceUrl } from '../../usecase/sync-key-reference-url.js';
import { loadAdminStatus } from '../../usecase/load-admin-status.js';

/**
 * @typedef {import('./router.js').RouteContext} RouteContext
 * @typedef {import('../../usecase/add-stream.js').AddStreamDeps} AdminDeps
 */

/**
 * @typedef {object} BuildAdminRouterOptions
 * @property {string} [pathPrefix=''] - ルート prefix ('' = CF, '/api' = admin-server)
 * @property {(ctx: RouteContext) => AdminDeps} getDeps
 * @property {(env: object) => string|null|undefined} getAdminToken
 * @property {boolean} [authStrict=false]
 * @property {(ctx: RouteContext) => Promise<Response>|Response} staticDataHandler
 * @property {boolean} [includeIndexPage=false]
 * @property {() => string} [renderIndexPage]
 */

/**
 * Admin API Router を構築する。
 *
 * @param {BuildAdminRouterOptions} options
 * @returns {Router}
 */
export function buildAdminRouter(options) {
  const {
    pathPrefix = '',
    getDeps,
    getAdminToken,
    authStrict = false,
    staticDataHandler,
    includeIndexPage = false,
    renderIndexPage,
  } = options;

  const router = new Router();
  const p = (path) => `${pathPrefix}${path}`;
  const auth = (handler) => wrapWithAdminAuth(handler, getAdminToken, { strict: authStrict });

  router.get(p('/health'), auth(async (ctx) => {
    const hasDb = !!ctx.env?.DB;
    return jsonResponse({ ok: true, ...(pathPrefix ? {} : { db: hasDb }) });
  }));

  router.get(p('/status'), auth(async (ctx) => {
    const deps = getDeps(ctx);
    const result = await loadAdminStatus(deps);
    return jsonResponse(result);
  }));

  router.get(p('/channels'), auth(async (ctx) => {
    const deps = getDeps(ctx);
    const channels = await deps.channels.findAll();
    return jsonResponse({ channels });
  }));

  router.get(p('/songs/search'), auth(async (ctx) => {
    const deps = getDeps(ctx);
    const result = await searchSongs(deps, {
      query: ctx.query.get('q') || '',
      limit: 80,
    });
    return jsonResponse(result);
  }));

  router.post(p('/preview-stream'), auth(async (ctx) => {
    const body = (await readJsonBody(ctx.request)) || {};
    const result = await previewStream(getDeps(ctx), body);
    return jsonResponse(result);
  }));

  router.post(p('/streams'), auth(async (ctx) => {
    const body = (await readJsonBody(ctx.request)) || {};
    const result = await addStream(getDeps(ctx), body);
    return jsonResponse(result);
  }));

  router.post(p('/songs/metadata'), auth(async (ctx) => {
    const body = (await readJsonBody(ctx.request)) || {};
    await saveSongMetadata(getDeps(ctx), body);
    return jsonResponse({ ok: true });
  }));

  router.post(p('/key-reference/import-csv'), auth(async (ctx) => {
    const body = (await readJsonBody(ctx.request)) || {};
    const result = await syncKeyReferenceCsv(getDeps(ctx), body);
    return jsonResponse(result);
  }));

  router.post(p('/key-reference/sync-url'), auth(async (ctx) => {
    const body = (await readJsonBody(ctx.request)) || {};
    const url = body.url || ctx.env?.KEY_REFERENCE_CSV_URL || '';
    const result = await syncKeyReferenceUrl(getDeps(ctx), { url });
    return jsonResponse(result);
  }));

  router.post(p('/static-data/generate'), auth(staticDataHandler));

  if (includeIndexPage && renderIndexPage) {
    router.get('/', async () =>
      new Response(renderIndexPage(), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }),
    );
  }

  return router;
}
