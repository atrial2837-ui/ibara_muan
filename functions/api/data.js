/**
 * @module functions/api/data
 * @description GET /api/data エントリポイント。
 */

import { buildDataset } from '../../src/usecase/build-dataset.js';
import { formatApiDataResponse } from '../../src/adapter/presenter/dataset-presenter.js';
import { jsonResponse } from '../../src/adapter/http/json-presenter.js';
import { mapErrorToResponse } from '../../src/adapter/http/error-mapper.js';
import { createD1WorkerDeps } from '../../src/infra/wire/d1-worker-deps.js';

/** @type {number} キャッシュ秒数 (README.md:129 参照) */
const CACHE_SECONDS = 60;

export async function onRequestGet({ env }) {
  if (!env.DB) return jsonResponse({ error: 'D1 binding DB is missing' }, 500);
  try {
    const deps = createD1WorkerDeps(env);
    const dataset = await buildDataset(deps);
    const body = formatApiDataResponse(dataset);
    return jsonResponse(body, 200, {
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
    });
  } catch (error) {
    return mapErrorToResponse(error);
  }
}
