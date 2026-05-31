/**
 * @file tests/usecase/upsert-song.test.js
 * @description upsertSong UseCase のテスト。
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { upsertSong } from '../../src/usecase/upsert-song.js';
import {
  InMemoryArtistRepository,
  InMemorySongRepository,
  FakeClock,
} from '../../src/infra/in-memory/index.js';

/**
 * テスト用セットアップ。
 * @returns {{ deps: import('../../src/usecase/upsert-song.js').UpsertSongDeps }}
 */
function setup() {
  const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
  const artists = new InMemoryArtistRepository();
  const songs = new InMemorySongRepository(artists);
  return { deps: { songs, artists, clock } };
}

describe('upsertSong', () => {
  test('新規曲を挿入できる (isNew=true)', async () => {
    const { deps } = setup();
    const result = await upsertSong(deps, { title: 'アイドル', artist: 'YOASOBI' });
    assert.equal(result.isNew, true);
    assert.ok(result.id > 0);
    assert.ok(typeof result.songKey === 'string');
  });

  test('同じ曲名・アーティストを 2 回呼ぶと isNew=false', async () => {
    const { deps } = setup();
    const first = await upsertSong(deps, { title: 'アイドル', artist: 'YOASOBI' });
    const second = await upsertSong(deps, { title: 'アイドル', artist: 'YOASOBI' });
    assert.equal(first.isNew, true);
    assert.equal(second.isNew, false);
    assert.equal(first.id, second.id);
  });

  test('アーティスト未指定は (不明) で登録される', async () => {
    const { deps } = setup();
    const result = await upsertSong(deps, { title: 'タイトルのみ' });
    assert.equal(result.isNew, true);

    const allArtists = await deps.artists.findAll();
    const unknown = allArtists.find((a) => a.name === '(不明)');
    assert.ok(unknown, '(不明) アーティストが存在するはず');
  });

  test('空文字アーティストも (不明) として扱う', async () => {
    const { deps } = setup();
    const r1 = await upsertSong(deps, { title: '曲X', artist: '' });
    const r2 = await upsertSong(deps, { title: '曲X', artist: undefined });
    assert.equal(r1.id, r2.id, '同一曲として扱われるはず');
  });

  test('同一アーティストが 2 曲あっても artist は重複登録されない', async () => {
    const { deps } = setup();
    await upsertSong(deps, { title: '曲A', artist: 'YOASOBI' });
    await upsertSong(deps, { title: '曲B', artist: 'YOASOBI' });

    const allArtists = await deps.artists.findAll();
    const yoasobi = allArtists.filter((a) => a.name === 'YOASOBI');
    assert.equal(yoasobi.length, 1);
  });

  test('displayKey と genre を指定して挿入できる', async () => {
    const { deps } = setup();
    const result = await upsertSong(deps, {
      title: '曲C',
      artist: 'アーティスト',
      displayKey: '原キー',
      genre: 'アニソン',
    });
    assert.equal(result.isNew, true);

    const song = await deps.songs.findById(result.id);
    assert.equal(song?.display_key, '原キー');
    assert.equal(song?.genre, 'アニソン');
  });

  test('既存曲の displayKey/genre を更新できる', async () => {
    const { deps } = setup();
    await upsertSong(deps, { title: '曲D', artist: 'アーティスト', displayKey: '', genre: '' });
    await upsertSong(deps, { title: '曲D', artist: 'アーティスト', displayKey: '+1', genre: 'J-POP' });

    const songs = await deps.songs.findAll();
    const song = songs.find((s) => s.title === '曲D');
    assert.equal(song?.display_key, '+1');
    assert.equal(song?.genre, 'J-POP');
  });

  test('戻り値 songKey が song_key と一致する', async () => {
    const { deps } = setup();
    const result = await upsertSong(deps, { title: 'テスト', artist: 'アーティスト' });
    const song = await deps.songs.findById(result.id);
    assert.equal(result.songKey, song?.song_key);
  });
});
