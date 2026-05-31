/**
 * @module domain/search/query-parser
 * @description 検索クエリの field:value フィルタ解析。
 *
 * 既存: docs/js/search.js:52-66
 * @副作用 なし
 */

/** @type {RegExp} */
export const FIELD_FILTER_RE = /(?<key>title|artist|genre|tag|mood|season|key|count|last|days)\s*(?<op>:|<=|>=|=|<|>)\s*(?<val>"[^"]*"|\S+)/gi;

/**
 * @typedef {object} FieldFilter
 * @property {string} key
 * @property {string} op
 * @property {string} val
 */

/**
 * @typedef {object} SearchQuery
 * @property {string[]} tokens
 * @property {FieldFilter[]} filters
 */

/**
 * @param {string} raw
 * @returns {SearchQuery}
 */
export function parseQuery(raw) {
  /** @type {FieldFilter[]} */
  const filters = [];
  let rest = raw;
  rest = rest.replace(FIELD_FILTER_RE, (_m, key, op, val) => {
    let v = val;
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    filters.push({ key: key.toLowerCase(), op: op || ':', val: v });
    return ' ';
  });
  rest = rest.trim().replace(/\s+/g, ' ');
  const tokens = rest ? rest.split(' ') : [];
  return { tokens, filters };
}
