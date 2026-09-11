/**
 * @module domain/auto-update/comment-label
 * @description コメント欄セトリのラベルをサイト表記に寄せるクリーニング(純粋関数)。
 *
 * 背景:
 *   washing対象チャンネルのセトリコメントは「01. レオ[Leo] / 優里」のように
 *   曲名へローマ字読みが [...] で付く記法が多い。一方サイトの正規表記は
 *   読み仮名なし(「レオ」)であり、タイトルに `[` を含む曲は0件。
 *   そのまま登録すると「レオ[Leo]」が別曲として新規作成され、表記ゆれが増える。
 *   addStream 内の resolveExistingSong は完全一致/タイトル一致で既存曲を使うため、
 *   事前に読み仮名を落とせば exact/title マッチで正規表記に寄せられる。
 *
 * 方針:
 *   - `[...]` / `［...］` のうち中身が ASCII のみ(ローマ字読み)のものを除去する。
 *     日本語を含む [...] は意味を持つ可能性があるため残す。
 *   - 曲末の「。」はサイトにも 16 件存在する正規表記のため残す。
 *   - アーティスト側も同じ処理でよい(サイトのアーティスト名に [...] は無い)。
 *
 * @副作用 なし (純粋関数)
 */

/** ローマ字読みの [...] / ［...］にマッチする(ASCII + 長音マクロンōū等。日本語混じりは対象外) */
const READING_BRACKET_RE = /[[［][A-Za-z0-9\s.'\-+&/!?,;:()~#\u0100-\u017F]+[\]］]/g;

/**
 * 先頭の連番「01. 」/「⟦01⟧ 」にマッチする。
 * 「8.32」のようなバージョン番号風タイトルを削らないよう、
 * ドット後は空白必須とする(「01.Sincerely」のような詰め書きは対象外・安全側)。
 */
const TRACK_NUMBER_RE = /^(?:\d{1,3}\.\s+|⟦\d{1,3}⟧\s*)/;

/**
 * 先頭のトラック番号を除去する。
 *
 * @param {string} text
 * @returns {string}
 */
export function stripTrackNumber(text) {
  return String(text ?? '').replace(TRACK_NUMBER_RE, '');
}

/**
 * コメント由来の1ラベル(「曲名 / アーティスト」行)をサイト表記に寄せる。
 *
 * @param {string} label
 * @returns {string} クリーニング済みラベル(空文字の場合は空)
 */
export function cleanCommentLabel(label) {
  const text = String(label ?? '').trim();
  if (!text) return '';
  return text.replace(READING_BRACKET_RE, '').replace(/\s+/g, ' ').trim();
}
