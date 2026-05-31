/**
 * @module domain/error/not-found-error
 * @description リソースが見つからない場合を表すエラークラス。
 *
 * UseCase が存在しないリソースを操作しようとした場合にこのエラーを throw する。
 * HTTP Presenter は status プロパティを参照して 404 Not Found に変換する。
 *
 * @副作用 なし
 */

/**
 * リソース未検出エラー。HTTP 404 相当。
 *
 * @extends {Error}
 */
export class NotFoundError extends Error {
  /**
   * @param {string} message - エラーメッセージ
   */
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    /** @type {404} */
    this.status = 404;
  }
}
