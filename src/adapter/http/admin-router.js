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
import { listStreams } from '../../usecase/list-streams.js';
import { updateStreamDate } from '../../usecase/update-stream-date.js';
import { updateStreamInfo } from '../../usecase/update-stream-info.js';
import { replaceSetlist } from '../../usecase/replace-setlist.js';
import { searchSongs } from '../../usecase/search-songs.js';
import { saveSongMetadata } from '../../usecase/save-song-metadata.js';
import { syncKeyReferenceCsv } from '../../usecase/sync-key-reference-csv.js';
import { syncKeyReferenceUrl } from '../../usecase/sync-key-reference-url.js';
import { loadAdminStatus } from '../../usecase/load-admin-status.js';
import { listTimestampSubmissions } from '../../usecase/timestamp/list-timestamp-submissions.js';
import { reviewTimestamp } from '../../usecase/timestamp/review-timestamp.js';
import { getApprovedTimestamps } from '../../usecase/timestamp/get-approved-timestamps.js';
import { getTimestampCoverage } from '../../usecase/timestamp/get-timestamp-coverage.js';
import { saveApprovedTimestamps } from '../../usecase/timestamp/save-approved-timestamps.js';

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
 * @property {(ctx: RouteContext) => Promise<Response>|Response} [autoUpdateHandler]
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
    autoUpdateHandler,
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

  router.get(p('/streams'), auth(async (ctx) => {
    const result = await listStreams(getDeps(ctx), {
      channelCode: ctx.query.get('channelCode') || ctx.query.get('channel') || '',
      limit: Number(ctx.query.get('limit')) || 100,
    });
    return jsonResponse(result);
  }));

  router.post(p('/streams'), auth(async (ctx) => {
    const body = (await readJsonBody(ctx.request)) || {};
    const result = await addStream(getDeps(ctx), body);
    return jsonResponse(result);
  }));

  /** 歌枠セトリ取得 (raw_text を改行結合したテキストで返す) */
  router.get(/^(?:.*\/)?streams\/(\d+)\/songs$/, auth(async (ctx) => {
    const deps = getDeps(ctx);
    const m = new URL(ctx.request.url).pathname.match(/\/streams\/(\d+)\/songs$/);
    const streamId = Number(m[1]);
    const stream = await deps.streams.findById(streamId);
    if (!stream) return jsonResponse({ error: 'Not Found' }, 404);
    const songs = await deps.streamSongs.findByStreamId(streamId);
    const songsText = songs
      .map((s) => s.raw_text || [s.title_snapshot, s.artist_snapshot].filter(Boolean).join(' / '))
      .join('\n');
    return jsonResponse({ stream, songsText, songs });
  }));

  /** 歌枠メタ情報更新 (title / url / streamed_on / source_index のみ) */
  router.post(/^(?:.*\/)?streams\/(\d+)$/, auth(async (ctx) => {
    const deps = getDeps(ctx);
    const m = new URL(ctx.request.url).pathname.match(/\/streams\/(\d+)$/);
    const body = (await readJsonBody(ctx.request)) || {};
    const result = await updateStreamInfo(deps, { streamId: Number(m[1]), ...body });
    return jsonResponse(result);
  }));

  /** セトリ全置換 */
  router.post(/^(?:.*\/)?streams\/(\d+)\/setlist$/, auth(async (ctx) => {
    const deps = getDeps(ctx);
    const m = new URL(ctx.request.url).pathname.match(/\/streams\/(\d+)\/setlist$/);
    const body = (await readJsonBody(ctx.request)) || {};
    const result = await replaceSetlist(deps, { streamId: Number(m[1]), ...body });
    return jsonResponse(result);
  }));

  /** 配信日の変更 — path は Pages Function により書き換え済み: /streams/:id/date */
  router.post(/^(?:.*\/)?streams\/(\d+)\/date$/, auth(async (ctx) => {
    const url = new URL(ctx.request.url);
    const m = url.pathname.match(/\/streams\/(\d+)\/date$/);
    const body = (await readJsonBody(ctx.request)) || {};
    const result = await updateStreamDate(getDeps(ctx), {
      streamId: Number(m[1]),
      streamedOn: body.streamedOn,
    });
    return jsonResponse({ ok: true, ...result });
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

  if (autoUpdateHandler) {
    router.post(p('/auto-update/trigger'), auth(autoUpdateHandler));
  }

  // ─── コミュニティタイムスタンプ管理 ──────────────────────────────────────

  /** 一覧取得 (status クエリ: pending|approved|rejected|省略=全件) */
  router.get(p('/timestamps'), auth(async (ctx) => {
    const deps = getDeps(ctx);
    const status = ctx.query.get('status') || null;
    const page   = Number(ctx.query.get('page'))  || 1;
    const limit  = Number(ctx.query.get('limit'))  || 50;
    const result = await listTimestampSubmissions(deps, { status, page, limit });
    return jsonResponse({
      items: result.items.map(tsToJson),
      total: result.total,
      page:  result.page,
      limit: result.limit,
    });
  }));

  /** 承認 / 却下 — path は Pages Function により書き換え済み: /timestamps/:id/approve */
  router.post(/^(?:.*\/)?timestamps\/(\d+)\/(approve|reject)$/, auth(async (ctx) => {
    const deps = getDeps(ctx);
    const url = new URL(ctx.request.url);
    const m = url.pathname.match(/\/timestamps\/(\d+)\/(approve|reject)$/);
    const id     = Number(m[1]);
    const action = m[2] === 'approve' ? 'approved' : 'rejected';
    const body   = (await readJsonBody(ctx.request)) || {};
    const updated = await reviewTimestamp(deps, {
      id,
      action,
      reviewerNote: body.reviewerNote ?? null,
    });
    return jsonResponse({ ok: true, item: tsToJson(updated) });
  }));

  /** 削除 — path は Pages Function により書き換え済み: /timestamps/:id */
  router.delete(/^(?:.*\/)?timestamps\/(\d+)$/, auth(async (ctx) => {
    const deps = getDeps(ctx);
    const url = new URL(ctx.request.url);
    const m = url.pathname.match(/\/timestamps\/(\d+)$/);
    const id = Number(m[1]);
    await deps.timestamps.delete(id);
    return jsonResponse({ ok: true });
  }));

  /** 打刻ツール用: 1枠ぶんをまとめて承認済みで保存（既存の承認済みは置き換え） */
  router.post(p('/timestamps/bulk'), auth(async (ctx) => {
    const deps = getDeps(ctx);
    const body = (await readJsonBody(ctx.request)) || {};
    const result = await saveApprovedTimestamps(deps, {
      channelCode:  body.channelCode,
      streamIndex:  Number(body.streamIndex),
      items:        body.items,
      reviewerNote: body.reviewerNote ?? null,
    });
    return jsonResponse({ ok: true, count: result.count });
  }));

  /** 打刻ツール用: 枠ごとの登録済み曲数（プルダウンに済/未を出すため） */
  router.get(p('/timestamps/coverage'), auth(async (ctx) => {
    const deps = getDeps(ctx);
    const coverage = await getTimestampCoverage(deps, {
      channelCode: ctx.query.get('channelCode'),
    });
    return jsonResponse({ coverage });
  }));

  /** 打刻ツール用: 打ち直しのために既存の承認済みを読み戻す */
  router.get(p('/timestamps/approved'), auth(async (ctx) => {
    const deps = getDeps(ctx);
    const items = await getApprovedTimestamps(deps, {
      channelCode: ctx.query.get('channelCode'),
      streamIndex: Number(ctx.query.get('streamIndex')),
    });
    return jsonResponse({
      items: items.map((ts) => ({ songIndex: ts.songIndex, timeSeconds: ts.timeSeconds })),
    });
  }));

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

/**
 * @param {import('../../domain/timestamp/timestamp-submission.js').TimestampSubmission} ts
 */
function tsToJson(ts) {
  return {
    id:            ts.id,
    channelCode:   ts.channelCode,
    streamIndex:   ts.streamIndex,
    songIndex:     ts.songIndex,
    timeSeconds:   ts.timeSeconds,
    status:        ts.status,
    submitterNote: ts.submitterNote,
    createdAt:     ts.createdAt,
    reviewedAt:    ts.reviewedAt,
    reviewerNote:  ts.reviewerNote,
  };
}
