/**
 * @file tests/usecase/save-song-metadata.test.js
 * @description saveSongMetadata UseCase のテスト。
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { saveSongMetadata } from '../../src/usecase/save-song-metadata.js';
import { ValidationError } from '../../src/domain/error/validation-error.js';
import { NotFoundError } from '../../src/domain/error/not-found-error.js';
import {
  InMemoryArtistRepository,
  InMemorySongRepository,
} from '../../src/infra/in-memory/index.js';

/**
 * テスト用セットアップ。
 * @returns {Promise<{ deps: import('../../src/usecase/save-song-metadata.js').SaveSongMetadataDeps, songId: number }>}
 */
async function setup() {
  const artists = new InMemoryArtistRepository();
  const songs = new InMemorySongRepository(artists);

  const { id: artistId } = await artists.insert({
    name: 'テストアーティスト',
    normalizedName: 'テストアーティスト',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  const { id: songId } = await songs.insert({
    title: 'テスト曲',
    normalizedTitle: 'テスト曲',
    artistId,
    songKey: 'テスト曲__テストアーティスト',
    displayKey: '',
    genre: '',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  return {
    deps: {
      songs,
      artists,
      clock: { now: () => new Date('2026-01-01T00:00:00.000Z') },
    },
    songId,
  };
}

describe('saveSongMetadata', () => {
  test('displayKey と genre を更新できる', async () => {
    const { deps, songId } = await setup();
    await saveSongMetadata(deps, { songId, displayKey: '+2', genre: 'アニソン' });

    const updated = await deps.songs.findById(songId);
    assert.equal(updated?.display_key, '+2');
    assert.equal(updated?.genre, 'アニソン');
  });

  test('displayKey のみ更新 (genre 未指定は空文字)', async () => {
    const { deps, songId } = await setup();
    await saveSongMetadata(deps, { songId, displayKey: '原キー' });

    const updated = await deps.songs.findById(songId);
    assert.equal(updated?.display_key, '原キー');
    assert.equal(updated?.genre, '');
  });

  test('無効な displayKey は空文字に正規化される', async () => {
    const { deps, songId } = await setup();
    await saveSongMetadata(deps, { songId, displayKey: 'invalid_key', genre: '' });

    const updated = await deps.songs.findById(songId);
    assert.equal(updated?.display_key, '');
  });

  test('無効な genre は空文字に正規化される', async () => {
    const { deps, songId } = await setup();
    await saveSongMetadata(deps, { songId, displayKey: '', genre: '存在しないジャンル' });

    const updated = await deps.songs.findById(songId);
    assert.equal(updated?.genre, '');
  });

  test('songId が 0 なら ValidationError', async () => {
    const { deps } = await setup();
    await assert.rejects(
      () => saveSongMetadata(deps, { songId: 0, displayKey: '', genre: '' }),
      (err) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.status, 400);
        return true;
      },
    );
  });

  test('songId が NaN なら ValidationError', async () => {
    const { deps } = await setup();
    await assert.rejects(
      () => saveSongMetadata(deps, { songId: /** @type {any} */ ('abc'), displayKey: '', genre: '' }),
      ValidationError,
    );
  });

  test('存在しない songId なら NotFoundError', async () => {
    const { deps } = await setup();
    await assert.rejects(
      () => saveSongMetadata(deps, { songId: 9999, displayKey: '', genre: '' }),
      (err) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.status, 404);
        return true;
      },
    );
  });

  test('全ジャンルの代表値が受け入れられる', async () => {
    const { deps, songId } = await setup();
    await saveSongMetadata(deps, { songId, displayKey: '', genre: 'ボカロ' });
    const updated = await deps.songs.findById(songId);
    assert.equal(updated?.genre, 'ボカロ');
  });

  test('曲名とアーティスト名を更新できる', async () => {
    const { deps, songId } = await setup();
    await saveSongMetadata(deps, {
      songId,
      title: '新しい曲名',
      artist: '新しいアーティスト',
      displayKey: '+1',
      genre: 'J-POP',
    });

    const updated = await deps.songs.findById(songId);
    assert.equal(updated?.title, '新しい曲名');
    assert.equal(updated?.artist, '新しいアーティスト');
    assert.equal(updated?.normalized_title, '新しい曲名');
    assert.equal(updated?.song_key, '新しい曲名__新しいアーティスト');
    assert.equal(updated?.display_key, '+1');
    assert.equal(updated?.genre, 'J-POP');
  });

  test('曲名が空なら ValidationError', async () => {
    const { deps, songId } = await setup();
    await assert.rejects(
      () => saveSongMetadata(deps, { songId, title: '', artist: 'A', displayKey: '', genre: '' }),
      ValidationError,
    );
  });

  test('同じ曲名とアーティスト名の別曲があれば ValidationError', async () => {
    const { deps, songId } = await setup();
    const { id: artistId } = await deps.artists.insert({
      name: '既存アーティスト',
      normalizedName: '既存アーティスト',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await deps.songs.insert({
      title: '既存曲',
      normalizedTitle: '既存曲',
      artistId,
      songKey: '既存曲__既存アーティスト',
      displayKey: '',
      genre: '',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await assert.rejects(
      () => saveSongMetadata(deps, {
        songId,
        title: '既存曲',
        artist: '既存アーティスト',
        displayKey: '',
        genre: '',
      }),
      ValidationError,
    );
  });
});
