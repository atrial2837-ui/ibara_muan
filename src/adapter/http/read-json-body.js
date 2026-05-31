/**
 * @module adapter/http/read-json-body
 * @description Web Standard Request の body を JSON にパースするヘルパー。
 *
 * @副作用 なし (Request の body を消費するのみ)
 */

/**
 * Request body を JSON にパースする。
 * 空 body や不正 JSON の場合は null を返す (例外を投げない)。
 *
 * @param {Request} request - Web Standard Request
 * @returns {Promise<unknown|null>}
 */
export async function readJsonBody(request) {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
