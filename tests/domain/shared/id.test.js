/**
 * @fileoverview shared/id.js のテストスイート
 * Clean Architecture Domain 層の純粋関数テスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractYoutubeVideoId,
  youtubeThumbUrl,
  youtubeMaxThumb,
  youtubeHqThumb,
  youtubeDefaultThumb,
} from '../../../src/domain/shared/id.js';

describe('extractYoutubeVideoId', () => {
  it('youtu.be URL から ID を抽出', () => {
    assert.strictEqual(
      extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );
  });

  it('youtube.com/watch?v= URL から ID を抽出', () => {
    assert.strictEqual(
      extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );
  });

  it('youtube.com/watch?v= (複数パラメータ) から ID を抽出', () => {
    assert.strictEqual(
      extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s'),
      'dQw4w9WgXcQ'
    );
  });

  it('youtube.com/live/ URL から ID を抽出', () => {
    assert.strictEqual(
      extractYoutubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );
  });

  it('youtube.com/shorts/ URL から ID を抽出', () => {
    assert.strictEqual(
      extractYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );
  });

  it('youtube.com/embed/ URL から ID を抽出', () => {
    assert.strictEqual(
      extractYoutubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );
  });

  it('無効な URL は null を返す', () => {
    assert.strictEqual(extractYoutubeVideoId('https://example.com'), null);
  });

  it('空文字列は null を返す', () => {
    assert.strictEqual(extractYoutubeVideoId(''), null);
  });

  it('null は null を返す', () => {
    assert.strictEqual(extractYoutubeVideoId(null), null);
  });

  it('undefined は null を返す', () => {
    assert.strictEqual(extractYoutubeVideoId(undefined), null);
  });

  it('数値は文字列化してから処理', () => {
    // 数値を渡されても String() で文字列化されるため、パターンマッチ失敗 → null
    assert.strictEqual(extractYoutubeVideoId(12345), null);
  });

  it('URL 内に 11 文字未満の ID は抽出しない', () => {
    assert.strictEqual(extractYoutubeVideoId('https://youtu.be/short'), null);
  });

  it('URL 内に 11 文字以上の ID は抽出しない（最初の 11 文字のみ）', () => {
    // パターンは最初にマッチした 11 文字を抽出
    assert.strictEqual(
      extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQextra'),
      'dQw4w9WgXcQ'
    );
  });
});

describe('youtubeThumbUrl', () => {
  const testUrl = 'https://youtu.be/dQw4w9WgXcQ';

  it('デフォルト quality (hq) で hqdefault.jpg を返す', () => {
    assert.strictEqual(
      youtubeThumbUrl(testUrl),
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('quality=hq で hqdefault.jpg を返す', () => {
    assert.strictEqual(
      youtubeThumbUrl(testUrl, 'hq'),
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('quality=mq で mqdefault.jpg を返す', () => {
    assert.strictEqual(
      youtubeThumbUrl(testUrl, 'mq'),
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
    );
  });

  it('quality=default で default.jpg を返す', () => {
    assert.strictEqual(
      youtubeThumbUrl(testUrl, 'default'),
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg'
    );
  });

  it('無効な quality はデフォルト (hq) を使う', () => {
    assert.strictEqual(
      youtubeThumbUrl(testUrl, 'invalid'),
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('無効な URL は空文字を返す', () => {
    assert.strictEqual(youtubeThumbUrl('https://example.com'), '');
  });

  it('null URL は空文字を返す', () => {
    assert.strictEqual(youtubeThumbUrl(null), '');
  });

  it('undefined URL は空文字を返す', () => {
    assert.strictEqual(youtubeThumbUrl(undefined), '');
  });

  it('空文字列 URL は空文字を返す', () => {
    assert.strictEqual(youtubeThumbUrl(''), '');
  });
});

describe('互換性関数', () => {
  const testUrl = 'https://youtu.be/dQw4w9WgXcQ';

  it('youtubeMaxThumb は hqdefault.jpg を返す', () => {
    assert.strictEqual(
      youtubeMaxThumb(testUrl),
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('youtubeHqThumb は mqdefault.jpg を返す', () => {
    assert.strictEqual(
      youtubeHqThumb(testUrl),
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
    );
  });

  it('youtubeDefaultThumb は default.jpg を返す', () => {
    assert.strictEqual(
      youtubeDefaultThumb(testUrl),
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg'
    );
  });

  it('互換性関数も無効 URL で空文字を返す', () => {
    assert.strictEqual(youtubeMaxThumb(''), '');
    assert.strictEqual(youtubeHqThumb(''), '');
    assert.strictEqual(youtubeDefaultThumb(''), '');
  });
});

describe('既存振る舞い完全再現', () => {
  // 既存 main.js の youtubeThumb, youtubeThumbFallback, youtubeThumbTiny と同等か確認

  it('youtubeMaxThumb === 既存 youtubeThumb', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const id = 'dQw4w9WgXcQ';
    assert.strictEqual(
      youtubeMaxThumb(url),
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    );
  });

  it('youtubeHqThumb === 既存 youtubeThumbFallback', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const id = 'dQw4w9WgXcQ';
    assert.strictEqual(
      youtubeHqThumb(url),
      `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
    );
  });

  it('youtubeDefaultThumb === 既存 youtubeThumbTiny', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const id = 'dQw4w9WgXcQ';
    assert.strictEqual(
      youtubeDefaultThumb(url),
      `https://i.ytimg.com/vi/${id}/default.jpg`
    );
  });

  it('既존 youtubeVideoId와 extractYoutubeVideoId 동등', () => {
    const urls = [
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/live/dQw4w9WgXcQ',
    ];
    urls.forEach(url => {
      assert.strictEqual(extractYoutubeVideoId(url), 'dQw4w9WgXcQ');
    });
  });
});
