/**
 * @file tools/repair_auto_import.mjs
 * @description 旧ルールで自動取り込みされた曲表記を修復する。
 *
 * 対象:
 *   - タイトルの [...] ローマ字読み残り (例: セレナーデ[Serenade])
 *   - 先頭連番残り (例: 13. エイリアンエイリアン-Remix ver- / ⟦01⟧ 雨とカプチーノ)
 *   - 上記で作られた重複曲 (正規表記の既存曲がある場合に付け替え・削除)
 *   - ⟦NN⟧ 形式でアーティスト不明になった曲 (既定でヨルシカを付与)
 *
 * 動作:
 *   - 既定はドライラン(計画表示のみ)。--apply でD1に適用する
 *   - 正規の既存曲があれば stream_songs を付け替え、stats を移し、重複曲を削除
 *   - 無ければその場で rename (title/normalized_title/song_key + snapshots)
 *   - streams.song_count は変わらない(曲数は不変)
 *
 * 使い方:
 *   $env:CLOUDFLARE_ACCOUNT_ID='xxx'
 *   $env:CLOUDFLARE_D1_DATABASE_ID='yyy'   # 本番D1
 *   $env:CLOUDFLARE_API_TOKEN='zzz'
 *   node tools/repair_auto_import.mjs [--apply] [--out tmp/repair-plan.json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanCommentLabel, stripTrackNumber } from '../src/domain/auto-update/comment-label.js';
import { splitSongLine } from '../src/domain/stream/setlist-parser.js';
import { buildSongKey } from '../src/domain/song/song-key.js';
import { normalizedKey, normalize } from '../src/domain/shared/text.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** ⟦NN⟧ 形式の既定アーティスト(8/3ヨルシカ縛り枠由来の28曲を確認済み) */
const BRACKET_NUMBER_DEFAULT_ARTIST = 'ヨルシカ';
const UNKNOWN_ARTIST = '(不明)';

function parseArgs(argv) {
  const args = { apply: false, out: 'tmp/repair-plan.json', setArtist: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--apply') args.apply = true;
    else if (a === '--out') args.out = next();
    else if (a === '--set-artist') args.setArtist = next();
    else if (a === '-h' || a === '--help') {
      console.log('Usage: node tools/repair_auto_import.mjs [--apply] [--out FILE] [--set-artist NAME]');
      process.exit(0);
    }
  }
  return args;
}

const hasBracket = (s) => /[[［].*[\]］]/.test(String(s ?? ''));
const hasNumbering = (s) => /^(?:\d{1,3}\.\s*|⟦\d{1,3}⟧\s*)/.test(String(s ?? '').trim());

async function findOrCreateArtist(client, clockIso, name) {
  const norm = normalizedKey(name);
  const existing = await client.queryFirst(
    'SELECT id, name FROM artists WHERE normalized_name = ?', norm,
  );
  if (existing) return existing;
  const meta = await client.run(
    'INSERT INTO artists (name, normalized_name, created_at) VALUES (?, ?, ?)',
    normalize(name), norm, clockIso,
  );
  return { id: meta.last_row_id, name: normalize(name) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { createD1RestDepsFromEnv } = await import('../src/infra/wire/d1-rest-deps.js');
  const deps = createD1RestDepsFromEnv();
  const client = deps.streams.client;
  const clockIso = deps.clock.now().toISOString();

  const songs = await client.query(
    `SELECT s.id, s.title, s.normalized_title, s.song_key, s.artist_id, a.name AS artist
       FROM songs s LEFT JOIN artists a ON a.id = s.artist_id ORDER BY s.id`,
  );
  const byKey = new Map(songs.map((s) => [s.song_key, s]));

  const targets = songs.filter((s) => hasBracket(s.title) || hasNumbering(s.title));
  console.error(`Dirty songs: ${targets.length} / ${songs.length}`);

  const plan = [];
  for (const song of targets) {
    const canonTitle = cleanCommentLabel(stripTrackNumber(song.title));
    if (!canonTitle) {
      plan.push({ action: 'skip', reason: 'empty_after_clean', song });
      continue;
    }
    let artistName = normalize(song.artist ?? '');
    const unknown = !artistName || artistName === UNKNOWN_ARTIST;
    if (unknown) {
      if (/^⟦\d{1,3}⟧/.test(String(song.title).trim())) {
        artistName = BRACKET_NUMBER_DEFAULT_ARTIST;
      } else if (args.setArtist) {
        artistName = normalize(args.setArtist);
      } else {
        plan.push({ action: 'skip', reason: 'unknown_artist_needs_--set-artist', song });
        continue;
      }
    }
    // タイトル側に '/' が残る場合(例: キーと曲名の混在)は splitSongLine で分離
    const parsed = splitSongLine(`${canonTitle} / ${artistName}`);
    const key = buildSongKey(parsed.title, parsed.artist);
    const existing = byKey.get(key);
    if (existing && existing.id !== song.id) {
      plan.push({ action: 'remap', from: song, to: existing, canonTitle: parsed.title, artistName: parsed.artist });
    } else if (!existing) {
      plan.push({ action: 'rename', song, canonTitle: parsed.title, artistName: parsed.artist, key });
    } else {
      plan.push({ action: 'noop', song });
    }
  }

  const summary = {
    total: targets.length,
    remap: plan.filter((p) => p.action === 'remap').length,
    rename: plan.filter((p) => p.action === 'rename').length,
    skip: plan.filter((p) => p.action === 'skip').length,
    dryRun: !args.apply,
  };
  const outAbs = path.resolve(ROOT, args.out);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify({ summary, plan }, null, 2), 'utf-8');
  console.log(JSON.stringify({ ...summary, out: args.out }, null, 2));

  if (!args.apply) {
    console.error('Dry-run only. Re-run with --apply to execute.');
    for (const p of plan.filter((x) => x.action === 'skip')) {
      console.error(`  SKIP id=${p.song.id} reason=${p.reason} title=${p.song.title}`);
    }
    return;
  }

  let remapped = 0;
  let renamed = 0;
  // 実行中に変わるキー占有を追跡(リネーム同士の衝突時は後勝ちではなく付け替えに倒す)
  const liveKeyToId = new Map(songs.map((s) => [s.song_key, s.id]));
  const liveInfo = new Map(songs.map((s) => [s.id, { title: s.title, artist: s.artist ?? '', key: s.song_key }]));
  const doRemap = async (fromId, toId) => {
    const to = liveInfo.get(toId);
    const rows = await client.query(
      `SELECT ss.id, st.channel_id FROM stream_songs ss
         JOIN streams st ON st.id = ss.stream_id WHERE ss.song_id = ?`, fromId,
    );
    await client.run(
      `UPDATE stream_songs SET song_id = ?, song_key_snapshot = ?,
         title_snapshot = ?, artist_snapshot = ? WHERE song_id = ?`,
      toId, to.key, to.title, to.artist, fromId,
    );
    const perChannel = new Map();
    for (const r of rows) perChannel.set(r.channel_id, (perChannel.get(r.channel_id) ?? 0) + 1);
    for (const [channelId, moved] of perChannel) {
      await client.run(
        `INSERT INTO song_channel_stats (song_id, channel_id, sing_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(song_id, channel_id) DO UPDATE SET
           sing_count = sing_count + ?, updated_at = ?`,
        toId, channelId, moved, clockIso, clockIso, moved, clockIso,
      );
    }
    await client.run('DELETE FROM song_channel_stats WHERE song_id = ?', fromId);
    await client.run('DELETE FROM songs WHERE id = ?', fromId);
    liveKeyToId.delete(liveInfo.get(fromId).key);
    liveInfo.delete(fromId);
    return rows.length;
  };
  for (const item of plan) {
    if (item.action === 'remap') {
      const { from } = item;
      const toId = liveKeyToId.get(item.to.song_key) ?? item.to.id;
      const rows = await doRemap(from.id, toId);
      remapped += 1;
      const to = liveInfo.get(toId);
      console.error(`  remap #${from.id} "${from.title}" -> #${toId} "${to.title}" (${rows} rows)`);
    } else if (item.action === 'rename') {
      const { song } = item;
      const occupant = liveKeyToId.get(item.key);
      if (occupant != null && occupant !== song.id) {
        const rows = await doRemap(song.id, occupant);
        remapped += 1;
        const to = liveInfo.get(occupant);
        console.error(`  remap(collide) #${song.id} "${song.title}" -> #${occupant} "${to.title}" (${rows} rows)`);
        continue;
      }
      let artistId = song.artist_id;
      let artistDisplay = item.artistName;
      if (normalize(song.artist ?? '') !== normalize(item.artistName)) {
        const artist = await findOrCreateArtist(client, clockIso, item.artistName);
        artistId = artist.id;
        artistDisplay = artist.name;
      }
      const oldKey = liveInfo.get(song.id).key;
      await client.run(
        'UPDATE songs SET title = ?, normalized_title = ?, song_key = ?, artist_id = ? WHERE id = ?',
        item.canonTitle, normalizedKey(item.canonTitle), item.key, artistId, song.id,
      );
      await client.run(
        `UPDATE stream_songs SET title_snapshot = ?, artist_snapshot = ?,
           song_key_snapshot = ? WHERE song_id = ?`,
        item.canonTitle, artistDisplay, item.key, song.id,
      );
      liveKeyToId.delete(oldKey);
      liveKeyToId.set(item.key, song.id);
      liveInfo.set(song.id, { title: item.canonTitle, artist: artistDisplay, key: item.key });
      renamed += 1;
      console.error(`  rename #${song.id} "${song.title}" -> "${item.canonTitle} / ${artistDisplay}"`);
    }
  }
  console.log(JSON.stringify({ remapped, renamed }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
