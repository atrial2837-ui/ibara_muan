/**
 * 曲リクエストのステータスバッジ。
 *
 * 運営が管理画面で設定した状態をユーザーに見せる。
 * 未設定（unregistered）は「まだ確認していない」状態なのでバッジを出さない
 * ＝ 何か表示があるものだけが「運営が確認済み」だと一目で分かるようにする。
 *
 * DOM に触らない純粋関数（テスト可能にするため views/requests.js から分離）。
 */

import { escapeHtml } from '../../utils.js';

/** @type {Record<string, {label: string, cls: string, hint: string}>} */
export const STATUS_LABELS = {
  singable:   { label: '歌える曲', cls: 'req-status--singable',   hint: 'レパートリーに入っています' },
  practicing: { label: '練習中',   cls: 'req-status--practicing', hint: '歌えるように練習しています' },
};

/**
 * ステータスに対応するバッジ HTML を返す。
 * 対応するラベルが無い場合（unregistered / 未知の値 / 空）は空文字。
 *
 * @param {string|null|undefined} status
 * @returns {string}
 */
export function statusBadge(status) {
  const s = STATUS_LABELS[status];
  if (!s) return '';
  return `<span class="req-status ${s.cls}" title="${escapeHtml(s.hint)}">${escapeHtml(s.label)}</span>`;
}
