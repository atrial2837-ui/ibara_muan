/**
 * @file tests/usecase/sync-key-reference-url.test.js
 * @description syncKeyReferenceUrl の統合テスト (InMemory 実装使用)
 *
 * 実行方法: node --test tests/usecase/sync-key-reference-url.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncKeyReferenceUrl } from '../../src/usecase/sync-key-reference-url.js';
import { InMemorySongRepository } from '../../src/infra/in-memory/in-memory-song-repository.js';
import { InMemorySpreadsheetGateway } from '../../src/infra/in-memory/in-memory-spreadsheet-gateway.js';
import { buildSongKey } from '../../src/domain/song/song-key.js';
import { normalizedKey } from '../../src/domain/shared/text.js';
import { spreadsheetCsvUrl } from '../../src/adapter/spreadsheet/spreadsheet-url-converter.js';
import { ValidationError } from '../../src/domain/error/validation-error.js';

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

test('syncKeyReferenceUrl: URL を CSV に変換して取得し更新する', async () => {
  const songs = new InMemorySongRepository();
  await insertSong(songs, { title: '曲名', artist: 'アーティスト' });

  const editUrl = 'https://docs.google.com/spreadsheets/d/SHEET_ID/edit';
  const csvUrl = spreadsheetCsvUrl(editUrl);
  const csv = 'title,artist,key,genre\n曲名,アーティスト,+2,J-POP';

  const spreadsheet = new InMemorySpreadsheetGateway({ [csvUrl]: csv });
  const result = await syncKeyReferenceUrl({ songs, spreadsheet }, { url: editUrl });

  assert.equal(result.updated, 1);
  assert.equal(result.skipped, 0);
  assert.equal(result.total, 1);

  const song = await songs.findByKey(buildSongKey('曲名', 'アーティスト'));
  assert.equal(song?.display_key, '+2');
  assert.equal(song?.genre, 'J-POP');
});

test('syncKeyReferenceUrl: gid つき URL でも正しく変換される', async () => {
  const songs = new InMemorySongRepository();
  await insertSong(songs, { title: '曲名', artist: 'アーティスト' });

  const editUrl = 'https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=555';
  const csvUrl = spreadsheetCsvUrl(editUrl);
  const csv = 'title,artist,key,genre\n曲名,アーティスト,-1,アニソン';

  const spreadsheet = new InMemorySpreadsheetGateway({ [csvUrl]: csv });
  const result = await syncKeyReferenceUrl({ songs, spreadsheet }, { url: editUrl });

  assert.equal(result.updated, 1);
  const song = await songs.findByKey(buildSongKey('曲名', 'アーティスト'));
  assert.equal(song?.display_key, '-1');
  assert.equal(song?.genre, 'アニソン');
});

// ─── ValidationError ──────────────────────────────────────────────────────────

test('syncKeyReferenceUrl: url が空文字列なら ValidationError', async () => {
  const songs = new InMemorySongRepository();
  const spreadsheet = new InMemorySpreadsheetGateway({});

  await assert.rejects(
    () => syncKeyReferenceUrl({ songs, spreadsheet }, { url: '' }),
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.status, 400);
      return true;
    }
  );
});

test('syncKeyReferenceUrl: url が null/undefined なら ValidationError', async () => {
  const songs = new InMemorySongRepository();
  const spreadsheet = new InMemorySpreadsheetGateway({});

  await assert.rejects(
    // @ts-expect-error: 意図的な型エラー
    () => syncKeyReferenceUrl({ songs, spreadsheet }, { url: null }),
    (err) => err instanceof ValidationError
  );
});

// ─── SpreadsheetGateway エラー伝播 ───────────────────────────────────────────

test('syncKeyReferenceUrl: 未登録 URL は InMemorySpreadsheetGateway が Error を throw', async () => {
  const songs = new InMemorySongRepository();
  const spreadsheet = new InMemorySpreadsheetGateway({});

  await assert.rejects(
    () =>
      syncKeyReferenceUrl(
        { songs, spreadsheet },
        { url: 'https://docs.google.com/spreadsheets/d/UNKNOWN/edit' }
      ),
    /unknown URL/
  );
});

// ─── 既に CSV URL の場合 ──────────────────────────────────────────────────────

test('syncKeyReferenceUrl: 既に tqx=out:csv 形式の URL はそのまま使う', async () => {
  const songs = new InMemorySongRepository();
  await insertSong(songs, { title: '曲名', artist: 'アーティスト' });

  const csvUrl =
    'https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&gid=0';
  const csv = 'title,artist,key,genre\n曲名,アーティスト,原キー,ボカロ';

  const spreadsheet = new InMemorySpreadsheetGateway({ [csvUrl]: csv });
  const result = await syncKeyReferenceUrl({ songs, spreadsheet }, { url: csvUrl });

  assert.equal(result.updated, 1);
});
