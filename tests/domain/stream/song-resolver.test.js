/**
 * @file song-resolver.test.js
 * @description stream/song-resolver ドメイン関数のユニットテスト。
 *   Node.js 組み込みテストランナー (node:test) を使用。
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  buildSongMaps,
  resolveExistingSong,
} from '../../../src/domain/stream/song-resolver.js';
import { buildSongKey } from '../../../src/domain/song/song-key.js';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/**
 * テスト用の SongRow を作る。
 *
 * @param {number} id
 * @param {string} title         - 表示用タイトル
 * @param {string} artist        - 表示用アーティスト
 * @param {string} song_key      - 検索キー (buildSongKey(title, artist) で生成済み想定)
 * @param {string} [normalized_title] - 省略時は song_key の title 部を使う
 * @returns {import('../../../src/domain/stream/song-resolver.js').SongRow}
 */
function makeSong(id, title, artist, song_key, normalized_title) {
  return {
    id,
    title,
    artist,
    song_key,
    normalized_title: normalized_title ?? song_key.split('__')[0],
    display_key: '',
    genre: '',
  };
}

// ---------------------------------------------------------------------------
// buildSongMaps
// ---------------------------------------------------------------------------

describe('buildSongMaps', () => {
  it('空配列を渡すと空の Map が返る', () => {
    const maps = buildSongMaps([]);
    assert.equal(maps.byKey.size, 0);
    assert.equal(maps.byTitle.size, 0);
  });

  it('song_key で byKey が正しく構築される', () => {
    const key = buildSongKey('one last kiss', '宇多田ヒカル');
    const song = makeSong(1, 'One Last Kiss', '宇多田ヒカル', key);
    const maps = buildSongMaps([song]);
    assert.equal(maps.byKey.get(key), song);
  });

  it('normalized_title で byTitle が正しく構築される', () => {
    const key = buildSongKey('One Last Kiss', '宇多田ヒカル');
    const normalizedTitle = key.split('__')[0]; // 'one last kiss'
    const song = makeSong(1, 'One Last Kiss', '宇多田ヒカル', key, normalizedTitle);
    const maps = buildSongMaps([song]);
    const list = maps.byTitle.get(normalizedTitle);
    assert.ok(list, 'byTitle にエントリが存在する');
    assert.equal(list.length, 1);
    assert.equal(list[0], song);
  });

  it('同一 normalized_title を持つ複数曲が byTitle に配列でまとまる', () => {
    // 同タイトル・異アーティストの曲 (ambiguous ケース相当)
    const normalizedTitle = 'rose';
    const key1 = buildSongKey('Rose', 'ArtistA');
    const key2 = buildSongKey('Rose', 'ArtistB');
    const song1 = makeSong(1, 'Rose', 'ArtistA', key1, normalizedTitle);
    const song2 = makeSong(2, 'Rose', 'ArtistB', key2, normalizedTitle);
    const maps = buildSongMaps([song1, song2]);
    const list = maps.byTitle.get(normalizedTitle);
    assert.equal(list.length, 2);
    assert.ok(list.includes(song1));
    assert.ok(list.includes(song2));
  });

  it('複数曲をすべて byKey に登録できる', () => {
    const key1 = buildSongKey('曲A', 'ア');
    const key2 = buildSongKey('曲B', 'イ');
    const s1 = makeSong(1, '曲A', 'ア', key1);
    const s2 = makeSong(2, '曲B', 'イ', key2);
    const maps = buildSongMaps([s1, s2]);
    assert.equal(maps.byKey.get(key1), s1);
    assert.equal(maps.byKey.get(key2), s2);
  });
});

// ---------------------------------------------------------------------------
// resolveExistingSong
// ---------------------------------------------------------------------------

describe('resolveExistingSong', () => {
  // 共通フィクスチャ
  const keyOlk = buildSongKey('One Last Kiss', '宇多田ヒカル');
  const normalizedTitleOlk = keyOlk.split('__')[0]; // 'one last kiss'
  const songOlk = makeSong(1, 'One Last Kiss', '宇多田ヒカル', keyOlk, normalizedTitleOlk);

  const keyDeep = buildSongKey('深海のリトルクライ', 'sasakure.UK');
  const normalizedTitleDeep = keyDeep.split('__')[0];
  const songDeep = makeSong(2, '深海のリトルクライ', 'sasakure.UK', keyDeep, normalizedTitleDeep);

  const maps = buildSongMaps([songOlk, songDeep]);

  // ----------------------------------------------------------------
  // Case 1: exact match
  // ----------------------------------------------------------------

  it('exact: song_key が完全一致する場合 match="exact", song=該当行', () => {
    const result = resolveExistingSong(
      { title: 'One Last Kiss', artist: '宇多田ヒカル' },
      maps,
    );
    assert.equal(result.match, 'exact');
    assert.equal(result.song, songOlk);
    assert.equal(result.key, keyOlk);
  });

  it('exact: 入力の大文字/小文字が違っても normalizedKey で吸収される', () => {
    // 'one last kiss' と 'ONE LAST KISS' は同じ normalizedKey になる
    const result = resolveExistingSong(
      { title: 'ONE LAST KISS', artist: '宇多田ヒカル' },
      maps,
    );
    assert.equal(result.match, 'exact');
    assert.equal(result.song, songOlk);
  });

  it('exact: 全角英字が半角に正規化されて一致する', () => {
    // 'Ｏｎｅ Ｌａｓｔ Ｋｉｓｓ' → NFKC → 'One Last Kiss' → lower → 'one last kiss'
    const result = resolveExistingSong(
      { title: 'Ｏｎｅ Ｌａｓｔ Ｋｉｓｓ', artist: '宇多田ヒカル' },
      maps,
    );
    assert.equal(result.match, 'exact');
    assert.equal(result.song, songOlk);
  });

  // ----------------------------------------------------------------
  // Case 2: title match (1件)
  // ----------------------------------------------------------------

  it('title: 同名異アーティストが1件のみ存在する場合 match="title", song=該当行', () => {
    // "深海のリトルクライ" は sasakure.UK 名義のみ登録
    const result = resolveExistingSong(
      { title: '深海のリトルクライ', artist: '別アーティスト' },
      maps,
    );
    assert.equal(result.match, 'title');
    assert.equal(result.song, songDeep);
    // key は parsed から合成したキー (既存と異なる)
    assert.equal(result.key, buildSongKey('深海のリトルクライ', '別アーティスト'));
  });

  // ----------------------------------------------------------------
  // Case 3: ambiguous (2件以上)
  // ----------------------------------------------------------------

  it('ambiguous: 同名異アーティストが2件以上存在する場合 match="ambiguous", song=null', () => {
    const normalizedTitle = 'rose';
    const key1 = buildSongKey('Rose', 'ArtistA');
    const key2 = buildSongKey('Rose', 'ArtistB');
    const s1 = makeSong(10, 'Rose', 'ArtistA', key1, normalizedTitle);
    const s2 = makeSong(11, 'Rose', 'ArtistB', key2, normalizedTitle);
    const mapsAmb = buildSongMaps([s1, s2]);

    const result = resolveExistingSong(
      { title: 'Rose', artist: '未知アーティスト' },
      mapsAmb,
    );
    assert.equal(result.match, 'ambiguous');
    // 既存実装 ([[path]].js:187, server.js:258) と同様に song=null
    assert.equal(result.song, null);
  });

  // ----------------------------------------------------------------
  // Case 4: new
  // ----------------------------------------------------------------

  it('new: どちらにもヒットしない場合 match="new", song=null', () => {
    const result = resolveExistingSong(
      { title: '未登録の曲', artist: '誰か' },
      maps,
    );
    assert.equal(result.match, 'new');
    assert.equal(result.song, null);
    // key は合成キー
    assert.equal(result.key, buildSongKey('未登録の曲', '誰か'));
  });

  // ----------------------------------------------------------------
  // Case 5: parsed.artist が空 / '(不明)' のとき
  // ----------------------------------------------------------------

  it('artist 空文字: buildSongKey は "{title}__" を生成し byKey を検索する', () => {
    const keyUnknown = buildSongKey('孤独な曲', '');   // '孤独な曲__'
    const songUnknown = makeSong(20, '孤独な曲', '(不明)', keyUnknown, '孤独な曲');
    const mapsUnk = buildSongMaps([songUnknown]);

    // artist='' で渡す → 同じ song_key になるので exact
    const result = resolveExistingSong({ title: '孤独な曲', artist: '' }, mapsUnk);
    assert.equal(result.match, 'exact');
    assert.equal(result.song, songUnknown);
  });

  it('artist "(不明)": buildSongKey は artist を空文字として扱う', () => {
    const keyUnknown = buildSongKey('孤独な曲', '');   // '孤独な曲__'
    const songUnknown = makeSong(20, '孤独な曲', '(不明)', keyUnknown, '孤独な曲');
    const mapsUnk = buildSongMaps([songUnknown]);

    // artist='(不明)' は buildSongKey 内で空文字扱いになるので exact
    const result = resolveExistingSong({ title: '孤独な曲', artist: '(不明)' }, mapsUnk);
    assert.equal(result.match, 'exact');
    assert.equal(result.song, songUnknown);
  });

  // ----------------------------------------------------------------
  // Case 6: 全角/半角の差が吸収されること
  // ----------------------------------------------------------------

  it('全角スペース: normalizedKey で半角へ変換されて exact ヒット', () => {
    // DB には 'one last kiss__宇多田ヒカル' で登録済み
    // 入力タイトルに全角スペースを含む
    const result = resolveExistingSong(
      { title: 'One　Last　Kiss', artist: '宇多田ヒカル' }, // 全角スペース
      maps,
    );
    assert.equal(result.match, 'exact');
    assert.equal(result.song, songOlk);
  });

  // ----------------------------------------------------------------
  // Case 7: 存在しないタイトル、byTitle 検索で 0 件 → new
  // ----------------------------------------------------------------

  it('タイトルが byTitle にも存在しない場合は match="new"', () => {
    const result = resolveExistingSong(
      { title: 'ＸＹＺ完全新作', artist: '' },
      maps,
    );
    assert.equal(result.match, 'new');
    assert.equal(result.song, null);
  });
});
