/**
 * @file tools/audit_d1_notation.mjs
 * @description D1内の表記ゆれ・未整備データを監査する(読み取り専用)。
 *
 * 新ルール(読み仮名除去・曲名/アーティスト形のみ)導入前に手入力された
 * データの洗い出し用。D1への書き込みは一切行わない。
 *
 * 使い方:
 *   $env:CLOUDFLARE_ACCOUNT_ID='xxx'
 *   $env:CLOUDFLARE_D1_DATABASE_ID='yyy'
 *   $env:CLOUDFLARE_API_TOKEN='zzz'   # D1読み取り権限で可
 *   node tools/audit_d1_notation.mjs [--out tmp/d1-audit.json] [--limit 50]
 *
 * 検査内容:
 *   songs:
 *     - bracket_title: タイトルに [...] を含む(読み仮名残り)
 *     - numbered_title: 先頭に「01. 」等の連番残り
 *     - unknown_artist: アーティスト空/(不明)
 *     - duplicate_title: 同一正規タイトルが複数アーティストに分散
 *   stream_songs:
 *     - unlinked: song_id が NULL(既存曲に未紐付け)
 *     - bracket_snapshot: snapshotに [...] 残り
 *     - missing_artist_snapshot: artist_snapshot が空
 *   streams:
 *     - zero_songs: song_count=0
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { out: 'tmp/d1-audit.json', limit: 50 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--out') args.out = next();
    else if (a === '--limit') args.limit = Number(next()) || 50;
    else if (a === '-h' || a === '--help') {
      console.log('Usage: node tools/audit_d1_notation.mjs [--out FILE] [--limit N]');
      process.exit(0);
    }
  }
  return args;
}

const hasBracket = (s) => /[[［].*[\]］]/.test(String(s ?? ''));
const hasNumbering = (s) => /^\d{1,3}\.\s/.test(String(s ?? '').trim());

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { createD1RestDepsFromEnv } = await import('../src/infra/wire/d1-rest-deps.js');
  const deps = createD1RestDepsFromEnv();
  const client = deps.streams.client;

  const songs = await client.query(
    `SELECT s.id, s.title, s.normalized_title, s.song_key, a.name AS artist
       FROM songs s LEFT JOIN artists a ON a.id = s.artist_id ORDER BY s.id`,
  );
  const streamSongs = await client.query(
    `SELECT ss.id, ss.stream_id, ss.position, ss.title_snapshot, ss.artist_snapshot,
            ss.song_id, st.streamed_on, st.title AS stream_title
       FROM stream_songs ss JOIN streams st ON st.id = ss.stream_id
      ORDER BY st.streamed_on DESC, ss.stream_id, ss.position`,
  );
  const streams = await client.query(
    'SELECT id, streamed_on, title, url, song_count FROM streams ORDER BY streamed_on DESC',
  );

  const byTitle = new Map();
  for (const s of songs) {
    const k = s.normalized_title;
    if (!byTitle.has(k)) byTitle.set(k, []);
    byTitle.get(k).push(s);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    counts: { songs: songs.length, streamSongs: streamSongs.length, streams: streams.length },
    songs: {
      bracket_title: songs.filter((s) => hasBracket(s.title)),
      numbered_title: songs.filter((s) => hasNumbering(s.title)),
      unknown_artist: songs.filter((s) => !String(s.artist ?? '').trim() || s.artist === '(不明)'),
      duplicate_title: [...byTitle.values()].filter((g) => {
        const artists = new Set(g.map((s) => s.song_key));
        return g.length > 1 && artists.size > 1;
      }),
    },
    streamSongs: {
      unlinked: streamSongs.filter((r) => r.song_id == null),
      bracket_snapshot: streamSongs.filter((r) => hasBracket(r.title_snapshot) || hasBracket(r.artist_snapshot)),
      missing_artist_snapshot: streamSongs.filter((r) => !String(r.artist_snapshot ?? '').trim()),
    },
    streams: {
      zero_songs: streams.filter((s) => !s.song_count),
    },
  };

  const slim = (rows) => rows.slice(0, args.limit).map((r) => {
    const { ...rest } = r;
    return rest;
  });
  const out = {
    ...report,
    songs: Object.fromEntries(
      Object.entries(report.songs).map(([k, v]) => [k, { count: v.length, rows: slim(v) }]),
    ),
    streamSongs: Object.fromEntries(
      Object.entries(report.streamSongs).map(([k, v]) => [k, { count: v.length, rows: slim(v) }]),
    ),
    streams: { zero_songs: { count: report.streams.zero_songs.length, rows: slim(report.streams.zero_songs) } },
  };

  const outAbs = path.resolve(ROOT, args.out);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(out, null, 2), 'utf-8');

  console.log(JSON.stringify({
    songs: songs.length,
    bracket_title: out.songs.bracket_title.count,
    numbered_title: out.songs.numbered_title.count,
    unknown_artist: out.songs.unknown_artist.count,
    duplicate_title_groups: out.songs.duplicate_title.count,
    streamSongs: streamSongs.length,
    unlinked: out.streamSongs.unlinked.count,
    bracket_snapshot: out.streamSongs.bracket_snapshot.count,
    missing_artist_snapshot: out.streamSongs.missing_artist_snapshot.count,
    zero_song_streams: out.streams.zero_songs.count,
    out: args.out,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
