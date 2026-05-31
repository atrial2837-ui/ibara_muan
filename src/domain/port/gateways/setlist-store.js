/**
 * @module domain/port/gateways/setlist-store
 * @description SetlistStore Port (interface)。フロントエンド専用。
 *
 * ブラウザの localStorage に保存されるセットリスト (お気に入り曲リスト) の
 * 永続化操作を抽象化する。
 *
 * 根拠となる既存コード:
 *   - docs/js/ 配下のセットリスト管理 (localStorage への読み書き)
 *   - SoT 20 §4 (SetlistStore interface 例)
 *   - SoT 20 §3 (infra/browser-storage/: localStorage 実装の所在)
 *   - SoT 20 §7 (ブラウザのみで使用。Cloudflare Worker / Node では利用しない)
 *
 * 実装の所在 (Phase 2B 以降):
 *   - infra/browser-storage/LocalStorageSetlistStore (localStorage を直接操作)
 *
 * Setlist 型は将来 domain/setlist/ で定義される予定。
 * 現時点では string[] (song_key の配列) として仮定義する。
 *
 * @副作用 なし (typedef のみ)
 */

/**
 * セットリストの永続化単位。
 * 現状は song_key の配列として表現する。
 * 将来 domain/setlist/ で厳密な型が定義されたら差し替える。
 *
 * @typedef {object} Setlist
 * @property {string[]} songKeys - 選択された song_key の配列 (順序あり)
 */

/**
 * ブラウザ側セットリストの永続化 Port interface。
 *
 * @typedef {object} SetlistStore
 * @property {() => Setlist|null} load
 *   - 根拠: SoT 20 §4 `load(): Setlist | null`
 *   - localStorage から読み込み。未保存・パース失敗時は null を返す
 * @property {(value: Setlist) => void} save
 *   - 根拠: SoT 20 §4 `save(value: Setlist): void`
 *   - localStorage に書き込む。同期操作。
 * @property {() => void} clear
 *   - セットリストを削除する
 *   - docs/js/ のセットリストリセット操作から導出
 */

export {};
