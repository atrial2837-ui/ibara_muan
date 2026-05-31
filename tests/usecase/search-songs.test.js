/**
 * @file tests/usecase/search-songs.test.js
 * @description searchSongs UseCase のテスト。
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { searchSongs } from '../../src/usecase/search-songs.js';
import {
  InMemoryArtistRepository,
  InMemorySongRepository,
} from '../../src/infra/in-memory/index.js';

/**
 * テスト用セットアップ。
 * @returns {{ deps: import('../../src/usecase/search-songs.js').SearchSongsDeps }}
 */
async function setup() {
  const artists = new InMemoryArtistRepository();
  const songs = new InMemorySongRepository(artists);

  // アーティスト登録
  const { id: artistId } = await artists.insert({
    name: 'YOASOBI',
    normalizedName: 'yoasobi',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  // 曲登録
  await songs.insert({
    title: 'アイドル',
    normalizedTitle: 'アイドル',
    artistId,
    songKey: 'アイドル__yoasobi',
    displayKey: '原キー',
    genre: 'J-POP',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  await songs.insert({
    title: 'たぶん',
    normalizedTitle: 'たぶん',
    artistId,
    songKey: 'たぶん__yoasobi',
    displayKey: '',
    genre: 'J-POP',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  const { id: artist2Id } = await artists.insert({
    name: '米津玄師',
    normalizedName: '米津玄師',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  await songs.insert({
    title: 'LOSER',
    normalizedTitle: 'loser',
    artistId: artist2Id,
    songKey: 'loser__米津玄師',
    displayKey: '-1',
    genre: 'J-POP',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  return { deps: { songs } };
}

describe('searchSongs', () => {
  test('タイトルで部分一致検索できる', async () => {
    const { deps } = await setup();
    const result = await searchSongs(deps, { query: 'アイドル' });
    assert.equal(result.songs.length, 1);
    assert.equal(result.songs[0].title, 'アイドル');
  });

  test('アーティスト名で検索できる', async () => {
    const { deps } = await setup();
    const result = await searchSongs(deps, { query: 'YOASOBI' });
    // YOASOBI の曲が 2 件ヒット
    assert.equal(result.songs.length, 2);
  });

  test('クエリが空文字の場合は全件返す', async () => {
    const { deps } = await setup();
    const result = await searchSongs(deps, { query: '' });
    assert.equal(result.songs.length, 3);
  });

  test('limit を指定すると件数が制限される', async () => {
    const { deps } = await setup();
    const result = await searchSongs(deps, { query: '', limit: 2 });
    assert.equal(result.songs.length, 2);
  });

  test('limit 未指定はデフォルト 80', async () => {
    const { deps } = await setup();
    const result = await searchSongs(deps, { query: '' });
    // 3 件しかないのでそのまま全件
    assert.equal(result.songs.length, 3);
  });

  test('ヒットしないクエリは空配列を返す', async () => {
    const { deps } = await setup();
    const result = await searchSongs(deps, { query: '存在しない曲名XYZ' });
    assert.equal(result.songs.length, 0);
  });

  test('songs プロパティを含むオブジェクトを返す', async () => {
    const { deps } = await setup();
    const result = await searchSongs(deps, { query: 'アイドル' });
    assert.ok(Array.isArray(result.songs));
  });
});
