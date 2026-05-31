/**
 * @module stream/setlist-parser
 * @description セトリ行テキストの解析・クリーニング純粋関数。
 *
 * ## 既存実装の差分と Domain での選択
 *
 * 本 Domain 実装は以下 2 実装を統合したものである:
 *
 * ### functions/api/admin/[[path]].js:55-78 (正として採用)
 *   - `displayKey: cleanDisplayKey(parts[1] || '')` ← parseDisplayKey を通す
 *   - `genre:      cleanMetadata(parts[2] || '')`   ← センチネル除去あり
 *
 * ### admin-server/server.js:56-79 (既知バグあり)
 *   - `displayKey: normalize(parts[1] || '')`   ← cleanDisplayKey を通さない ⚠ バグ
 *   - `genre:      normalize(parts[2] || '')`   ← cleanMetadata を通さない ⚠ バグ
 *
 * **Domain の選択**: functions/api/admin/[[path]].js 版を正として採用。
 *   - displayKey に `parseDisplayKey` を必ず通す (admin-server バグ修正)。
 *   - genre に `cleanMetadata` を適用し、'#REF!' 等をセンチネル除去する。
 *   - これにより admin-server で `parseDisplayKey` を経由しない挙動 (例: 無効値
 *     'invalid_key' がそのまま displayKey に入る) が Domain では '' に修正される。
 *
 * ## セパレータ優先順序
 *   1. `' / '` (半角スラッシュ + 両端スペース)
 *   2. `'／'` (全角スラッシュ)
 *   3. `'/'`  (半角スラッシュ)
 *   ※ lastIndexOf で右端優先のため、アーティスト名中の '/' (例: 'Leo/need') を
 *     誤分割せず曲名とアーティストを正しく分離できる。
 *
 * 副作用禁止: fetch / DOM / fs / process / env / Date.now() の内部呼び出しゼロ。
 *
 * @see SoT 10_domain_candidates.md §4-3
 * @see SoT 04_data_model.md §4-7, §5-2
 * @see SoT 03_admin_server.md §8-6 (既知バグ: displayKey 非対称)
 */

import { normalize, cleanMetadata } from '../shared/text.js';
import { parseDisplayKey } from '../song/display-key.js';

/**
 * splitSongLine の解析結果。
 *
 * @typedef {object} ParsedSongLine
 * @property {string} title      - 正規化済み曲名。セパレータ未検出時は raw 全体。
 * @property {string} artist     - 正規化済みアーティスト名。セパレータ未検出時は ''。
 * @property {import('../song/display-key.js').DisplayKey} displayKey
 *   - parseDisplayKey を通した楽曲キー。無効値・未指定は ''。
 * @property {string} genre
 *   - cleanMetadata を通したジャンル文字列 (import('../song/genre.js').Genre | '')。
 *     Domain 内では Genre 列挙としての検証は行わない (推論は inferGenre で行う)。
 * @property {string} raw        - trim 後の入力テキストそのまま。
 */

/**
 * セトリ入力の 1 行を解析して ParsedSongLine を返す。
 *
 * ## 入力形式
 * ```
 * 基本形: "曲名 / アーティスト"
 * 拡張形: "曲名 / アーティスト | キー | ジャンル"
 * ```
 *
 * ## 処理手順
 *   1. `String(raw || '').trim()` で文字列化・前後空白除去。
 *   2. `'|'` でスプリット → `parts[0]` が曲情報、`parts[1]` がキー、`parts[2]` がジャンル。
 *   3. 曲情報を `[' / ', '／', '/']` の順に `lastIndexOf` で探索し、最初にヒットした
 *      セパレータの右端位置で title / artist に分割する。
 *   4. title / artist に `normalize` を適用。
 *   5. displayKey に `parseDisplayKey` を適用 (← admin-server バグ修正: normalize のみ → parseDisplayKey)。
 *   6. genre に `cleanMetadata` を適用 (← admin-server バグ修正: normalize のみ → cleanMetadata)。
 *
 * ## TODO (admin-server との差分)
 *   admin-server/server.js:56-79 の `splitSongLine` は `displayKey` と `genre` に
 *   `normalize` しか適用しない。Domain では `parseDisplayKey` / `cleanMetadata` を
 *   適用するため、以下のケースで挙動が異なる (= バグ修正):
 *   - displayKey に無効値 (例: 'invalid_key') → admin-server: 'invalid_key' のまま残る
 *                                                 Domain: '' に変換
 *   - displayKey に全角プラス '＋2' → admin-server: NFKC で '+2' になる場合もあるが
 *     先頭文字以外の '＋' は変換されないケースが混在する可能性あり
 *                                       Domain: parseDisplayKey が確実に正規化
 *   - genre にスプレッドシートセンチネル '#REF!' → admin-server: '#REF!' のまま残る
 *                                                   Domain: '' に変換
 *   admin-server を Domain 実装へ差し替えた際、これらの差異は「正しい方向への変更」
 *   (SoT 03_admin_server.md §8-6 で明示された既知バグ修正) として許容する。
 *
 * @param {unknown} raw - セトリの 1 行テキスト。null/undefined は空文字列として扱う。
 * @returns {ParsedSongLine} 解析結果。
 *
 * @example
 * splitSongLine('ステラ / Leo/need | 原キー | ゲーム・キャラソン')
 * // → { title: 'ステラ', artist: 'Leo/need', displayKey: '原キー', genre: 'ゲーム・キャラソン', raw: 'ステラ / Leo/need | 原キー | ゲーム・キャラソン' }
 *
 * @example
 * splitSongLine('曲名 / アーティスト | invalid_key | アニソン')
 * // → { title: '曲名', artist: 'アーティスト', displayKey: '', genre: 'アニソン', raw: '...' }
 */
export function splitSongLine(raw) {
  const text = String(raw == null ? '' : raw).trim();
  const parts = text.split('|').map((part) => part.trim());
  const songText = parts[0] || '';

  // セパレータを優先順序に従って lastIndexOf で探索
  // ' / ' → '／' → '/' の順。lastIndexOf により右端のセパレータを採用するため
  // アーティスト名中の '/' (例: 'Leo/need') を誤分割しない。
  for (const sep of [' / ', '／', '/']) {
    const index = songText.lastIndexOf(sep);
    if (index >= 0) {
      return {
        title: normalize(songText.slice(0, index)),
        artist: normalize(songText.slice(index + sep.length)),
        // TODO: admin-server/server.js:66 は normalize のみ (バグ)。Domain では parseDisplayKey を通す。
        displayKey: parseDisplayKey(parts[1] ?? ''),
        // TODO: admin-server/server.js:67 は normalize のみ (バグ)。Domain では cleanMetadata を通す。
        genre: cleanMetadata(parts[2] ?? ''),
        raw: text,
      };
    }
  }

  // セパレータ未検出: 全体を title として扱い artist は空文字
  return {
    title: normalize(songText),
    artist: '',
    // TODO: admin-server/server.js:75 は normalize のみ (バグ)。Domain では parseDisplayKey を通す。
    displayKey: parseDisplayKey(parts[1] ?? ''),
    // TODO: admin-server/server.js:76 は normalize のみ (バグ)。Domain では cleanMetadata を通す。
    genre: cleanMetadata(parts[2] ?? ''),
    raw: text,
  };
}

/**
 * コメントや旧チャンネルテキスト由来の 1 行から、曲行として不要な前置きを除去する。
 *
 * ## 除去対象
 *   - タイムスタンプ: `HH:MM` または `HH:MM:SS` 形式 (行頭・行中どちらも除去)
 *   - 行頭の番号付きリストマーク: `1.` `2.` 等 (`^\d+\.` 形式)
 *   - 行頭のリストマーク記号: `-` `・`
 *
 * ## 非対応 (将来課題)
 *   SoT §4-3 / SoT 04 §5-4 に記載の `old_ch_setlist_helper.py` との完全突合は
 *   将来課題とし、現状は最小実装にとどめる。
 *
 * @param {string} line - クリーニング対象の 1 行テキスト。
 * @returns {string} 除去後の文字列 (前後の空白も除去済み)。
 *
 * @example
 * cleanSongLine('00:01 ステラ / Leo/need')
 * // → 'ステラ / Leo/need'
 *
 * @example
 * cleanSongLine('1. One Last Kiss / 宇多田ヒカル')
 * // → 'One Last Kiss / 宇多田ヒカル'
 *
 * @example
 * cleanSongLine('- 曲名 / アーティスト')
 * // → '曲名 / アーティスト'
 */
export function cleanSongLine(line) {
  let result = String(line == null ? '' : line);

  // タイムスタンプ (HH:MM:SS または HH:MM) を除去
  // 例: "1:23:45 " "00:01 " など
  result = result.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*/g, '');

  // 行頭の番号付きリストマーク (例: "1. " "2. ")
  result = result.replace(/^\d+\.\s*/, '');

  // 行頭のリストマーク記号 (例: "- " "・")
  result = result.replace(/^[-・]\s*/, '');

  return result.trim();
}
