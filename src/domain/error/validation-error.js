/**
 * @module domain/error/validation-error
 * @description ドメイン入力バリデーション失敗を表すエラークラス。
 *
 * UseCase が不正な入力を受け取った場合にこのエラーを throw する。
 * HTTP Presenter は status プロパティを参照して 400 Bad Request に変換する。
 *
 * @副作用 なし
 */

/**
 * バリデーションエラー。HTTP 400 相当。
 *
 * @extends {Error}
 */
export class ValidationError extends Error {
  /**
   * @param {string} message - エラーメッセージ
   */
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    /** @type {400} */
    this.status = 400;
  }
}
