/**
 * @file genre.test.js
 * @description genre.js ドメイン関数のユニットテスト (Phase 1.5 版)。
 *   Node.js 組み込みテストランナー (node:test) を使用。
 *
 * ## カバレッジ方針
 * - GENRE_LIST: 10 値固定 / freeze / 期待値配列との完全一致
 * - isValidGenre: 各 GENRE_LIST 要素 / 境界値 / 無効値
 * - parseGenre: 正常値 / 空白付き / NFKC 全角変換 / sentinel / 未知の値
 * - DEFAULT_GENRE / UNCATEGORIZED 定数の確認
 *
 * inferGenre / GENRE_PATTERNS は Phase 1.5 で退避済み。旧テストは git 履歴を参照。
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  DEFAULT_GENRE,
  GENRE_LIST,
  UNCATEGORIZED,
  isValidGenre,
  parseGenre,
} from '../../../src/domain/song/genre.js';

// ---------------------------------------------------------------------------
// GENRE_LIST
// ---------------------------------------------------------------------------

describe('GENRE_LIST', () => {
  it('固定 10 値であること', () => {
    assert.equal(GENRE_LIST.length, 10);
  });

  it('期待するジャンルをすべて含み順序も一致すること', () => {
    const expected = [
      'オリジナル',
      'ディズニー',
      '童謡・唱歌',
      'K-POP',
      'アイドル',
      'ボカロ',
      'ゲーム・キャラソン',
      'アニソン',
      'J-POP',
      '未分類',
    ];
    assert.deepEqual([...GENRE_LIST], expected);
  });

  it('freeze されており変更不可であること', () => {
    assert.ok(Object.isFrozen(GENRE_LIST));
    assert.throws(() => {
      'use strict';
      GENRE_LIST.push('テスト');
    });
  });
});

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

describe('DEFAULT_GENRE / UNCATEGORIZED', () => {
  it('DEFAULT_GENRE は "J-POP"', () => {
    assert.equal(DEFAULT_GENRE, 'J-POP');
  });

  it('UNCATEGORIZED は "未分類"', () => {
    assert.equal(UNCATEGORIZED, '未分類');
  });

  it('DEFAULT_GENRE は GENRE_LIST に含まれる', () => {
    assert.ok(GENRE_LIST.includes(DEFAULT_GENRE));
  });

  it('UNCATEGORIZED は GENRE_LIST に含まれる', () => {
    assert.ok(GENRE_LIST.includes(UNCATEGORIZED));
  });
});

// ---------------------------------------------------------------------------
// isValidGenre
// ---------------------------------------------------------------------------

describe('isValidGenre', () => {
  it('各 GENRE_LIST 要素はすべて true', () => {
    for (const genre of GENRE_LIST) {
      assert.ok(isValidGenre(genre), `isValidGenre("${genre}") は true であるべき`);
    }
  });

  it('"J-POP" → true', () => {
    assert.equal(isValidGenre('J-POP'), true);
  });

  it('"未分類" → true', () => {
    assert.equal(isValidGenre('未分類'), true);
  });

  it('空文字 "" → false', () => {
    assert.equal(isValidGenre(''), false);
  });

  it('null → false', () => {
    assert.equal(isValidGenre(null), false);
  });

  it('undefined → false', () => {
    assert.equal(isValidGenre(undefined), false);
  });

  it('数値 42 → false', () => {
    assert.equal(isValidGenre(42), false);
  });

  it('boolean true → false', () => {
    assert.equal(isValidGenre(true), false);
  });

  it('"foo" → false', () => {
    assert.equal(isValidGenre('foo'), false);
  });

  it('"rock" → false', () => {
    assert.equal(isValidGenre('rock'), false);
  });

  it('全角揺れ "Ｊ-ＰＯＰ" → false (isValidGenre は正規化しない)', () => {
    // isValidGenre は raw 値をそのまま GENRE_SET に照合する。
    // 全角英数は GENRE_SET に存在しないため false。
    // 正規化が必要な場合は parseGenre を使うこと。
    assert.equal(isValidGenre('Ｊ-ＰＯＰ'), false);
  });

  it('前後空白付き " J-POP " → false (isValidGenre は trim しない)', () => {
    assert.equal(isValidGenre(' J-POP '), false);
  });
});

// ---------------------------------------------------------------------------
// parseGenre
// ---------------------------------------------------------------------------

describe('parseGenre — 正常値 (GENRE_LIST そのまま)', () => {
  it('各 GENRE_LIST 要素はそのまま返す', () => {
    for (const genre of GENRE_LIST) {
      assert.equal(parseGenre(genre), genre, `parseGenre("${genre}") は同じ値を返すべき`);
    }
  });

  it('"J-POP" → "J-POP"', () => {
    assert.equal(parseGenre('J-POP'), 'J-POP');
  });

  it('"オリジナル" → "オリジナル"', () => {
    assert.equal(parseGenre('オリジナル'), 'オリジナル');
  });

  it('"未分類" → "未分類"', () => {
    assert.equal(parseGenre('未分類'), '未分類');
  });
});

describe('parseGenre — 空白・正規化', () => {
  it('前後空白付き " J-POP " → "J-POP"', () => {
    assert.equal(parseGenre(' J-POP '), 'J-POP');
  });

  it('前後空白付き "  アニソン  " → "アニソン"', () => {
    assert.equal(parseGenre('  アニソン  '), 'アニソン');
  });

  it('全角英数 "Ｊ-ＰＯＰ" → "J-POP" (NFKC 経由)', () => {
    // cleanMetadata が NFKC 正規化するため全角 → 半角に変換され GENRE_SET にヒットする
    assert.equal(parseGenre('Ｊ-ＰＯＰ'), 'J-POP');
  });

  it('全角 "Ｋ-ＰＯＰ" → "K-POP" (NFKC 経由)', () => {
    assert.equal(parseGenre('Ｋ-ＰＯＰ'), 'K-POP');
  });
});

describe('parseGenre — sentinel (スプレッドシート由来の欠損値)', () => {
  it('"#REF!" → ""', () => {
    assert.equal(parseGenre('#REF!'), '');
  });

  it('"#N/A" → ""', () => {
    assert.equal(parseGenre('#N/A'), '');
  });

  it('"N/A" → ""', () => {
    assert.equal(parseGenre('N/A'), '');
  });

  it('"NULL" → ""', () => {
    assert.equal(parseGenre('NULL'), '');
  });

  it('小文字 "null" → "" (大文字化照合)', () => {
    assert.equal(parseGenre('null'), '');
  });
});

describe('parseGenre — 空・null・undefined', () => {
  it('空文字 "" → ""', () => {
    assert.equal(parseGenre(''), '');
  });

  it('null → ""', () => {
    assert.equal(parseGenre(null), '');
  });

  it('undefined → ""', () => {
    assert.equal(parseGenre(undefined), '');
  });

  it('スペースのみ "   " → ""', () => {
    assert.equal(parseGenre('   '), '');
  });
});

describe('parseGenre — 未知の値', () => {
  it('"rock" → ""', () => {
    assert.equal(parseGenre('rock'), '');
  });

  it('"pop" → ""', () => {
    assert.equal(parseGenre('pop'), '');
  });

  it('"テストジャンル" → ""', () => {
    assert.equal(parseGenre('テストジャンル'), '');
  });

  it('数値 42 → ""', () => {
    assert.equal(parseGenre(42), '');
  });

  it('boolean true → ""', () => {
    assert.equal(parseGenre(true), '');
  });

  it('boolean false → ""', () => {
    assert.equal(parseGenre(false), '');
  });
});
