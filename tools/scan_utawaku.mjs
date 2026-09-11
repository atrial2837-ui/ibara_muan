/**
 * @file tools/scan_utawaku.mjs
 * @description 候補動画のコメント欄を走査し、セトリ候補を抽出する。
 *
 * Free/utawaku-scanner と同じ判定(1コメント内のタイムスタンプ数・除外語)を
 * YouTube Data API v3 + 移植した純粋関数(src/domain/auto-update/timestamps.js)で行う。
 * scannerリポジトリへの依存なしでGitHub Actionsから実行できる。
 *
 * 使い方:
 *   node tools/scan_utawaku.mjs --input tmp/auto-update/candidates.json
 *     [--out tmp/auto-update/scan-result.json] [--min 3] [--max-comments 100]
 *     [--order relevance] [--concurrency 4] [--delay 0]
 *
 * YOUTUBE_API_KEY が必要(環境変数 or --api-key)。
 * クォータ目安: videos.list 50件/1unit、commentThreads.list 1req/1unit。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_EXCLUDE_LABELS,
  detectTimestamps,
} from '../src/domain/auto-update/timestamps.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    input: 'tmp/auto-update/candidates.json',
    out: 'tmp/auto-update/scan-result.json',
    apiKey: process.env.YOUTUBE_API_KEY ?? '',
    min: 3,
    maxComments: 100,
    order: 'relevance',
    concurrency: 4,
    delay: 0,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--input') args.input = next();
    else if (a === '--out') args.out = next();
    else if (a === '--api-key') args.apiKey = next();
    else if (a === '--min') args.min = Number(next()) || 3;
    else if (a === '--max-comments') args.maxComments = Number(next()) || 100;
    else if (a === '--order') args.order = next();
    else if (a === '--concurrency') args.concurrency = Number(next()) || 4;
    else if (a === '--delay') args.delay = Number(next()) || 0;
    else if (a === '-h' || a === '--help') {
      console.log('Usage: node tools/scan_utawaku.mjs --input <candidates.json|videos.txt> [options]');
      process.exit(0);
    }
  }
  return args;
}

function extractVideoId(s) {
  return String(s ?? '').match(/[A-Za-z0-9_-]{11}/)?.[0] ?? null;
}

function toWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** candidates.json / videos.txt のどちらでも読む */
function loadRefs(inputPath) {
  const abs = path.resolve(ROOT, inputPath);
  const text = fs.readFileSync(abs, 'utf-8');
  if (abs.endsWith('.json')) {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : (data.candidates ?? []);
    const seen = new Set();
    const refs = [];
    for (const item of list) {
      const videoId = item.videoId ?? extractVideoId(item.url);
      if (!videoId || seen.has(videoId)) continue;
      seen.add(videoId);
      refs.push({ videoId, title: item.title ?? '', publishedAt: item.publishedAt ?? '' });
    }
    return refs;
  }
  const seen = new Set();
  const refs = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const videoId = extractVideoId(trimmed);
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    refs.push({ videoId, title: '', publishedAt: '' });
  }
  return refs;
}

function stripHtml(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

class FatalApiError extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

async function ytGet(apiKey, endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { 'X-goog-api-key': apiKey } });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = payload?.error?.errors?.[0]?.reason ?? `http_${res.status}`;
    const message = payload?.error?.message ?? res.statusText;
    if (['quotaExceeded', 'keyInvalid', 'forbidden'].includes(reason) || res.status === 403) {
      if (reason === 'commentsDisabled') return { disabled: true };
      throw new FatalApiError(reason, message);
    }
    throw new Error(`YouTube API error (${endpoint}): ${reason} ${message}`);
  }
  return payload;
}

/** 動画メタ情報を50件バッチで取得 */
async function fetchVideos(apiKey, videoIds) {
  const found = new Map();
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const payload = await ytGet(apiKey, 'videos', {
      part: 'snippet', id: batch.join(','), maxResults: 50, key: apiKey,
    });
    for (const item of payload.items ?? []) {
      found.set(item.id, {
        videoId: item.id,
        title: item.snippet?.title ?? '',
        publishedAt: item.snippet?.publishedAt ?? '',
        url: toWatchUrl(item.id),
      });
    }
  }
  return found;
}

/** 1動画のコメントを取得(最大maxComments件)。無効なら { disabled: true } */
async function fetchComments(apiKey, videoId, { maxComments, order, delay }) {
  const comments = [];
  let pageToken = '';
  while (comments.length < maxComments) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    let payload;
    try {
      payload = await ytGet(apiKey, 'commentThreads', {
        part: 'snippet', videoId, maxResults: Math.min(100, maxComments - comments.length),
        order, textFormat: 'plainText', key: apiKey, ...(pageToken ? { pageToken } : {}),
      });
    } catch (err) {
      const msg = String(err?.message ?? '');
      if (msg.includes('commentsDisabled') || msg.includes('comments disabled')) {
        return { disabled: true, comments: [] };
      }
      throw err;
    }
    if (payload?.disabled) return { disabled: true, comments: [] };
    for (const item of payload.items ?? []) {
      const s = item.snippet?.topLevelComment?.snippet;
      if (!s) continue;
      comments.push({
        commentId: item.snippet?.topLevelComment?.id ?? item.id ?? '',
        text: stripHtml(s.textDisplay ?? s.textOriginal ?? ''),
        author: s.authorDisplayName ?? '',
        likeCount: s.likeCount ?? 0,
        publishedAt: s.publishedAt ?? '',
      });
    }
    pageToken = payload.nextPageToken ?? '';
    if (!pageToken) break;
  }
  return { disabled: false, comments };
}

function evaluateComment(comment, config) {
  const detection = detectTimestamps(comment.text, {
    minimumTimestampCount: config.min,
    dedupe: false,
    excludeLabels: DEFAULT_EXCLUDE_LABELS,
  });
  if (!detection.matched) return null;
  return {
    commentId: comment.commentId,
    text: comment.text,
    author: comment.author,
    likeCount: comment.likeCount,
    publishedAt: comment.publishedAt,
    timestampCount: detection.count,
    timestamps: detection.timestamps,
    excluded: detection.excluded,
  };
}

async function scanVideo(video, apiKey, config) {
  const base = { videoId: video.videoId, title: video.title, url: toWatchUrl(video.videoId) };
  let fetched;
  try {
    fetched = await fetchComments(apiKey, video.videoId, config);
  } catch (err) {
    if (err instanceof FatalApiError) throw err;
    return { ...base, status: 'error', note: String(err?.message ?? err), matches: [], scannedComments: 0 };
  }
  if (fetched.disabled) {
    return { ...base, status: 'comments_disabled', note: 'コメント欄が無効', matches: [], scannedComments: 0 };
  }
  const matches = fetched.comments
    .map((c) => evaluateComment(c, config))
    .filter(Boolean)
    .sort((a, b) => b.timestampCount - a.timestampCount);
  const best = matches[0];
  if (!best) {
    return { ...base, status: 'not_found', matches: [], scannedComments: fetched.comments.length };
  }
  return {
    ...base,
    status: 'found',
    timestampCount: best.timestampCount,
    excludedCount: best.excluded.length,
    commentId: best.commentId,
    comment: best.text,
    timestamps: best.timestamps.map(({ raw, seconds, label }) => ({ raw, seconds, label })),
    matches: matches.map((m) => ({
      commentId: m.commentId,
      timestampCount: m.timestampCount,
      comment: m.text,
      timestamps: m.timestamps,
      excluded: m.excluded,
    })),
    scannedComments: fetched.comments.length,
  };
}

async function runOrdered(items, limit, worker, onResult) {
  const results = new Array(items.length);
  const done = new Array(items.length).fill(false);
  let nextToReport = 0;
  let cursor = 0;
  const flush = () => {
    while (nextToReport < items.length && done[nextToReport]) {
      onResult(results[nextToReport], nextToReport);
      nextToReport += 1;
    }
  };
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
      done[index] = true;
      flush();
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.apiKey) {
    throw new Error('YOUTUBE_API_KEY が必要です(環境変数 or --api-key)');
  }
  const refs = loadRefs(args.input);
  if (!refs.length) {
    // 新着候補0件は正常系。空結果を書いて終了する(throwするとrunが赤くなる)
    console.error('No videos to scan (fresh=0). Writing empty result.');
    const outAbs = path.resolve(ROOT, args.out);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, '[]', 'utf-8');
    console.log(JSON.stringify({ total: 0, found: 0, notFound: 0, errors: 0, out: args.out }));
    return;
  }
  console.error(`${refs.length} videos detected`);

  const found = await fetchVideos(args.apiKey, refs.map((r) => r.videoId));
  const videos = refs.map((r) => found.get(r.videoId) ?? {
    videoId: r.videoId, title: r.title || '(取得不可)', url: toWatchUrl(r.videoId),
    missing: !found.has(r.videoId),
  });

  const config = { min: args.min, maxComments: args.maxComments, order: args.order, delay: args.delay };
  const results = await runOrdered(
    videos,
    args.concurrency,
    async (video) => {
      if (video.missing) {
        return { videoId: video.videoId, title: video.title, url: video.url, status: 'video_unavailable', note: '動画情報を取得できませんでした', matches: [], scannedComments: 0 };
      }
      try {
        return await scanVideo(video, args.apiKey, config);
      } catch (err) {
        if (err instanceof FatalApiError) throw err;
        return { videoId: video.videoId, title: video.title, url: video.url, status: 'error', note: String(err?.message ?? err), matches: [], scannedComments: 0 };
      }
    },
    (result, index) => {
      const mark = result.status === 'found' ? '✓' : result.status === 'not_found' ? '✗' : '!';
      console.error(`[${index + 1}/${videos.length}] ${mark} ${result.title} (${result.status})`);
    },
  );

  const summary = {
    total: results.length,
    found: results.filter((r) => r.status === 'found').length,
    notFound: results.filter((r) => r.status === 'not_found').length,
    errors: results.filter((r) => !['found', 'not_found'].includes(r.status)).length,
  };
  console.error(`Finished total=${summary.total} found=${summary.found} notFound=${summary.notFound} errors=${summary.errors}`);

  const outAbs = path.resolve(ROOT, args.out);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(results, null, 2), 'utf-8');
  console.log(JSON.stringify({ ...summary, out: args.out }));
}

main().catch((err) => {
  if (err instanceof FatalApiError) console.error(`APIエラーのため中断しました (${err.reason}): ${err.message}`);
  else console.error(err);
  process.exit(1);
});
