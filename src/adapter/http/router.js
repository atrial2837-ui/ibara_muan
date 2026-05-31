/**
 * @module adapter/http/router
 * @description 軽量 Web Standard Router。
 *
 * Web Standard Request → handler → Web Standard Response の dispatch を担う。
 * path param (:param) やワイルドカード (*) は Phase 4 では対象外。
 * path は文字列 (exact match) または RegExp のみ対応。
 *
 * @副作用 なし (dispatch 呼び出し時のみ I/O が起きる可能性あり)
 */

import { readJsonBody } from './read-json-body.js';
import { mapErrorToResponse } from './error-mapper.js';

/**
 * @typedef {object} RouteContext
 * @property {Request} request - Web Standard Request
 * @property {object} env - ランタイム別の環境変数オブジェクト (Cloudflare env / process.env ラッパー)
 * @property {URLSearchParams} query - URL クエリパラメーター
 * @property {typeof readJsonBody} readJson - readJsonBody ヘルパー (ctx に注入済み)
 */

/**
 * @typedef {object} RouteDefinition
 * @property {string} method - HTTP メソッド ('GET'|'POST'|'PUT'|'DELETE' など)
 * @property {string|RegExp} path - マッチ対象のパス (文字列は exact match、RegExp はテスト)
 * @property {(ctx: RouteContext) => Promise<Response>|Response} handler
 */

/**
 * 軽量 Web Standard Router。
 */
export class Router {
  constructor() {
    /** @type {RouteDefinition[]} */
    this.routes = [];
  }

  /**
   * ルートを登録する。
   *
   * @param {string} method
   * @param {string|RegExp} path
   * @param {(ctx: RouteContext) => Promise<Response>|Response} handler
   * @returns {this}
   */
  on(method, path, handler) {
    this.routes.push({ method: method.toUpperCase(), path, handler });
    return this;
  }

  /**
   * GET ルートを登録する。
   *
   * @param {string|RegExp} path
   * @param {(ctx: RouteContext) => Promise<Response>|Response} handler
   * @returns {this}
   */
  get(path, handler) {
    return this.on('GET', path, handler);
  }

  /**
   * POST ルートを登録する。
   *
   * @param {string|RegExp} path
   * @param {(ctx: RouteContext) => Promise<Response>|Response} handler
   * @returns {this}
   */
  post(path, handler) {
    return this.on('POST', path, handler);
  }

  /**
   * PUT ルートを登録する。
   *
   * @param {string|RegExp} path
   * @param {(ctx: RouteContext) => Promise<Response>|Response} handler
   * @returns {this}
   */
  put(path, handler) {
    return this.on('PUT', path, handler);
  }

  /**
   * DELETE ルートを登録する。
   *
   * @param {string|RegExp} path
   * @param {(ctx: RouteContext) => Promise<Response>|Response} handler
   * @returns {this}
   */
  delete(path, handler) {
    return this.on('DELETE', path, handler);
  }

  /**
   * Request を受け取り、登録済みルートにディスパッチする。
   * マッチするルートがない場合は 404 JSON を返す。
   * handler が throw した場合は error-mapper 経由でレスポンスに変換する。
   *
   * @param {Request} request - Web Standard Request
   * @param {object} [env={}] - ランタイム env オブジェクト
   * @returns {Promise<Response>}
   */
  async dispatch(request, env = {}) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = url.pathname;

    /** @type {RouteContext} */
    const ctx = {
      request,
      env,
      query: url.searchParams,
      readJson: readJsonBody,
    };

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const matched =
        route.path instanceof RegExp
          ? route.path.test(pathname)
          : route.path === pathname;

      if (!matched) continue;

      try {
        return await route.handler(ctx);
      } catch (error) {
        return mapErrorToResponse(error);
      }
    }

    // No matching route
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
