/**
 * @module infra/in-memory/in-memory-stream-song-repository
 * @description StreamSongRepository Port の インメモリ実装。
 *
 * Map ベースの単純実装。テスト・開発時の依存性注入に使用する。
 * UNIQUE(stream_id, position) 制約を守る。
 *
 * @副作用 なし (インスタンス内 Map への書き込みのみ)
 */

/**
 * @typedef {import('../../domain/port/repositories/stream-song-repository.js').StreamSong} StreamSong
 * @typedef {import('../../domain/port/repositories/stream-song-repository.js').NewStreamSong} NewStreamSong
 * @typedef {import('../../domain/port/repositories/stream-song-repository.js').StreamSongRepository} StreamSongRepository
 */

/**
 * StreamSongRepository の インメモリ実装。
 *
 * @implements {StreamSongRepository}
 */
export class InMemoryStreamSongRepository {
  constructor() {
    /** @type {Map<number, StreamSong>} */
    this._store = new Map();
    /** @type {number} */
    this._nextId = 1;
  }

  /**
   * @param {number} streamId
   * @returns {Promise<StreamSong[]>}
   */
  async findByStreamId(streamId) {
    return Array.from(this._store.values())
      .filter((r) => r.stream_id === streamId)
      .map((r) => ({ ...r }))
      .sort((a, b) => a.position - b.position);
  }

  /**
   * @param {NewStreamSong[]} rows
   * @returns {Promise<void>}
   */
  async insertBatch(rows) {
    for (const input of rows) {
      // UNIQUE constraint: (stream_id, position)
      for (const row of this._store.values()) {
        if (row.stream_id === input.streamId && row.position === input.position) {
          throw new Error(
            `UNIQUE constraint failed: stream_songs.(stream_id, position)`
          );
        }
      }
      const id = this._nextId++;
      /** @type {StreamSong} */
      const row = {
        id,
        stream_id: input.streamId,
        song_id: input.songId ?? null,
        position: input.position,
        raw_text: input.rawText ?? null,
        title_snapshot: input.titleSnapshot,
        artist_snapshot: input.artistSnapshot ?? null,
        song_key_snapshot: input.songKeySnapshot,
        created_at: input.createdAt,
      };
      this._store.set(id, row);
    }
  }

  /**
   * @param {number} streamId
   * @returns {Promise<void>}
   */
  async deleteByStreamId(streamId) {
    for (const [id, row] of this._store.entries()) {
      if (row.stream_id === streamId) this._store.delete(id);
    }
  }

  /**
   * @returns {Promise<StreamSong[]>}
   */
  async findAll() {
    return Array.from(this._store.values()).map((r) => ({ ...r }));
  }
}
