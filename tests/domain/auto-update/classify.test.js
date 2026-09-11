/**
 * @file tests/domain/auto-update/classify.test.js
 * @description domain/auto-update/classify の単体テスト (Node built-in test runner)
 *
 * 実行方法: node --test tests/domain/auto-update/classify.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSongsText,
  classifyScanEntry,
  extractVideoId,
  isUtawakuTitle,
  toStreamedOn,
} from '../../../src/domain/auto-update/classify.js';

// ─── isUtawakuTitle ───────────────────────────────────────────────────────────

test('isUtawakuTitle: タイトルに歌枠を含むものだけ対象', () => {
  assert.equal(isUtawakuTitle('【 #歌枠 】火曜定期'), true);
  assert.equal(isUtawakuTitle('【 #雑談 】今月も生きてこ'), false);
  assert.equal(isUtawakuTitle('Distant Letter / 茨むあん -Official Music Video-'), false);
  assert.equal(isUtawakuTitle(''), false);
});

// ─── extractVideoId ───────────────────────────────────────────────────────────

test('extractVideoId: 各種URLから11文字IDを抜く', () => {
  assert.equal(extractVideoId('https://www.youtube.com/watch?v=3kt1mvk4sfE'), '3kt1mvk4sfE');
  assert.equal(extractVideoId('https://youtu.be/3kt1mvk4sfE'), '3kt1mvk4sfE');
  assert.equal(extractVideoId('not a url'), null);
});

// ─── toStreamedOn ─────────────────────────────────────────────────────────────

test('toStreamedOn: UTC publishedAt を JST 日付に変換する', () => {
  // 2026-09-08T15:48:32Z は JST 2026-09-09 00:48
  assert.equal(toStreamedOn('2026-09-08T15:48:32+00:00'), '2026-09-09');
  // JST 23時台に収まるものは同日
  assert.equal(toStreamedOn('2026-09-05T06:04:03+00:00'), '2026-09-05');
  assert.equal(toStreamedOn('invalid'), '');
});

// ─── buildSongsText ───────────────────────────────────────────────────────────

test('buildSongsText: 空ラベルを落として改行テキスト化する', () => {
  const built = buildSongsText([
    { raw: '8:21', label: 'HOT LIMIT / T.M.Revolution' },
    { raw: '16:53', label: '' },
    { raw: '27:10', label: 'Happiness' },
  ]);
  assert.equal(built.lines, 2);
  assert.equal(built.skipped, 1);
  assert.equal(built.text, 'HOT LIMIT / T.M.Revolution\nHappiness');
});

test('buildSongsText: 先頭の連番「01. 」を落とす', () => {
  const built = buildSongsText([
    { raw: '00:06:54', label: '01. Sincerely / TRUE' },
    { raw: '00:21:58', label: '02. letter song / Doriko' },
  ]);
  assert.equal(built.text, 'Sincerely / TRUE\nletter song / Doriko');
});

// ─── classifyScanEntry: auto ──────────────────────────────────────────────────

test('classifyScanEntry: found かつ件数十分・候補単一なら auto', () => {
  const result = classifyScanEntry(
    {
      status: 'found',
      timestampCount: 15,
      matches: [{ commentId: 'a' }],
      timestamps: [
        { raw: '8:21', label: 'HOT LIMIT / T.M.Revolution' },
        { raw: '27:10', label: 'Happiness' },
      ],
    },
    { minTimestamps: 8 },
  );
  assert.equal(result.setlistVerdict, 'auto');
  assert.equal(result.frameOnly, false);
  assert.equal(result.songLines, 2);
});

// ─── classifyScanEntry: review ────────────────────────────────────────────────

test('classifyScanEntry: 件数不足は review(枠のみ先行)', () => {
  const result = classifyScanEntry(
    {
      status: 'found',
      timestampCount: 4,
      matches: [{ commentId: 'a' }],
      timestamps: [{ raw: '8:21', label: 'HOT LIMIT' }],
    },
    { minTimestamps: 8 },
  );
  assert.equal(result.setlistVerdict, 'review');
  assert.equal(result.frameOnly, true);
  assert.match(result.reason, /below_threshold/);
});

test('classifyScanEntry: 複数候補は review', () => {
  const result = classifyScanEntry(
    {
      status: 'found',
      timestampCount: 20,
      matches: [{ commentId: 'a' }, { commentId: 'b' }, { commentId: 'c' }],
      timestamps: [{ raw: '8:21', label: 'HOT LIMIT' }],
    },
    { minTimestamps: 8, maxMatches: 2 },
  );
  assert.equal(result.setlistVerdict, 'review');
  assert.match(result.reason, /multiple_candidates/);
});

test('classifyScanEntry: not_found / comments_disabled は review(枠のみ)', () => {
  const notFound = classifyScanEntry({ status: 'not_found' });
  assert.equal(notFound.setlistVerdict, 'review');
  assert.equal(notFound.frameOnly, true);

  const disabled = classifyScanEntry({ status: 'comments_disabled' });
  assert.equal(disabled.setlistVerdict, 'review');
  assert.equal(disabled.frameOnly, true);
});

test('classifyScanEntry: video_unavailable / error は none(何もしない)', () => {
  assert.equal(classifyScanEntry({ status: 'video_unavailable' }).setlistVerdict, 'none');
  assert.equal(classifyScanEntry({ status: 'error' }).setlistVerdict, 'none');
});
