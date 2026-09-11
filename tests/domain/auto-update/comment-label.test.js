/**
 * @file tests/domain/auto-update/comment-label.test.js
 * @description domain/auto-update/comment-label の単体テスト (Node built-in test runner)
 *
 * 実行方法: node --test tests/domain/auto-update/comment-label.test.js
 *
 * 実例は 2026-09 のスキャン結果(ibara_muan)のコメント記法に基づく。
 * サイトの正規表記は読み仮名なし・タイトル内の `[` 使用ゼロであることを
 * docs/data/songs.json で確認済み。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCommentLabel, stripTrackNumber } from '../../../src/domain/auto-update/comment-label.js';
import { buildSongsText } from '../../../src/domain/auto-update/classify.js';
import { splitSongLine } from '../../../src/domain/stream/setlist-parser.js';
import { buildSongMaps, resolveExistingSong } from '../../../src/domain/stream/song-resolver.js';
import { buildSongKey } from '../../../src/domain/song/song-key.js';
import { normalizedKey } from '../../../src/domain/shared/text.js';

// ─── cleanCommentLabel ──────────────────────────────────────────────────────

test('cleanCommentLabel: ローマ字読みの [...] を落とす', () => {
  assert.equal(cleanCommentLabel('レオ[Leo] / 優里'), 'レオ / 優里');
  assert.equal(cleanCommentLabel('ダーリン[Darling] / Mrs. GREEN APPLE'), 'ダーリン / Mrs. GREEN APPLE');
  assert.equal(
    cleanCommentLabel('一番の宝物[Ichiban No Takaramono] / Girls'),
    '一番の宝物 / Girls',
  );
  assert.equal(
    cleanCommentLabel('あの夏が飽和する。[Ano natsu ga houwa suru.] / カンザキイオリ'),
    'あの夏が飽和する。 / カンザキイオリ',
  );
});

test('cleanCommentLabel: 日本語を含む [...] は残す', () => {
  assert.equal(cleanCommentLabel('曲名[日本語注釈] / アーティスト'), '曲名[日本語注釈] / アーティスト');
});

test('cleanCommentLabel: 長音マクロン付きの読みも落とす', () => {
  assert.equal(cleanCommentLabel('六等星[Rokutōsei] / ざらめ'), '六等星 / ざらめ');
  assert.equal(cleanCommentLabel('平行線[heikōsen] / さユり'), '平行線 / さユり');
  assert.equal(cleanCommentLabel('心拍数#0822[Heart Rate#0822] / 蝶々P'), '心拍数#0822 / 蝶々P');
});
test('cleanCommentLabel: 読みの記号(! ? , など)を含む [...] も落とす', () => {
  assert.equal(cleanCommentLabel('イェイ!イェイ!イェイ![Yey!Yey!Yey!] / とみたけ'), 'イェイ!イェイ!イェイ! / とみたけ');
  assert.equal(
    cleanCommentLabel('おやすみ泣き声、さよなら歌姫[Goodnight Cries, Good-bye Singing Princess] / クリープハイプ'),
    'おやすみ泣き声、さよなら歌姫 / クリープハイプ',
  );
});

test('cleanCommentLabel: 曲末の「。」は残す(サイトにも存在する表記)', () => {
  assert.equal(cleanCommentLabel('あの夏が飽和する。 / カンザキイオリ'), 'あの夏が飽和する。 / カンザキイオリ');
});

test('cleanCommentLabel: 空・読みのみは空文字', () => {
  assert.equal(cleanCommentLabel(''), '');
  assert.equal(cleanCommentLabel('   '), '');
  assert.equal(cleanCommentLabel(null), '');
});

test('stripTrackNumber: 「01. 」と「⟦01⟧ 」を落とす', () => {
  assert.equal(stripTrackNumber('01. Sincerely / TRUE'), 'Sincerely / TRUE');
  assert.equal(stripTrackNumber('13. エイリアンエイリアン-Remix ver- / ナユタン星人'), 'エイリアンエイリアン-Remix ver- / ナユタン星人');
  assert.equal(stripTrackNumber('⟦01⟧ 雨とカプチーノ'), '雨とカプチーノ');
  assert.equal(stripTrackNumber('レオ / 優里'), 'レオ / 優里');
});

test('stripTrackNumber: バージョン番号風タイトルは削らない', () => {
  assert.equal(stripTrackNumber('8.32'), '8.32');
  assert.equal(stripTrackNumber('8.32 / *Luna'), '8.32 / *Luna');
});

// ─── buildSongsText との統合 ────────────────────────────────────────────────

test('buildSongsText: 連番+読み仮名付きを行ごと正規表記に寄せる', () => {
  const built = buildSongsText([
    { raw: '00:06:54', label: '01. Sincerely / TRUE' },
    { raw: '00:32:27', label: '03. レオ[Leo] / 優里' },
    { raw: '01:00:39', label: '06. ダーリン[Darling] / Mrs. GREEN APPLE' },
  ]);
  assert.equal(built.lines, 3);
  assert.equal(built.text, 'Sincerely / TRUE\nレオ / 優里\nダーリン / Mrs. GREEN APPLE');
});

test('buildSongsText: 「曲名 / アーティスト」形以外は除外する', () => {
  const built = buildSongsText([
    { raw: '08:21', label: 'HOT LIMIT / T.M.Revolution' },
    { raw: '27:10', label: 'Happiness' },
    { raw: '31:42', label: '雑談タイム' },
    { raw: '40:00', label: 'https://example.com/foo/bar' },
    { raw: '50:00', label: '/ アーティストのみ' },
    { raw: '55:00', label: '曲名のみ /' },
  ]);
  assert.equal(built.lines, 1);
  assert.equal(built.skipped, 5);
  assert.equal(built.text, 'HOT LIMIT / T.M.Revolution');
});

// ─── 既存曲解決との統合(サイト表記との突合) ────────────────────────────────

function siteRow(id, title, artist) {
  return {
    id,
    title,
    normalized_title: normalizedKey(title),
    artist,
    song_key: buildSongKey(title, artist),
  };
}

test('クリーニング後の行は既存曲に exact/title マッチする', () => {
  const maps = buildSongMaps([
    siteRow(1, 'レオ', '優里'),
    siteRow(2, 'ダーリン', '須田景凪'),
    siteRow(3, 'ダーリン', 'Mrs. GREEN APPLE'),
    siteRow(4, '一番の宝物', 'Girls Dead Monster'),
    siteRow(5, 'あの夏が飽和する。', 'カンザキイオリ'),
  ]);

  // 「03. レオ[Leo] / 優里」→ exact
  let parsed = splitSongLine(cleanCommentLabel('03. レオ[Leo] / 優里').replace(/^\d{1,3}\.\s*/, ''));
  let resolved = resolveExistingSong(parsed, maps);
  assert.equal(resolved.match, 'exact');
  assert.equal(resolved.song.id, 1);

  // 「06. ダーリン[Darling] / Mrs. GREEN APPLE」→ exact(同名異アーティストがいても)
  parsed = splitSongLine(cleanCommentLabel('06. ダーリン[Darling] / Mrs. GREEN APPLE').replace(/^\d{1,3}\.\s*/, ''));
  resolved = resolveExistingSong(parsed, maps);
  assert.equal(resolved.match, 'exact');
  assert.equal(resolved.song.id, 3);

  // 「04. 一番の宝物[...] / Girls」→ アーティストは違うがタイトル単一なので title マッチ
  parsed = splitSongLine(cleanCommentLabel('04. 一番の宝物[Ichiban No Takaramono] / Girls').replace(/^\d{1,3}\.\s*/, ''));
  resolved = resolveExistingSong(parsed, maps);
  assert.equal(resolved.match, 'title');
  assert.equal(resolved.song.id, 4);

  // クリーニング無しだと別曲(new)になることを確認(改善の根拠)
  const raw = splitSongLine('レオ[Leo] / 優里');
  assert.equal(resolveExistingSong(raw, maps).match, 'new');
});
