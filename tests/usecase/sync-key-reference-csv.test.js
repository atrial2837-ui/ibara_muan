/**
 * @file tests/usecase/sync-key-reference-csv.test.js
 * @description syncKeyReferenceCsv の統合テスト (InMemorySongRepository 使用)
 *
 * 実行方法: node --test tests/usecase/sync-key-reference-csv.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncKeyReferenceCsv } from '../../src/usecase/sync-key-reference-csv.js';
import { InMemorySongRepository } from '../../src/infra/in-memory/in-memory-song-repository.js';
import { buildSongKey } from '../../src/domain/song/song-key.js';
import { normalizedKey } from '../../src/domain/shared/text.js';

/**
 * テスト用 song を InMemorySongRepository に挿入するヘルパー。
 *
 * @param {InMemorySongRepository} repo
 * @param {{ title: string; artist?: string; artistId?: number; displayKey?: string; genre?: string }} opts
 * @returns {Promise<{ id: number }>}
 */
async function insertSong(repo, opts) {
  const title = opts.title;
  const artist = opts.artist ?? '';
  return repo.insert({
    title,
    normalizedTitle: normalizedKey(title),
    artistId: opts.artistId ?? null,
    songKey: buildSongKey(title, artist),
    displayKey: opts.displayKey ?? '',
    genre: opts.genre ?? '',
    createdAt: '2024-01-01T00:00:00.000Z',
  });
}

// ─── 基本ケース ───────────────────────────────────────────────────────────────

test('syncKeyReferenceCsv: exact match で displayKey を更新する', async () => {
  const songs = new InMemorySongRepository();
  await insertSong(songs, { title: '曲名', artist: 'アーティスト' });

  const csv = 'title,artist,key,genre\n曲名,アーティスト,+2,';
  const result = await syncKeyReferenceCsv({ songs }, { csvText: csv });

  assert.equal(result.updated, 1);
  assert.equal(result.skipped, 0);
  assert.equal(result.total, 1);

  const song = await songs.findByKey(buildSongKey('曲名', 'アーティスト'));
  assert.equal(song?.display_key, '+2');
});

test('syncKeyReferenceCsv: exact match で genre を更新する', async () => {
  const songs = new InMemorySongRepository();
  await insertSong(songs, { title: '曲名', artist: 'アーティスト' });

  const csv = 'title,artist,key,genre\n曲名,アーティスト,,J-POP';
  const result = await syncKeyReferenceCsv({ songs }, { csvText: csv });

  assert.equal(result.updated, 1);

  const song = await songs.findByKey(buildSongKey('曲名', 'アーティスト'));
  assert.equal(song?.genre, 'J-POP');
});

test('syncKeyReferenceCsv: displayKey と genre 両方を更新する', async () => {
  const songs = new InMemorySongRepository();
  await insertSong(songs, { title: '曲名', artist: 'アーティスト' });

  const csv = 'title,artist,key,genre\n曲名,アーティスト,原キー,アニソン';
  await syncKeyReferenceCsv({ songs }, { csvText: csv });

  const song = await songs.findByKey(buildSongKey('曲名', 'アーティスト'));
  assert.equal(song?.display_key, '原キー');
  assert.equal(song?.genre, 'アニソン');
});

// ─── normalized_title フォールバック ─────────────────────────────────────────

test('syncKeyReferenceCsv: artist なし → normalized_title で 1 件マッチ時に更新', async () => {
  const songs = new InMemorySongRepository();
  await insertSong(songs, { title: '曲名', artist: 'アーティスト' });

  // artist 列なし → exact match スキップ → normalized_title 検索 → 1 件マッチ
  const csv = 'title,key\n曲名,+3';
  const result = await syncKeyReferenceCsv({ songs }, { csvText: csv });

  assert.equal(result.updated, 1);
  const song = await songs.findByKey(buildSongKey('曲名', 'アーティスト'));
  assert.equal(song?.display_key, '+3');
});

test('syncKeyReferenceCsv: normalized_title で複数件マッチ → スキップ', async () => {
  const songs = new InMemorySongRepository();
  // 同タイトル・異アーティストの 2 曲
  await insertSong(songs, { title: '同タイトル', artist: 'アーティストA' });
  await insertSong(songs, { title: '同タイトル', artist: 'アーティストB' });

  const csv = 'title,key\n同タイトル,+1';
  const result = await syncKeyReferenceCsv({ songs }, { csvText: csv });

  assert.equal(result.skipped, 1);
  assert.equal(result.updated, 0);
});

// ─── スキップケース ────────────────────────────────────────────────────────────

test('syncKeyReferenceCsv: title 空はスキップ', async () => {
  const songs = new InMemorySongRepository();

  const csv = 'title,artist,key,genre\n,アーティスト,+1,';
  const result = await syncKeyReferenceCsv({ songs }, { csvText: csv });

  assert.equal(result.skipped, 1);
  assert.equal(result.updated, 0);
});

test('syncKeyReferenceCsv: displayKey も genre も空はスキップ', async () => {
  const songs = new InMemorySongRepository();
  await insertSong(songs, { title: '曲名', artist: 'アーティスト' });

  const csv = 'title,artist,key,genre\n曲名,アーティスト,,';
  const result = await syncKeyReferenceCsv({ songs }, { csvText: csv });

  assert.equal(result.skipped, 1);
});

test('syncKeyReferenceCsv: マッチする曲がない場合はスキップ', async () => {
  const songs = new InMemorySongRepository();

  const csv = 'title,artist,key,genre\n存在しない曲,アーティスト,+1,';
  const result = await syncKeyReferenceCsv({ songs }, { csvText: csv });

  assert.equal(result.skipped, 1);
  assert.equal(result.updated, 0);
});

// ─── 複数行 ───────────────────────────────────────────────────────────────────

test('syncKeyReferenceCsv: 複数行を処理する', async () => {
  const songs = new InMemorySongRepository();
  await insertSong(songs, { title: '曲A', artist: '歌手A' });
  await insertSong(songs, { title: '曲B', artist: '歌手B' });

  const csv = 'title,artist,key,genre\n曲A,歌手A,+1,\n曲B,歌手B,-2,J-POP';
  const result = await syncKeyReferenceCsv({ songs }, { csvText: csv });

  assert.equal(result.updated, 2);
  assert.equal(result.skipped, 0);
  assert.equal(result.total, 2);
});

// ─── CSV が空 ─────────────────────────────────────────────────────────────────

test('syncKeyReferenceCsv: CSV が空なら Error を throw', async () => {
  const songs = new InMemorySongRepository();

  await assert.rejects(
    () => syncKeyReferenceCsv({ songs }, { csvText: '' }),
    /CSVが空/
  );
});

// ─── 列検出失敗 ──────────────────────────────────────────────────────────────

test('syncKeyReferenceCsv: title 列も key 列も genre 列も検出不能 → Error', async () => {
  const songs = new InMemorySongRepository();

  const csv = 'col_a,col_b\nval1,val2';
  await assert.rejects(
    () => syncKeyReferenceCsv({ songs }, { csvText: csv }),
    /CSVの列を判定できません/
  );
});

// ─── detectedColumns ──────────────────────────────────────────────────────────

test('syncKeyReferenceCsv: detectedColumns に検出列名が入る', async () => {
  const songs = new InMemorySongRepository();

  const csv = 'title,artist,key,genre\n';
  // rows が空なので Error になる前に... ヘッダーのみ CSV は rows=[{}] で空配列になるが
  // csvObjects はヘッダーを shift するので rows=[] になり Error になる
  // 有効な1行を追加する
  await insertSong(songs, { title: '曲名', artist: 'A' });
  const csv2 = 'title,artist,key,genre\n曲名,A,+1,J-POP';
  const result = await syncKeyReferenceCsv({ songs }, { csvText: csv2 });

  assert.equal(result.detectedColumns.title, 'title');
  assert.equal(result.detectedColumns.artist, 'artist');
  assert.equal(result.detectedColumns.key, 'key');
  assert.equal(result.detectedColumns.genre, 'genre');
});
