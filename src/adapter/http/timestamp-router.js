/**
 * @module adapter/http/timestamp-router
 * @description コミュニティタイムスタンプ公開 API のルート定義。
 *
 * エンドポイント:
 *   GET  /api/timestamps/:channelCode/:streamIndex  → 承認済みタイムスタンプ一覧
 *   POST /api/timestamps/:channelCode/:streamIndex  → タイムスタンプ提案を投稿
 *
 * 呼び出し元 (Pages Functions) が CORS プリフライト (OPTIONS) を処理する。
 */

import { Router } from './router.js';
import { jsonResponse } from './json-presenter.js';
import { readJsonBody } from './read-json-body.js';
import { getApprovedTimestamps } from '../../usecase/timestamp/get-approved-timestamps.js';
import { submitTimestamp } from '../../usecase/timestamp/submit-timestamp.js';

/** `/api/timestamps/new/0` のようなパスにマッチ */
const PATH_RE = /^\/api\/timestamps\/([^/]+)\/(\d+)$/;

/**
 * @param {object} options
 * @param {(ctx: import('./router.js').RouteContext) => object} options.getDeps
 * @returns {Router}
 */
export function buildTimestampRouter({ getDeps }) {
  const router = new Router();

  /** 承認済みタイムスタンプ取得 */
  router.get(PATH_RE, async (ctx) => {
    const url = new URL(ctx.request.url);
    const m = PATH_RE.exec(url.pathname);
    const channelCode = m[1];
    const streamIndex = Number(m[2]);

    const deps = getDeps(ctx);
    const items = await getApprovedTimestamps(deps, { channelCode, streamIndex });

    return jsonResponse({ items: items.map(toPublic) });
  });

  /** タイムスタンプ提案投稿 */
  router.post(PATH_RE, async (ctx) => {
    const url = new URL(ctx.request.url);
    const m = PATH_RE.exec(url.pathname);
    const channelCode = m[1];
    const streamIndex = Number(m[2]);

    const body = (await readJsonBody(ctx.request)) || {};
    const deps = getDeps(ctx);
    const created = await submitTimestamp(deps, {
      channelCode,
      streamIndex,
      songIndex:     Number(body.songIndex),
      timeSeconds:   Number(body.timeSeconds),
      submitterNote: body.submitterNote ?? null,
    });

    return jsonResponse({ ok: true, id: created.id }, 201);
  });

  return router;
}

/**
 * TimestampSubmission → public JSON shape。
 * 投稿者のプライバシーを保護するため submitter_note のみ公開。
 *
 * @param {import('../../domain/timestamp/timestamp-submission.js').TimestampSubmission} ts
 */
function toPublic(ts) {
  return {
    id:          ts.id,
    songIndex:   ts.songIndex,
    timeSeconds: ts.timeSeconds,
    note:        ts.submitterNote,
  };
}
