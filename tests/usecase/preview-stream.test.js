/**
 * @file tests/usecase/preview-stream.test.js
 * @description previewStream UseCase のテスト。
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { previewStream } from '../../src/usecase/preview-stream.js';
import {
  InMemoryArtistRepository,
  InMemorySongRepository,
} from '../../src/infra/in-memory/index.js';

/**
 * テスト用セットアップ。
 */
async function setup() {
  const artists = new InMemoryArtistRepository();
  const songs = new InMemorySongRepository(artists);

  // 既存曲を 2 件登録
  const { id: artistId } = await artists.insert({
    name: 'YOASOBI',
    normalizedName: 'yoasobi',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  await songs.insert({
    title: 'アイドル',
    normalizedTitle: 'アイドル',
    artistId,
    songKey: 'アイドル__yoasobi',
    displayKey: '原キー',
    genre: 'J-POP',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  const { id: artist2Id } = await artists.insert({
    name: '米津玄師',
    normalizedName: '米津玄師',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  await songs.insert({
    title: 'Lemon',
    normalizedTitle: 'lemon',
    artistId: artist2Id,
    songKey: 'lemon__米津玄師',
    displayKey: '',
    genre: 'J-POP',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  return { deps: { songs } };
}

describe('previewStream', () => {
  test('既存曲 (exact match) を正しく返す', async () => {
    const { deps } = await setup();
    const result = await previewStream(deps, { songsText: 'アイドル / YOASOBI' });
    assert.equal(result.songs.length, 1);
    const song = result.songs[0];
    assert.equal(song.match, 'exact');
    assert.equal(song.title, 'アイドル');
    assert.equal(song.artist, 'YOASOBI');
    assert.equal(song.position, 1);
    assert.ok(song.songId != null);
  });

  test('新規曲は match=new を返す', async () => {
    const { deps } = await setup();
    const result = await previewStream(deps, { songsText: '新しい曲 / 新しいアーティスト' });
    assert.equal(result.songs.length, 1);
    assert.equal(result.songs[0].match, 'new');
    assert.equal(result.songs[0].songId, null);
  });

  test('複数行を処理できる', async () => {
    const { deps } = await setup();
    const songsText = 'アイドル / YOASOBI\nLemon / 米津玄師\n新曲 / 新アーティスト';
    const result = await previewStream(deps, { songsText });
    assert.equal(result.songs.length, 3);
    assert.equal(result.songs[0].position, 1);
    assert.equal(result.songs[1].position, 2);
    assert.equal(result.songs[2].position, 3);
  });

  test('空行は無視される', async () => {
    const { deps } = await setup();
    const songsText = 'アイドル / YOASOBI\n\n\nLemon / 米津玄師';
    const result = await previewStream(deps, { songsText });
    assert.equal(result.songs.length, 2);
  });

  test('songsText が空なら songs は空配列', async () => {
    const { deps } = await setup();
    const result = await previewStream(deps, { songsText: '' });
    assert.equal(result.songs.length, 0);
    assert.ok(Array.isArray(result.songs));
  });

  test('入力で displayKey が指定されていればそれを使う', async () => {
    const { deps } = await setup();
    const result = await previewStream(deps, { songsText: 'アイドル / YOASOBI | +2' });
    assert.equal(result.songs[0].displayKey, '+2');
  });

  test('入力で displayKey が未指定なら既存曲の display_key を使う', async () => {
    const { deps } = await setup();
    const result = await previewStream(deps, { songsText: 'アイドル / YOASOBI' });
    // 既存曲の display_key は '原キー'
    assert.equal(result.songs[0].displayKey, '原キー');
  });

  test('raw フィールドに元のテキストが入る', async () => {
    const { deps } = await setup();
    const line = 'アイドル / YOASOBI';
    const result = await previewStream(deps, { songsText: line });
    assert.equal(result.songs[0].raw, line);
  });
});
