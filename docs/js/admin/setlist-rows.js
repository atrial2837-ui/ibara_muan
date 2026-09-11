/**
 * @module admin/setlist-rows
 * @description 管理画面のセトリ編集で使う、行データの純粋関数群。
 *
 * セトリは D1 側では `POST /streams/:id/setlist` に改行区切りテキストで渡す仕様
 * （src/usecase/replace-setlist.js が 1 行ずつ splitSongLine で解析する）。
 * 本モジュールはそのテキストと「行の配列」を相互変換し、並び替え・追加・削除を提供する。
 *
 * ## 行テキストの形式
 * ```
 * 曲名 / アーティスト
 * 曲名 / アーティスト | キー | ジャンル
 * ```
 *
 * ## 正規化しない理由
 * セパレータの探索順序は domain の splitSongLine と揃えてあるが、
 * normalize / parseDisplayKey は通さず入力された文字をそのまま保持する。
 * 編集中に見た目が勝手に書き換わるのを避けるためで、正規化は保存時に
 * サーバ側の splitSongLine が行う。
 *
 * 副作用禁止: DOM / fetch / localStorage を触らない（テスト可能に保つ）。
 */

/** domain/stream/setlist-parser.js と同じ優先順序。lastIndexOf で右端を採用する。 */
const SEPARATORS = [' / ', '／', '/'];

/**
 * セトリ1行分の編集データ。
 *
 * @typedef {object} SetlistRow
 * @property {string} title       - 曲名
 * @property {string} artist      - アーティスト名（未指定なら ''）
 * @property {string} displayKey  - キー（'+2' '原キー' など。未指定なら ''）
 * @property {string} genre       - ジャンル（未指定なら ''）
 */

/**
 * 空の行を作る。
 *
 * @returns {SetlistRow}
 */
export function emptySetlistRow() {
  return { title: '', artist: '', displayKey: '', genre: '' };
}

/**
 * セトリの1行テキストを SetlistRow に分解する（値は加工しない）。
 *
 * @param {unknown} line - 1行分のテキスト。
 * @returns {SetlistRow}
 *
 * @example
 * parseSetlistLine('ステラ / Leo/need | +2 | ゲーム・キャラソン')
 * // → { title: 'ステラ', artist: 'Leo/need', displayKey: '+2', genre: 'ゲーム・キャラソン' }
 */
export function parseSetlistLine(line) {
  const text = String(line == null ? '' : line).trim();
  const parts = text.split('|').map((part) => part.trim());
  const songText = parts[0] || '';
  const displayKey = parts[1] || '';
  const genre = parts[2] || '';

  for (const sep of SEPARATORS) {
    const index = songText.lastIndexOf(sep);
    if (index >= 0) {
      return {
        title: songText.slice(0, index).trim(),
        artist: songText.slice(index + sep.length).trim(),
        displayKey,
        genre,
      };
    }
  }
  return { title: songText, artist: '', displayKey, genre };
}

/**
 * SetlistRow を1行テキストへ戻す。末尾の空項目は省略する。
 *
 * @param {SetlistRow} row
 * @returns {string}
 *
 * @example
 * serializeSetlistLine({ title: '曲', artist: '歌手', displayKey: '', genre: '' })
 * // → '曲 / 歌手'
 */
export function serializeSetlistLine(row) {
  const title = String(row?.title ?? '').trim();
  const artist = String(row?.artist ?? '').trim();
  const displayKey = String(row?.displayKey ?? '').trim();
  const genre = String(row?.genre ?? '').trim();

  const song = artist ? `${title} / ${artist}` : title;
  // 「キーは空だがジャンルはある」ケースがあるため、後ろから空を削る形で組む
  const tail = [displayKey, genre];
  while (tail.length && !tail[tail.length - 1]) tail.pop();
  return [song, ...tail].join(' | ');
}

/**
 * 改行区切りのセトリテキストを行配列に変換する。空行は落とす。
 *
 * @param {unknown} text
 * @returns {SetlistRow[]}
 */
export function parseSetlistText(text) {
  return String(text == null ? '' : text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseSetlistLine);
}

/**
 * 行配列を改行区切りテキストへ戻す。曲名が空の行は落とす
 * （サーバ側で空行は弾かれるため、保存前にここで除いておく）。
 *
 * @param {SetlistRow[]} rows
 * @returns {string}
 */
export function serializeSetlistRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => String(row?.title ?? '').trim())
    .map(serializeSetlistLine)
    .join('\n');
}

/** 配列の範囲内に収める。 */
function clampIndex(index, length) {
  if (!Number.isFinite(index)) return -1;
  const i = Math.trunc(index);
  return i < 0 || i >= length ? -1 : i;
}

/**
 * 行を from から to へ移動した新しい配列を返す（元配列は変更しない）。
 * 範囲外や移動不要な場合は同じ内容の配列を返す。
 *
 * @param {SetlistRow[]} rows
 * @param {number} from - 移動元の位置（0始まり）
 * @param {number} to   - 移動先の位置（0始まり）
 * @returns {SetlistRow[]}
 */
export function moveSetlistRow(rows, from, to) {
  const list = Array.isArray(rows) ? [...rows] : [];
  const fromIndex = clampIndex(from, list.length);
  if (fromIndex < 0) return list;
  // to は「詰めた後に入る位置」。末尾への移動を許すため length まで受け付ける。
  const toIndex = Math.min(Math.max(Math.trunc(Number(to) || 0), 0), list.length - 1);
  if (fromIndex === toIndex) return list;

  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);
  return list;
}

/**
 * 行を削除した新しい配列を返す。
 *
 * @param {SetlistRow[]} rows
 * @param {number} index
 * @returns {SetlistRow[]}
 */
export function removeSetlistRow(rows, index) {
  const list = Array.isArray(rows) ? [...rows] : [];
  const i = clampIndex(index, list.length);
  if (i < 0) return list;
  list.splice(i, 1);
  return list;
}

/**
 * 行を挿入した新しい配列を返す。index を省略・範囲外にすると末尾に足す。
 *
 * @param {SetlistRow[]} rows
 * @param {number} [index]
 * @param {SetlistRow} [row]
 * @returns {SetlistRow[]}
 */
export function insertSetlistRow(rows, index, row) {
  const list = Array.isArray(rows) ? [...rows] : [];
  const at = Number.isFinite(index) ? Math.min(Math.max(Math.trunc(/** @type {number} */ (index)), 0), list.length) : list.length;
  list.splice(at, 0, row ? { ...emptySetlistRow(), ...row } : emptySetlistRow());
  return list;
}

/**
 * 1件の項目だけ差し替えた新しい配列を返す。
 *
 * @param {SetlistRow[]} rows
 * @param {number} index
 * @param {keyof SetlistRow} field
 * @param {string} value
 * @returns {SetlistRow[]}
 */
export function updateSetlistRow(rows, index, field, value) {
  const list = Array.isArray(rows) ? [...rows] : [];
  const i = clampIndex(index, list.length);
  if (i < 0) return list;
  list[i] = { ...list[i], [field]: String(value ?? '') };
  return list;
}
