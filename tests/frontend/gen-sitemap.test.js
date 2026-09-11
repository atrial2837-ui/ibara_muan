// sitemap.xml の組み立てテスト。
// 歌枠が重複せず1URLに畳まれること、タブが漏れないこと、XMLとして壊れないことを見る。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildSitemapEntries, renderSitemap, videoIdFromUrl } from '../../scripts/gen-sitemap.mjs';

const TODAY = '2026-08-15';

const payload = {
  channels: {
    new: [
      { date: '2026-08-14', url: 'https://www.youtube.com/live/j-JIFnd9LEA?si=xxx' },
      { date: '2026-07-01', url: 'https://youtu.be/AAAAAAAAAAA' },
    ],
    old: [
      // 新chと同じ動画。URL 形式が違っても畳まれること
      { date: '2026-08-14', url: 'https://www.youtube.com/watch?v=j-JIFnd9LEA' },
      { date: '', url: 'https://example.com/not-youtube' },
    ],
  },
};

describe('videoIdFromUrl', () => {
  it('live/watch/youtu.be のどれからも取れる', () => {
    assert.equal(videoIdFromUrl('https://www.youtube.com/live/j-JIFnd9LEA?si=x'), 'j-JIFnd9LEA');
    assert.equal(videoIdFromUrl('https://www.youtube.com/watch?v=j-JIFnd9LEA'), 'j-JIFnd9LEA');
    assert.equal(videoIdFromUrl('https://youtu.be/AAAAAAAAAAA'), 'AAAAAAAAAAA');
  });

  it('YouTube以外は空', () => {
    assert.equal(videoIdFromUrl('https://example.com/x'), '');
    assert.equal(videoIdFromUrl(null), '');
  });
});

describe('buildSitemapEntries', () => {
  it('トップと4タブを含む(requests・analyticsは対象外)', () => {
    const locs = buildSitemapEntries(payload, TODAY).map(e => e.loc);
    assert.ok(locs.includes('https://ibara-muan-songlist.pages.dev/'));
    for (const tab of ['ranking', 'songs', 'timeline', 'playlists']) {
      assert.ok(locs.includes(`https://ibara-muan-songlist.pages.dev/?tab=${tab}`), tab);
    }
  });

  it('同じ動画は1件に畳む', () => {
    const locs = buildSitemapEntries(payload, TODAY).map(e => e.loc);
    const hits = locs.filter(l => l.includes('j-JIFnd9LEA'));
    assert.equal(hits.length, 1);
  });

  it('YouTube以外のURLは載せない', () => {
    const locs = buildSitemapEntries(payload, TODAY).map(e => e.loc);
    assert.ok(!locs.some(l => l.includes('example.com')));
  });

  it('配信日を lastmod に使い、無ければ当日にする', () => {
    const entries = buildSitemapEntries(payload, TODAY);
    const stream = entries.find(e => e.loc.includes('j-JIFnd9LEA'));
    assert.equal(stream.lastmod, '2026-08-14');
    assert.ok(entries.every(e => /^\d{4}-\d{2}-\d{2}$/.test(e.lastmod)));
  });

  it('データが空でもトップとタブは出る', () => {
    assert.equal(buildSitemapEntries({}, TODAY).length, 5);
  });
});

describe('renderSitemap', () => {
  it('urlset として妥当な形になる', () => {
    const xml = renderSitemap(buildSitemapEntries(payload, TODAY));
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
    assert.ok(xml.trim().endsWith('</urlset>'));
    const opens = (xml.match(/<url>/g) || []).length;
    const closes = (xml.match(/<\/url>/g) || []).length;
    assert.equal(opens, closes);
  });

  it('& を含む loc をエスケープする', () => {
    const xml = renderSitemap([{ loc: 'https://x/?a=1&b=2', lastmod: TODAY, changefreq: 'daily', priority: '1.0' }]);
    assert.ok(xml.includes('a=1&amp;b=2'));
    assert.ok(!/[^&]&[^a]/.test(xml.replace(/&amp;/g, '')));
  });
});
