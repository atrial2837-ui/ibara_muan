/**
 * @module infra/in-memory/in-memory-song-repository
 * @description SongRepository Port の インメモリ実装。
 *
 * Map ベースの単純実装。テスト・開発時の依存性注入に使用する。
 * - song_key の UNIQUE 制約を守る
 * - findAll は artist_id をもとに artists テーブル相当の JOIN を再現する
 * - search は title / artist / song_key / genre に対して大文字小文字無視の部分一致
 *
 * @副作用 なし (インスタンス内 Map への書き込みのみ)
 */

import { normalizedKey } from '../../domain/shared/text.js';

/**
 * @typedef {import('../../domain/port/repositories/song-repository.js').Song} Song
 * @typedef {import('../../domain/port/repositories/song-repository.js').NewSong} NewSong
 * @typedef {import('../../domain/port/repositories/song-repository.js').SongMetadata} SongMetadata
 * @typedef {import('../../domain/port/repositories/song-repository.js').SongRepository} SongRepository
 * @typedef {import('../../domain/port/repositories/artist-repository.js').Artist} Artist
 */

/**
 * @typedef {object} SongRow
 * @property {number}      id
 * @property {string}      title
 * @property {string}      normalized_title
 * @property {number|null} artist_id
 * @property {string}      song_key
 * @property {string}      display_key
 * @property {string}      genre
 * @property {string}      created_at
 */

/**
 * SongRepository の インメモリ実装。
 * ArtistRepository は外部から注入する (JOIN 再現のため)。
 *
 * @implements {SongRepository}
 */
export class InMemorySongRepository {
  /**
   * @param {{ findAll(): Promise<Artist[]> }} [artistRepo] - JOIN 再現用。省略時は artist='' で返す。
   */
  constructor(artistRepo = null) {
    /** @type {Map<number, SongRow>} */
    this._store = new Map();
    /** @type {number} */
    this._nextId = 1;
    /** @type {{ findAll(): Promise<Artist[]> }|null} */
    this._artistRepo = artistRepo;
  }

  /**
   * artist_id → artist name のマップを構築する (JOIN 相当)。
   * @returns {Promise<Map<number, string>>}
   */
  async _buildArtistMap() {
    if (!this._artistRepo) return new Map();
    const artists = await this._artistRepo.findAll();
    /** @type {Map<number, string>} */
    const map = new Map();
    for (const a of artists) map.set(a.id, a.name);
    return map;
  }

  /**
   * @param {SongRow} row
   * @param {Map<number, string>} artistMap
   * @returns {Song}
   */
  _toSong(row, artistMap) {
    return {
      id: row.id,
      title: row.title,
      normalized_title: row.normalized_title,
      artist_id: row.artist_id,
      artist: row.artist_id != null ? (artistMap.get(row.artist_id) ?? '') : '',
      song_key: row.song_key,
      display_key: row.display_key,
      genre: row.genre,
      created_at: row.created_at,
    };
  }

  /**
   * @param {string} songKey
   * @returns {Promise<Song|null>}
   */
  async findByKey(songKey) {
    const artistMap = await this._buildArtistMap();
    for (const row of this._store.values()) {
      if (row.song_key === songKey) return this._toSong(row, artistMap);
    }
    return null;
  }

  /**
   * @param {string} normalizedTitle
   * @returns {Promise<Song[]>}
   */
  async findByNormalizedTitle(normalizedTitle) {
    const artistMap = await this._buildArtistMap();
    const results = [];
    for (const row of this._store.values()) {
      if (row.normalized_title.includes(normalizedTitle)) {
        results.push(this._toSong(row, artistMap));
      }
    }
    return results;
  }

  /**
   * @returns {Promise<Song[]>}
   */
  async findAll() {
    const artistMap = await this._buildArtistMap();
    return Array.from(this._store.values()).map((row) => this._toSong(row, artistMap));
  }

  /**
   * @param {NewSong} input
   * @returns {Promise<{ id: number }>}
   */
  async insert(input) {
    // UNIQUE constraint check on song_key
    for (const row of this._store.values()) {
      if (row.song_key === input.songKey) {
        throw new Error(
          `UNIQUE constraint failed: songs.song_key = "${input.songKey}"`
        );
      }
    }
    const id = this._nextId++;
    /** @type {SongRow} */
    const row = {
      id,
      title: input.title,
      normalized_title: input.normalizedTitle,
      artist_id: input.artistId,
      song_key: input.songKey,
      display_key: input.displayKey ?? '',
      genre: input.genre ?? '',
      created_at: input.createdAt,
    };
    this._store.set(id, row);
    return { id };
  }

  /**
   * @param {number} id
   * @param {SongMetadata} metadata
   * @returns {Promise<void>}
   */
  async updateMetadata(id, metadata) {
    const row = this._store.get(id);
    if (!row) return;
    this._store.set(id, {
      ...row,
      title: metadata.title ?? row.title,
      normalized_title: metadata.normalizedTitle ?? row.normalized_title,
      artist_id: metadata.artistId ?? row.artist_id,
      song_key: metadata.songKey ?? row.song_key,
      display_key: metadata.displayKey,
      genre: metadata.genre,
    });
  }

  /**
   * title / artist / song_key / genre に対してクエリ文字列の部分一致検索を行う。
   * 大文字小文字・全角半角は normalizedKey で吸収する。
   * LIMIT で件数制限。
   *
   * @param {string} query
   * @param {number} limit
   * @returns {Promise<Song[]>}
   */
  async search(query, limit) {
    const artistMap = await this._buildArtistMap();
    const q = normalizedKey(query);
    const results = [];
    for (const row of this._store.values()) {
      if (results.length >= limit) break;
      const artist = row.artist_id != null ? (artistMap.get(row.artist_id) ?? '') : '';
      if (
        normalizedKey(row.title).includes(q) ||
        normalizedKey(artist).includes(q) ||
        normalizedKey(row.song_key).includes(q) ||
        normalizedKey(row.genre).includes(q)
      ) {
        results.push(this._toSong(row, artistMap));
      }
    }
    return results;
  }

  /**
   * @param {number} id
   * @returns {Promise<Song|null>}
   */
  async findById(id) {
    const row = this._store.get(id);
    if (!row) return null;
    const artistMap = await this._buildArtistMap();
    return this._toSong(row, artistMap);
  }
}
