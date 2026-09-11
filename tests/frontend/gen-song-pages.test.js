// 曲ごとの静的ページ生成のテスト。
// URL は一度公開すると変えられないので、スラッグが安定していること（データの増減で
// 既存URLがずれないこと）と、HTMLエスケープ漏れが無いことを重点的に見る。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assignSlugs,
  buildNotFoundPage,
  buildSongIndexPage,
  buildSongPage,
  collectPerformances,
  escapeHtml,
  formatSeconds,
  mergeSongs,
  repairMojibake,
  songSlug,
  videoIdFromUrl,
  youtubeUrlAt,
} from '../../scripts/gen-song-pages.mjs';

const songsPayload = {
  channels: {
    new: [
      { key: 'catch you catch me__グミ', title: 'Catch You Catch Me', artist: 'グミ', count: 27, genre: 'アニソン', displayKey: '原キー' },
      { key: 'アイリス__夢川かなう', title: 'アイリス', artist: '夢川かなう', count: 3, genre: 'オリジナル', displayKey: '' },
    ],
    old: [
      { key: 'catch you catch me__グミ', title: 'Catch You Catch Me', artist: 'グミ', count: 5, genre: '', displayKey: '' },
    ],
  },
};

const streamsPayload = {
  channels: {
    new: [
      {
        date: '2026-08-14', title: '定期歌枠 #69', url: 'https://www.youtube.com/live/j-JIFnd9LEA?si=x', channel: 'new',
        songs: [{ key: 'catch you catch me__グミ', t: 3725 }, { key: 'アイリス__夢川かなう' }],
      },
      {
        date: '2026-07-01', title: '歌枠 #68', url: 'https://youtu.be/AAAAAAAAAAA', channel: 'new',
        songs: [{ key: 'catch you catch me__グミ', t: 90 }],
      },
    ],
  },
};

describe('songSlug', () => {
  it('日本語は残しつつ空白をハイフンにする', () => {
    assert.equal(songSlug('夜に駆ける', 'YOASOBI'), '夜に駆ける-yoasobi');
  });

  it('ファイル名に使えない文字を落とす', () => {
    const slug = songSlug('A/B:C*D?E"F<G>H|I', 'x');
    assert.ok(!/[\\/:*?"<>|]/.test(slug));
  });

  it('長すぎるタイトルは切り詰める', () => {
    assert.ok(songSlug('あ'.repeat(200), 'い'.repeat(200)).length <= 60);
  });

  it('空でも何か返す', () => {
    assert.equal(songSlug('', ''), 'song');
  });
});

describe('assignSlugs', () => {
  it('曲ごとに一意なスラッグを割り当てる', () => {
    const songs = mergeSongs(songsPayload);
    const map = assignSlugs(songs);
    assert.equal(new Set(map.values()).size, songs.length);
  });

  it('衝突したらキーのハッシュで区別する', () => {
    const songs = [
      { key: 'a__x', title: 'A', artist: 'X', count: 1 },
      { key: 'b__x', title: 'A/', artist: 'X', count: 1 },
    ];
    const map = assignSlugs(songs);
    assert.notEqual(map.get('a__x'), map.get('b__x'));
  });

  it('曲が増えても既存のスラッグは変わらない', () => {
    const base = [{ key: 'a__x', title: 'A', artist: 'X', count: 1 }];
    const before = assignSlugs(base).get('a__x');
    const after = assignSlugs([...base, { key: 'z__y', title: 'Z', artist: 'Y', count: 1 }]).get('a__x');
    assert.equal(before, after);
  });
});

describe('mergeSongs', () => {
  it('新旧chの歌唱回数を合算して1曲にまとめる', () => {
    const merged = mergeSongs(songsPayload);
    assert.equal(merged.length, 2);
    const catchYou = merged.find(s => s.key === 'catch you catch me__グミ');
    assert.equal(catchYou.count, 32);
    assert.equal(catchYou.genre, 'アニソン');
  });

  it('空でも落ちない', () => {
    assert.deepEqual(mergeSongs({}), []);
  });
});

describe('collectPerformances', () => {
  it('曲キーごとに歌枠を新しい順で集める', () => {
    const plays = collectPerformances(streamsPayload);
    const list = plays.get('catch you catch me__グミ');
    assert.equal(list.length, 2);
    assert.equal(list[0].date, '2026-08-14');
    assert.equal(list[0].t, 3725);
  });

  it('タイムスタンプが無い曲は t が null', () => {
    const list = collectPerformances(streamsPayload).get('アイリス__夢川かなう');
    assert.equal(list[0].t, null);
  });
});

describe('formatSeconds / youtubeUrlAt / videoIdFromUrl', () => {
  it('1時間を超えたら h:mm:ss', () => {
    assert.equal(formatSeconds(3725), '1:02:05');
    assert.equal(formatSeconds(90), '1:30');
  });

  it('開始秒つきのYouTube URLを作る', () => {
    assert.equal(youtubeUrlAt('https://youtu.be/AAAAAAAAAAA?si=x', 90), 'https://youtu.be/AAAAAAAAAAA?t=90');
    assert.equal(youtubeUrlAt('https://youtu.be/AAAAAAAAAAA', 0), 'https://youtu.be/AAAAAAAAAAA');
  });

  it('動画IDを取り出す', () => {
    assert.equal(videoIdFromUrl('https://www.youtube.com/live/j-JIFnd9LEA?si=x'), 'j-JIFnd9LEA');
    assert.equal(videoIdFromUrl('https://example.com'), '');
  });
});

describe('escapeHtml', () => {
  it('タグと引用符を無害化する', () => {
    assert.equal(escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  });
});

describe('buildSongPage', () => {
  const song = mergeSongs(songsPayload).find(s => s.key === 'catch you catch me__グミ');
  const plays = collectPerformances(streamsPayload).get('catch you catch me__グミ');
  const html = buildSongPage(song, plays, 'catch-you-catch-me-グミ');

  it('曲名・アーティスト・歌唱回数が素のHTMLに入る', () => {
    assert.ok(html.includes('<h1>Catch You Catch Me</h1>'));
    assert.ok(html.includes('グミ'));
    assert.ok(html.includes('32回'));
  });

  it('canonical が自分自身(拡張子なし)を指す', () => {
    assert.ok(html.includes('rel="canonical" href="https://ibara-muan-songlist.pages.dev/song/catch-you-catch-me-グミ"'));
    assert.ok(!html.includes('catch-you-catch-me-グミ.html'));
  });

  it('独自文章として初披露・最新・回数・ジャンルを出す', () => {
    assert.ok(html.includes('これまで32回歌唱しています'));
    assert.ok(html.includes('初めて歌われたのは'));
    assert.ok(html.includes('最新の歌唱は'));
  });

  it('歌枠ごとに開始時刻つきのYouTubeリンクを出す', () => {
    assert.ok(html.includes('https://www.youtube.com/live/j-JIFnd9LEA?t=3725'));
    assert.ok(html.includes('1:02:05'));
  });

  it('サイト内の歌枠ページへも導線がある', () => {
    assert.ok(html.includes('/?v=j-JIFnd9LEA&amp;t=3725'));
  });

  it('JSON-LD が妥当なJSONになっている', () => {
    const m = html.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/);
    assert.ok(m, 'JSON-LD が見つからない');
    const parsed = JSON.parse(m[1]);
    assert.equal(parsed['@type'], 'WebPage');
    assert.equal(parsed.breadcrumb.itemListElement.length, 3);
  });

  it('ファンサイトである旨を明記する', () => {
    assert.ok(html.includes('ファンサイト'));
    assert.ok(html.includes('関係ありません'));
  });

  it('歌枠が0件でも壊れない', () => {
    const empty = buildSongPage(song, [], 'x');
    assert.ok(empty.includes('歌枠の記録がまだありません'));
  });
});

describe('repairMojibake', () => {
  // UTF-8 バイト列を Latin-1 として読んでしまった状態を作る
  const mangle = (s) => Buffer.from(s, 'utf-8').toString('latin1');

  it('化けた日本語パスを元に戻す', () => {
    const original = '/song/catch-you-catch-me-グミ.html';
    assert.equal(repairMojibake(mangle(original)), original);
  });

  it('もともと正しい日本語パスは触らない', () => {
    assert.equal(repairMojibake('/song/catch-you-catch-me-グミ.html'), '');
  });

  it('ASCIIだけのパスは触らない', () => {
    assert.equal(repairMojibake('/song/not-here.html'), '');
  });

  it('UTF-8として解釈できないバイト列は諦める', () => {
    assert.equal(repairMojibake('/song/\xFF\xFE.html'), '');
  });

  it('空でも落ちない', () => {
    assert.equal(repairMojibake(''), '');
    assert.equal(repairMojibake(null), '');
  });

  it('復元後をもう一度かけても何も起きない（ループしない）', () => {
    const original = '/song/夜に駆ける-yoasobi.html';
    const fixed = repairMojibake(mangle(original));
    assert.equal(fixed, original);
    assert.equal(repairMojibake(fixed), '');
  });
});

describe('buildNotFoundPage', () => {
  const html = buildNotFoundPage();

  it('化けたURLを復元して飛ばし直すスクリプトを持つ', () => {
    assert.ok(html.includes('TextDecoder'));
    assert.ok(html.includes('location.replace'));
  });

  it('見つからない旨と探し直す導線を出す', () => {
    assert.ok(html.includes('<h1>ページが見つかりません</h1>'));
    assert.ok(html.includes('href="/song/"'));
    assert.ok(html.includes('href="/?tab=songs"'));
  });

  it('検索エンジンには載せない', () => {
    assert.ok(html.includes('content="noindex,follow"'));
  });

  it('通常ページは noindex にしない', () => {
    const song = { key: 'a__x', title: 'A', artist: 'X', count: 1, genre: '', displayKey: '' };
    assert.ok(!buildSongPage(song, [], 'a-x').includes('noindex'));
  });
});

describe('buildSongIndexPage', () => {
  it('歌唱回数の多い順に全曲を並べる', () => {
    const songs = mergeSongs(songsPayload);
    const slugs = assignSlugs(songs);
    const entries = songs.map(song => ({ song, slug: slugs.get(song.key), performances: [] }));
    const html = buildSongIndexPage(entries);
    assert.ok(html.includes('曲一覧'));
    const first = html.indexOf('Catch You Catch Me');
    const second = html.indexOf('アイリス');
    assert.ok(first > 0 && second > 0 && first < second, '回数の多い曲が先に来る');
  });
});
