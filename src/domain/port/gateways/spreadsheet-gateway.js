/**
 * @module domain/port/gateways/spreadsheet-gateway
 * @description SpreadsheetGateway Port (interface)。
 *
 * 外部の Google Sheets (または任意の CSV エンドポイント) から
 * CSV テキストを取得する I/O 操作を抽象化する。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:419-425 (syncKeyReferenceUrl: fetch(url) して CSV 取得)
 *   - functions/api/admin/[[path]].js:133-142 (spreadsheetCsvUrl: URL 正規化ロジック)
 *   - SoT 02 §7-2 (Google Sheets CSV fetch の外部副作用)
 *   - SoT 20 §4 (SpreadsheetGateway interface 例)
 *
 * 実装の所在 (Phase 2B 以降):
 *   - infra/spreadsheet/ (fetch を使った実装)
 *
 * URL 正規化 (spreadsheetCsvUrl) は Domain の Adapter 層が行い、
 * このインターフェースに渡すのは正規化済み URL のみ。
 *
 * @副作用 なし (typedef のみ)
 */

/**
 * スプレッドシート (CSV 形式) の取得 Port interface。
 *
 * @typedef {object} SpreadsheetGateway
 * @property {(url: string) => Promise<string>} fetchCsv
 *   - 根拠: admin:422 `const response = await fetch(url); ... response.text()`
 *   - url は spreadsheetCsvUrl() で正規化済みの CSV 直リンク
 *   - 取得失敗時は Error を throw する (HTTP 非 2xx を含む)
 */

export {};
