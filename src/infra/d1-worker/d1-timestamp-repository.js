/**
 * @module infra/d1-worker/d1-timestamp-repository
 * @description community_timestamps テーブルへの D1 Worker Binding 実装。
 */

import { TimestampSubmission } from '../../domain/timestamp/timestamp-submission.js';

export class D1TimestampRepository {
  /** @param {import('./d1-worker-client.js').D1WorkerClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * 特定の配信枠の承認済みタイムスタンプを取得する。
   *
   * @param {string} channelCode
   * @param {number} streamIndex
   * @returns {Promise<TimestampSubmission[]>}
   */
  async getApproved(channelCode, streamIndex) {
    const rows = await this.client.query(
      `SELECT * FROM community_timestamps
       WHERE channel_code = ? AND stream_index = ? AND status = 'approved'
       ORDER BY song_index ASC, time_seconds ASC`,
      channelCode,
      streamIndex,
    );
    return rows.map(toEntity);
  }

  /**
   * 投稿一覧を取得する（管理者用）。
   *
   * @param {object} [opts]
   * @param {string|null} [opts.status] - フィルタするステータス (null = 全件)
   * @param {number} [opts.limit]
   * @param {number} [opts.offset]
   * @returns {Promise<TimestampSubmission[]>}
   */
  async list({ status = null, limit = 50, offset = 0 } = {}) {
    let sql;
    let params;
    if (status) {
      sql = `SELECT * FROM community_timestamps
             WHERE status = ?
             ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params = [status, limit, offset];
    } else {
      sql = `SELECT * FROM community_timestamps
             ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params = [limit, offset];
    }
    const rows = await this.client.query(sql, ...params);
    return rows.map(toEntity);
  }

  /**
   * 投稿件数を取得する（管理者用）。
   *
   * @param {string|null} [status]
   * @returns {Promise<number>}
   */
  async count(status = null) {
    const sql = status
      ? `SELECT COUNT(*) AS n FROM community_timestamps WHERE status = ?`
      : `SELECT COUNT(*) AS n FROM community_timestamps`;
    const row = status
      ? await this.client.queryFirst(sql, status)
      : await this.client.queryFirst(sql);
    return Number(row?.n ?? 0);
  }

  /**
   * 新しいタイムスタンプ投稿を登録する。
   *
   * @param {object} props
   * @param {string} props.channelCode
   * @param {number} props.streamIndex
   * @param {number} props.songIndex
   * @param {number} props.timeSeconds
   * @param {string|null} [props.submitterNote]
   * @returns {Promise<TimestampSubmission>}
   */
  async insert({ channelCode, streamIndex, songIndex, timeSeconds, submitterNote = null }) {
    const row = await this.client.queryFirst(
      `INSERT INTO community_timestamps
         (channel_code, stream_index, song_index, time_seconds, submitter_note)
       VALUES (?, ?, ?, ?, ?)
       RETURNING *`,
      channelCode,
      streamIndex,
      songIndex,
      timeSeconds,
      submitterNote,
    );
    return toEntity(row);
  }

  /**
   * 投稿のステータスを更新する（承認 / 却下）。
   *
   * @param {number} id
   * @param {object} props
   * @param {string} props.status
   * @param {string|null} [props.reviewerNote]
   * @param {string} props.reviewedAt - ISO 8601
   * @returns {Promise<TimestampSubmission|null>}
   */
  async updateStatus(id, { status, reviewerNote = null, reviewedAt }) {
    const row = await this.client.queryFirst(
      `UPDATE community_timestamps
       SET status = ?, reviewer_note = ?, reviewed_at = ?
       WHERE id = ?
       RETURNING *`,
      status,
      reviewerNote,
      reviewedAt,
      id,
    );
    return row ? toEntity(row) : null;
  }

  /**
   * 投稿を削除する。
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    await this.client.run(
      `DELETE FROM community_timestamps WHERE id = ?`,
      id,
    );
  }
}

/**
 * @param {Record<string, unknown>} row
 * @returns {TimestampSubmission}
 */
function toEntity(row) {
  return new TimestampSubmission({
    id:            row.id,
    channelCode:   row.channel_code,
    streamIndex:   row.stream_index,
    songIndex:     row.song_index,
    timeSeconds:   row.time_seconds,
    status:        row.status,
    submitterNote: row.submitter_note ?? null,
    createdAt:     row.created_at,
    reviewedAt:    row.reviewed_at ?? null,
    reviewerNote:  row.reviewer_note ?? null,
  });
}
