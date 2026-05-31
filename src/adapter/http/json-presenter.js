/**
 * @module adapter/http/json-presenter
 * @description JSON HTTP レスポンス生成ヘルパー。
 * Cache-Control や CORS ヘッダーは呼び出し元の wrapper で付与すること。
 *
 * @副作用 なし (Web Standard Response を生成するのみ)
 */

/**
 * JSON レスポンスを生成する。
 *
 * @param {unknown} data - シリアライズ対象のデータ
 * @param {number} [status=200] - HTTP ステータスコード
 * @param {Record<string,string>} [headers={}] - 追加ヘッダー (Content-Type を上書き可能)
 * @returns {Response}
 */
export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}
