/**
 * @file tools/apply_scan_results.mjs
 * @description スキャン結果を信頼度ゲートで振り分け、D1に適用する。
 *
 * - 高信頼(auto): 枠+セトリをD1投入(addStream。枠のみ既存なら上書きでセトリ補完)
 * - 低信頼(review): D1に触れない。枠のみ未登録なら song_count=0 で先行登録し、
 *   review-queue.json + issue-body.md に残して手動承認待ちにする
 * - 取得不可(none/skip): 何もしない
 * - 既に song_count>0 の枠は手作業データを優先し、--force なしでは上書きしない
 *
 * 使い方:
 *   node tools/apply_scan_results.mjs --candidates tmp/auto-update/candidates.json
 *     --scan tmp/auto-update/scan-result.json [--out-dir tmp/auto-update]
 *     [--min-timestamps 8] [--channel-code main] [--apply] [--force]
 *
 * --apply なしはドライラン(D1に触れない)。D1適用には CLOUDFLARE_* が必要。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  classifyScanEntry,
  DEFAULT_AUTO_MIN_TIMESTAMPS,
} from '../src/domain/auto-update/classify.js';
import { buildUrlKey } from '../src/domain/stream/url-key.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    candidates: 'tmp/auto-update/candidates.json',
    scan: 'tmp/auto-update/scan-result.json',
    outDir: 'tmp/auto-update',
    minTimestamps: DEFAULT_AUTO_MIN_TIMESTAMPS,
    channelCode: 'main',
    apply: false,
    force: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--candidates') args.candidates = next();
    else if (a === '--scan') args.scan = next();
    else if (a === '--out-dir') args.outDir = next();
    else if (a === '--min-timestamps') args.minTimestamps = Number(next()) || DEFAULT_AUTO_MIN_TIMESTAMPS;
    else if (a === '--channel-code') args.channelCode = next();
    else if (a === '--apply') args.apply = true;
    else if (a === '--force') args.force = true;
    else if (a === '-h' || a === '--help') {
      console.log('Usage: node tools/apply_scan_results.mjs [options]');
      process.exit(0);
    }
  }
  return args;
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf-8'));
}

function issueBodyMarkdown(review, summary) {
  const lines = [
    '## 自動更新レビュー待ち',
    '',
    `高信頼の自動適用: ${summary.setlistsApplied}件 / 枠のみ先行登録: ${summary.framesInserted}件 / 要確認: ${review.length}件`,
    '',
    '| 動画 | 状態 | 理由 | 候補曲数 |',
    '| --- | --- | --- | ---: |',
  ];
  for (const r of review) {
    lines.push(`| [${r.title}](${r.url}) | ${r.status} | ${r.reason} | ${r.timestampCount} |`);
  }
  lines.push(
    '',
    '確認手順: 候補URLを開き、セトリが正しければ管理画面(admin.html)から歌枠追加→「静的データ生成を開始」。',
    '枠のみ登録済みのものはコメント欄にセトリが出次第、次回スキャンで自動補完されます。',
  );
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const candidates = loadJson(args.candidates);
  const scans = loadJson(args.scan);
  const byId = new Map(candidates.map((c) => [c.videoId, c]));

  const outDir = path.resolve(ROOT, args.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  let deps = null;
  let channel = null;
  let addStream = null;
  if (args.apply) {
    const { createD1RestDepsFromEnv } = await import('../src/infra/wire/d1-rest-deps.js');
    ({ addStream } = await import('../src/usecase/add-stream.js'));
    deps = createD1RestDepsFromEnv();
    channel = await deps.channels.findByCode(args.channelCode);
    if (!channel) throw new Error(`unknown channel: ${args.channelCode}`);
  }

  const review = [];
  const summary = {
    total: scans.length,
    autoCount: 0,
    setlistsApplied: 0,
    framesInserted: 0,
    skippedExisting: 0,
    reviewCount: 0,
    dryRun: !args.apply,
  };

  for (const scan of scans) {
    const cand = byId.get(scan.videoId) ?? {};
    const title = cand.title ?? scan.title ?? scan.videoId;
    const url = cand.url ?? scan.url ?? `https://www.youtube.com/watch?v=${scan.videoId}`;
    const streamedOn = cand.streamedOn ?? '';
    const classified = classifyScanEntry(scan, { minTimestamps: args.minTimestamps });
    const urlKey = streamedOn ? buildUrlKey(url, args.channelCode, streamedOn, title) : url;

    const item = {
      videoId: scan.videoId,
      title,
      url,
      streamedOn,
      status: scan.status,
      timestampCount: scan.timestampCount ?? 0,
      scannedComments: scan.scannedComments ?? 0,
      ...classified,
    };

    if (!args.apply) {
      if (classified.setlistVerdict === 'auto') summary.autoCount += 1;
      else if (classified.setlistVerdict === 'review') review.push(item);
      continue;
    }

    if (!streamedOn) {
      review.push({ ...item, setlistVerdict: 'review', reason: 'missing_streamed_on', frameOnly: false });
      continue;
    }

    const existing = await deps.streams.findByChannelDateUrlKey(channel.id, streamedOn, urlKey);

    if (classified.setlistVerdict === 'auto' && classified.songLines > 0) {
      if (existing && Number(existing.song_count) > 0 && !args.force) {
        summary.skippedExisting += 1;
        continue;
      }
      await addStream(deps, {
        channelCode: args.channelCode,
        streamedOn,
        title,
        url,
        songsText: classified.songsText,
      });
      summary.setlistsApplied += 1;
    } else if (classified.setlistVerdict === 'review' && classified.frameOnly) {
      if (!existing) {
        const sourceIndex = await deps.streams.nextSourceIndex(channel.id);
        await deps.streams.insert({
          channelId: channel.id,
          sourceIndex,
          streamedOn,
          title,
          url,
          urlKey,
          songCount: 0,
          createdAt: deps.clock.now().toISOString(),
        });
        summary.framesInserted += 1;
      }
      review.push(item);
    }
    // verdict none → 何もしない
  }

  summary.reviewCount = review.length;
  summary.changed = summary.setlistsApplied > 0 || summary.framesInserted > 0;

  fs.writeFileSync(path.join(outDir, 'review-queue.json'), JSON.stringify(review, null, 2), 'utf-8');
  fs.writeFileSync(path.join(outDir, 'issue-body.md'), issueBodyMarkdown(review, summary), 'utf-8');
  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
