// 検索エンジン向けメタの組み立てテスト。
// canonical に q/t を含めない（検索語や再生位置で URL が無限に増えるため）ことと、
// 歌枠を開いているときは歌枠そのものが正規URLになることを重点的に確認する。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SITE_ORIGIN,
  buildCanonical,
  buildPageMeta,
  cleanStreamTitle,
  formatDate,
  truncate,
  sitemapTabs,
} from '../../docs/js/seo-meta.js';

describe('buildCanonical', () => {
  it('既定の状態ではトップを指す', () => {
    assert.equal(buildCanonical({ tab: 'dashboard', channel: 'main' }), `${SITE_ORIGIN}/`);
  });

  it('タブを付ける', () => {
    assert.equal(buildCanonical({ tab: 'songs', channel: 'main' }), `${SITE_ORIGIN}/?tab=songs`);
  });

  it('既定でないチャンネルは残す', () => {
    assert.equal(buildCanonical({ tab: 'songs', channel: 'all' }), `${SITE_ORIGIN}/?tab=songs&ch=all`);
  });

  it('検索語と再生位置は含めない', () => {
    assert.equal(
      buildCanonical({ tab: 'songs', channel: 'main', q: 'アイリス', t: 120 }),
      `${SITE_ORIGIN}/?tab=songs`,
    );
  });

  it('歌枠を開いているときは歌枠が正規URLになり、タブは付かない', () => {
    assert.equal(
      buildCanonical({ tab: 'timeline', channel: 'main', v: 'j-JIFnd9LEA', t: 300 }),
      `${SITE_ORIGIN}/?v=j-JIFnd9LEA`,
    );
  });
});

describe('cleanStreamTitle', () => {
  it('【】と先頭タグと区切り記号を落とす', () => {
    const raw = '#歌枠 ⌇金曜20時の定期歌枠!#69🐟🎤初見さん大歓迎!singing stream【夢川かなう/リアクト/Vtuber】';
    const cleaned = cleanStreamTitle(raw);
    assert.ok(!cleaned.includes('【'));
    assert.ok(!cleaned.startsWith('#歌枠'));
    assert.ok(!cleaned.includes('⌇'));
    assert.ok(cleaned.startsWith('金曜20時の定期歌枠'));
  });

  it('回数を表す #69 は情報なので残す', () => {
    assert.ok(cleanStreamTitle('#歌枠 ⌇定期歌枠!#69🐟').includes('#69'));
  });

  it('空でも落ちない', () => {
    assert.equal(cleanStreamTitle(null), '');
  });
});

describe('formatDate', () => {
  it('Date を YYYY-MM-DD にする', () => {
    assert.equal(formatDate(new Date(2026, 7, 14)), '2026-08-14');
  });

  it('文字列の日付はそのまま日付部分を取る', () => {
    assert.equal(formatDate('2026-08-14T00:00:00+09:00'), '2026-08-14');
  });

  it('空や不正な値は空文字', () => {
    assert.equal(formatDate(null), '');
    assert.equal(formatDate(new Date('nope')), '');
  });
});

describe('truncate', () => {
  it('上限以下はそのまま', () => {
    assert.equal(truncate('あいうえお', 5), 'あいうえお');
  });

  it('超えたら省略記号を付けて上限に収める', () => {
    const out = truncate('あいうえおかきくけこ', 6);
    assert.equal(out.length, 6);
    assert.ok(out.endsWith('…'));
  });
});

describe('buildPageMeta', () => {
  it('トップは既定のタイトルと説明', () => {
    const meta = buildPageMeta({ tab: 'dashboard', channel: 'main' });
    assert.match(meta.title, /歌唱データベース/);
    assert.ok(meta.description.length > 20);
    assert.equal(meta.canonical, `${SITE_ORIGIN}/`);
  });

  it('タブごとに別のタイトルと説明になる', () => {
    const a = buildPageMeta({ tab: 'ranking', channel: 'main' });
    const b = buildPageMeta({ tab: 'timeline', channel: 'main' });
    assert.notEqual(a.title, b.title);
    assert.notEqual(a.description, b.description);
    assert.match(a.title, /ランキング/);
  });

  it('旧タブはトップ扱いに落ちる', () => {
    const meta = buildPageMeta({ tab: 'analytics', channel: 'main' });
    assert.match(meta.title, /歌唱データベース/);
    assert.equal(meta.canonical, `${SITE_ORIGIN}/`);
  });

  it('旧タブの canonical もトップに寄る', () => {
    assert.equal(buildCanonical({ tab: 'analytics', channel: 'main' }), `${SITE_ORIGIN}/`);
    assert.equal(buildCanonical({ tab: 'ranking', channel: 'all' }), `${SITE_ORIGIN}/?tab=ranking&ch=all`);
  });

  it('単チャンネルのためチャンネル接尾辞は付かない', () => {
    const meta = buildPageMeta({ tab: 'songs', channel: 'main' });
    assert.match(meta.title, /全曲リスト/);
    assert.ok(!meta.title.includes('（'));
  });

  it('歌枠を開いているときは歌枠名と曲数を出す', () => {
    const meta = buildPageMeta(
      { tab: 'timeline', channel: 'main', v: 'j-JIFnd9LEA' },
      { stream: { title: '#歌枠 ⌇金曜20時の定期歌枠!#69', date: new Date(2026, 7, 14), songCount: 22 } },
    );
    assert.match(meta.title, /金曜20時の定期歌枠/);
    assert.match(meta.description, /2026-08-14/);
    assert.ok(!/GMT|標準時/.test(meta.description));
    assert.match(meta.description, /全22曲/);
    assert.equal(meta.canonical, `${SITE_ORIGIN}/?v=j-JIFnd9LEA`);
  });

  it('歌枠IDだけあって中身が見つからないときはタブのメタに落ちる', () => {
    const meta = buildPageMeta({ tab: 'timeline', channel: 'main', v: 'j-JIFnd9LEA' }, {});
    assert.match(meta.title, /タイムライン/);
    assert.equal(meta.canonical, `${SITE_ORIGIN}/?v=j-JIFnd9LEA`);
  });

  it('未知のタブはトップ扱いにする', () => {
    const meta = buildPageMeta({ tab: 'nope', channel: 'main' });
    assert.match(meta.title, /歌唱データベース/);
  });
});

describe('sitemapTabs', () => {
  it('5タブすべてを返す（分析はダッシュボード内のセクション、リクエストは未移植）', () => {
    const tabs = sitemapTabs();
    assert.equal(tabs.length, 5);
    assert.ok(tabs.includes('dashboard'));
    assert.ok(tabs.includes('ranking'));
    assert.ok(tabs.includes('playlists'));
    assert.ok(!tabs.includes('analytics'));
    assert.ok(!tabs.includes('requests'));
  });
});
