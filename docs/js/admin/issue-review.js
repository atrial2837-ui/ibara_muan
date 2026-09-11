/**
 * @module admin/issue-review
 * @description 「確認が必要な項目」の確認済み管理。
 *
 * 指摘の中には直すべきでないものが混ざる。たとえば同一枠内重複は、
 * 実際にその枠で同じ曲を2回歌っていれば正しい記録であって誤りではない。
 * 毎回「要確認」に出続けると、本当に見るべき指摘が埋もれる。
 *
 * そこで指摘ごとに「確認済み」を付けられるようにし、既定では隠す。
 * 保存先はブラウザ（localStorage）。この画面の指摘は公開データから
 * その場で計算しているだけでサーバに持たないため、状態も手元に置く。
 *
 * @副作用 なし
 */

/**
 * 指摘を一意に指す文字列。
 * 種別・場所・内容の3つで決まる。データが直れば指摘自体が消えるので、
 * 「確認済みにしたのに別の問題が同じ鍵で隠れる」ことは起きない。
 *
 * @param {{type?:string, place?:string, detail?:string}} issue
 * @returns {string}
 */
export function issueKey(issue) {
  // 区切りは制御文字。種別や場所に空白や記号が入っても、別の指摘と鍵が衝突しない。
  return [issue?.type ?? '', issue?.place ?? '', issue?.detail ?? ''].join('\u001f');
}

/**
 * 確認済みとそれ以外に分ける。
 *
 * @param {{type?:string, place?:string, detail?:string}[]} issues
 * @param {Iterable<string>} ignoredKeys
 * @returns {{active:object[], ignored:object[]}}
 */
export function partitionIssues(issues, ignoredKeys) {
  const ignored = new Set(ignoredKeys || []);
  const out = { active: [], ignored: [] };
  for (const issue of issues || []) {
    (ignored.has(issueKey(issue)) ? out.ignored : out.active).push(issue);
  }
  return out;
}

/**
 * 種別ごとの件数。
 * @param {{type?:string}[]} issues
 * @returns {Record<string, number>}
 */
export function summarizeIssues(issues) {
  const out = {};
  for (const issue of issues || []) {
    const type = issue?.type ?? '';
    out[type] = (out[type] || 0) + 1;
  }
  return out;
}

/**
 * 確認済みを付け外しする。元の配列は変更しない。
 *
 * @param {string[]} ignoredKeys
 * @param {string} key
 * @returns {string[]}
 */
export function toggleIgnored(ignoredKeys, key) {
  const list = Array.isArray(ignoredKeys) ? ignoredKeys : [];
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

/**
 * いま存在しない指摘への確認済みを捨てる。
 * データを直したあとも古い鍵が残り続けると、あとで同じ内容が再発したときに
 * 黙って隠れてしまうため、読み込みのたびに掃除する。
 *
 * @param {string[]} ignoredKeys
 * @param {{type?:string, place?:string, detail?:string}[]} issues
 * @returns {string[]}
 */
export function pruneIgnored(ignoredKeys, issues) {
  const alive = new Set((issues || []).map(issueKey));
  return (Array.isArray(ignoredKeys) ? ignoredKeys : []).filter((k) => alive.has(k));
}
