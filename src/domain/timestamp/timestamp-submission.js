/**
 * @module domain/timestamp/timestamp-submission
 * @description コミュニティタイムスタンプ投稿エンティティ。
 */

/** @enum {string} */
export const TS_STATUS = Object.freeze({
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

/**
 * コミュニティタイムスタンプ投稿エンティティ。
 */
export class TimestampSubmission {
  /**
   * @param {object} props
   * @param {number|null} props.id
   * @param {string} props.channelCode
   * @param {number} props.streamIndex
   * @param {number} props.songIndex
   * @param {number} props.timeSeconds
   * @param {string} [props.status]
   * @param {string|null} [props.submitterNote]
   * @param {string} props.createdAt
   * @param {string|null} [props.reviewedAt]
   * @param {string|null} [props.reviewerNote]
   */
  constructor({
    id,
    channelCode,
    streamIndex,
    songIndex,
    timeSeconds,
    status = TS_STATUS.PENDING,
    submitterNote = null,
    createdAt,
    reviewedAt = null,
    reviewerNote = null,
  }) {
    this.id            = id ?? null;
    this.channelCode   = channelCode;
    this.streamIndex   = streamIndex;
    this.songIndex     = songIndex;
    this.timeSeconds   = timeSeconds;
    this.status        = status;
    this.submitterNote = submitterNote;
    this.createdAt     = createdAt;
    this.reviewedAt    = reviewedAt;
    this.reviewerNote  = reviewerNote;
  }

  isPending()  { return this.status === TS_STATUS.PENDING; }
  isApproved() { return this.status === TS_STATUS.APPROVED; }
  isRejected() { return this.status === TS_STATUS.REJECTED; }
}
