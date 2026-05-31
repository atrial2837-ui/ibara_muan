/**
 * @file song-key.test.js
 * @description SongKey ドメイン関数のユニットテスト。
 *   Node.js 組み込みテストランナー (node:test) を使用。
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  buildSongKey,
  parseSongKey,
  UNKNOWN_ARTIST_NAME,
  SONG_KEY_SEPARATOR,
} from '../../../src/domain/song/song-key.js';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

describe('UNKNOWN_ARTIST_NAME', () => {
  it('は "(不明)" である', () => {
    assert.equal(UNKNOWN_ARTIST_NAME, '(不明)');
  });
});

describe('SONG_KEY_SEPARATOR', () => {
  it('は "__" である', () => {
    assert.equal(SONG_KEY_SEPARATOR, '__');
  });
});

// ---------------------------------------------------------------------------
// buildSongKey
// ---------------------------------------------------------------------------

describe('buildSongKey', () => {
  it('基本ケース: 英字は小文字化される (SoT 04 付録の実例)', () => {
    assert.equal(buildSongKey('One Last Kiss', '宇多田ヒカル'), 'one last kiss__宇多田ヒカル');
  });

  it('基本ケース: 全角英字は半角小文字へ (NFKC + toLowerCase)', () => {
    // NFKC: 'Ａ' → 'A' → toLowerCase → 'a'
    assert.equal(buildSongKey('Ａ', 'Ｂ'), 'a__b');
  });

  it('基本ケース: アーティスト名に記号を含む (SoT 04 付録の実例)', () => {
    assert.equal(
      buildSongKey('深海のリトルクライ', 'sasakure.UK'),
      '深海のリトルクライ__sasakure.uk',
    );
  });

  it('基本ケース: 括弧内アーティスト情報を含む (SoT 04 付録の実例)', () => {
    assert.equal(
      buildSongKey('サインはb', 'B小町(ルビー,有馬かな,memちょ)'),
      'サインはb__b小町(ルビー,有馬かな,memちょ)',
    );
  });

  it('(不明) アーティスト: song_key の artist 部は空文字になる (admin/[[path]].js:237)', () => {
    // upsertSong は cleanArtist === '(不明)' のとき空文字を渡す
    assert.equal(buildSongKey('テスト曲', UNKNOWN_ARTIST_NAME), 'テスト曲__');
  });

  it('空アーティスト (空文字): artist 部は空になる', () => {
    assert.equal(buildSongKey('テスト曲', ''), 'テスト曲__');
  });

  it('null アーティスト: artist 部は空になる', () => {
    assert.equal(buildSongKey('テスト曲', null), 'テスト曲__');
  });

  it('undefined アーティスト: artist 部は空になる', () => {
    assert.equal(buildSongKey('テスト曲', undefined), 'テスト曲__');
  });

  it('セパレータ "__" は artist が空でも必ず含まれる', () => {
    const key = buildSongKey('曲名', '');
    assert.ok(key.includes('__'), `"${key}" に __ が含まれていない`);
  });

  it('空タイトル: title 部が空文字になる', () => {
    assert.equal(buildSongKey('', 'アーティスト'), '__アーティスト');
  });

  it('null タイトル: title 部が空文字になる', () => {
    assert.equal(buildSongKey(null, 'アーティスト'), '__アーティスト');
  });

  it('全角スペースは半角スペースへ正規化される', () => {
    // NFKC により全角スペース U+3000 → U+0020
    assert.equal(buildSongKey('曲　名', 'アーティスト'), '曲 名__アーティスト');
  });

  it('前後の空白はトリムされる', () => {
    assert.equal(buildSongKey('  曲名  ', '  アーティスト  '), '曲名__アーティスト');
  });

  it('連続する空白は1つに畳まれる', () => {
    assert.equal(buildSongKey('曲  名', 'ア  ーティスト'), '曲 名__ア ーティスト');
  });
});

// ---------------------------------------------------------------------------
// parseSongKey
// ---------------------------------------------------------------------------

describe('parseSongKey', () => {
  it('基本: "one last kiss__宇多田ヒカル" を分解する', () => {
    const result = parseSongKey('one last kiss__宇多田ヒカル');
    assert.deepEqual(result, {
      normalizedTitle: 'one last kiss',
      normalizedArtist: '宇多田ヒカル',
    });
  });

  it('基本: "深海のリトルクライ__sasakure.uk" を分解する (SoT 04 付録)', () => {
    const result = parseSongKey('深海のリトルクライ__sasakure.uk');
    assert.deepEqual(result, {
      normalizedTitle: '深海のリトルクライ',
      normalizedArtist: 'sasakure.uk',
    });
  });

  it('artist が空の場合 (artist 部が "__" の後ろが空): normalizedArtist は空文字', () => {
    const result = parseSongKey('テスト曲__');
    assert.deepEqual(result, {
      normalizedTitle: 'テスト曲',
      normalizedArtist: '',
    });
  });

  it('区切りなし: normalizedTitle のみ、normalizedArtist は空文字', () => {
    const result = parseSongKey('セパレータなし');
    assert.deepEqual(result, {
      normalizedTitle: 'セパレータなし',
      normalizedArtist: '',
    });
  });

  it('区切り複数 (title に __ が含まれる場合): 最初の __ で分割する', () => {
    // buildSongKey は normalizedKey を通すため実際には起きにくいが、
    // 外部から渡された場合も安全に処理できることを確認する
    const result = parseSongKey('title__with__underscore__artist');
    assert.deepEqual(result, {
      normalizedTitle: 'title',
      normalizedArtist: 'with__underscore__artist',
    });
  });

  it('空文字: normalizedTitle・normalizedArtist ともに空文字', () => {
    const result = parseSongKey('');
    assert.deepEqual(result, {
      normalizedTitle: '',
      normalizedArtist: '',
    });
  });

  it('null: 空文字として扱う', () => {
    const result = parseSongKey(/** @type {any} */ (null));
    assert.deepEqual(result, {
      normalizedTitle: '',
      normalizedArtist: '',
    });
  });

  it('buildSongKey で生成したキーを parseSongKey で分解できる (ラウンドトリップ)', () => {
    const title = 'one last kiss';
    const artist = '宇多田ヒカル';
    const key = buildSongKey(title, artist);
    const result = parseSongKey(key);
    assert.equal(result.normalizedTitle, title);
    assert.equal(result.normalizedArtist, artist);
  });

  it('(不明) アーティストのラウンドトリップ: artist 部は空文字', () => {
    const key = buildSongKey('テスト曲', UNKNOWN_ARTIST_NAME);
    const result = parseSongKey(key);
    assert.equal(result.normalizedTitle, 'テスト曲');
    assert.equal(result.normalizedArtist, '');
  });
});
