/**
 * @module domain/stream/url-key
 * @description 歌枠の重複判定キー (streams.url_key) の生成ロジック。
 *
 * UNIQUE(channel_id, streamed_on, url_key) の一部として使う。
 * URL があればそれ自体が一意キー、なければ "channelCode:streamedOn:title" で代用する。
 * (usecase/add-stream.js 内の同名ローカル関数と同一仕様)
 *
 * @副作用 なし (純粋関数)
 */

/**
 * URLキーを生成する。
 *
 * @param {string} url - 正規化済み URL (空文字の場合あり)
 * @param {string} channelCode - チャンネルコード
 * @param {string} streamedOn - YYYY-MM-DD
 * @param {string} title - 正規化済みタイトル
 * @returns {string}
 */
export function buildUrlKey(url, channelCode, streamedOn, title) {
  return url || `${channelCode}:${streamedOn}:${title}`;
}
