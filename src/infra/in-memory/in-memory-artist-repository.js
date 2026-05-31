/**
 * @module infra/in-memory/in-memory-artist-repository
 * @description ArtistRepository Port の インメモリ実装。
 *
 * Map ベースの単純実装。テスト・開発時の依存性注入に使用する。
 * normalized_name の UNIQUE 制約を守る。
 *
 * @副作用 なし (インスタンス内 Map への書き込みのみ)
 */

/**
 * @typedef {import('../../domain/port/repositories/artist-repository.js').Artist} Artist
 * @typedef {import('../../domain/port/repositories/artist-repository.js').NewArtist} NewArtist
 * @typedef {import('../../domain/port/repositories/artist-repository.js').ArtistRepository} ArtistRepository
 */

/**
 * ArtistRepository の インメモリ実装。
 *
 * @implements {ArtistRepository}
 */
export class InMemoryArtistRepository {
  constructor() {
    /** @type {Map<number, Artist>} */
    this._store = new Map();
    /** @type {number} */
    this._nextId = 1;
  }

  /**
   * @param {string} normalizedName
   * @returns {Promise<Artist|null>}
   */
  async findByNormalizedName(normalizedName) {
    for (const artist of this._store.values()) {
      if (artist.normalized_name === normalizedName) return { ...artist };
    }
    return null;
  }

  /**
   * @param {NewArtist} input
   * @returns {Promise<{ id: number }>}
   */
  async insert(input) {
    // UNIQUE constraint check on normalized_name
    for (const artist of this._store.values()) {
      if (artist.normalized_name === input.normalizedName) {
        throw new Error(
          `UNIQUE constraint failed: artists.normalized_name = "${input.normalizedName}"`
        );
      }
    }
    const id = this._nextId++;
    /** @type {Artist} */
    const row = {
      id,
      name: input.name,
      normalized_name: input.normalizedName,
      created_at: input.createdAt,
    };
    this._store.set(id, row);
    return { id };
  }

  /**
   * @returns {Promise<Artist[]>}
   */
  async findAll() {
    return Array.from(this._store.values()).map((a) => ({ ...a }));
  }
}
