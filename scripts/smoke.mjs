/**
 * デプロイ前スモークテスト（静的整合性チェック）
 *
 *   node scripts/smoke.mjs   または   npm run smoke
 *
 * ブラウザ不要で以下を検証する:
 *   1. index.html が参照するローカルアセットが実在する
 *   2. アセットの ?v= バージョンが全て同一（スタンプ漏れ検出）
 *   3. dist のチャンクが全て main.js/admin.js から推移的に参照されている
 *   4. data/*.json と manifest.webmanifest がパース可能
 *   5. manifest のアイコンが実在する
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = join(__dirname, '..', 'docs');

let failures = 0;
const fail = (msg) => { failures++; console.error(`  ✗ ${msg}`); };
const ok   = (msg) => console.log(`  ✓ ${msg}`);

// ── 1+2. index.html のアセット参照 ──────────────────────────────────────────
console.log('index.html のアセット参照:');
const html = readFileSync(join(DOCS, 'index.html'), 'utf-8');
const assetRefs = [...html.matchAll(/(?:href|src)="((?:css|dist|assets)\/[^"?]+)(?:\?v=([A-Za-z0-9_-]+))?"/g)]
  .map(m => ({ path: m[1], ver: m[2] || null }));

if (!assetRefs.length) fail('アセット参照が見つからない（正規表現が壊れている可能性）');
const versions = new Set();
for (const { path, ver } of assetRefs) {
  if (!existsSync(join(DOCS, path))) fail(`参照先が存在しない: ${path}`);
  if (ver) versions.add(ver);
}
if (versions.size > 1) fail(`?v= バージョンが混在: ${[...versions].join(', ')}`);
else ok(`${assetRefs.length} 件のアセット参照 OK（version: ${[...versions][0] || 'なし'}）`);

// ── 3. dist チャンクの参照整合性 ─────────────────────────────────────────────
console.log('dist チャンク:');
const DIST = join(DOCS, 'dist');
const keep = new Set();
const queue = ['main.js', 'admin.js'];
while (queue.length) {
  const f = queue.pop();
  const p = join(DIST, f);
  if (!existsSync(p)) { fail(`エントリが存在しない: dist/${f}`); continue; }
  const src = readFileSync(p, 'utf-8');
  for (const m of src.matchAll(/chunk-[A-Z0-9]+\.js/g)) {
    if (!keep.has(m[0])) { keep.add(m[0]); queue.push(m[0]); }
  }
}
const chunkFiles = readdirSync(DIST).filter(n => /^chunk-[A-Z0-9]+\.js$/.test(n));
const stale = chunkFiles.filter(n => !keep.has(n));
const missing = [...keep].filter(n => !chunkFiles.includes(n));
if (stale.length) fail(`未参照の古いチャンク: ${stale.join(', ')}`);
if (missing.length) fail(`参照されているのに存在しないチャンク: ${missing.join(', ')}`);
if (!stale.length && !missing.length) ok(`${chunkFiles.length} チャンク全て整合`);

// ── 4. JSON データ ───────────────────────────────────────────────────────────
console.log('JSON データ:');
for (const name of ['data/meta.json', 'data/songs.json', 'data/streams.json', 'data/music.json', 'manifest.webmanifest']) {
  const p = join(DOCS, name);
  if (!existsSync(p)) { fail(`存在しない: ${name}`); continue; }
  try {
    JSON.parse(readFileSync(p, 'utf-8'));
    ok(`${name} パース OK`);
  } catch (e) {
    fail(`${name} が JSON としてパースできない: ${e.message}`);
  }
}

// ── 5. manifest のアイコン ───────────────────────────────────────────────────
console.log('PWA manifest:');
try {
  const manifest = JSON.parse(readFileSync(join(DOCS, 'manifest.webmanifest'), 'utf-8'));
  for (const icon of manifest.icons || []) {
    if (!existsSync(join(DOCS, icon.src))) fail(`manifest アイコンが存在しない: ${icon.src}`);
  }
  ok(`アイコン ${ (manifest.icons || []).length } 件 OK`);
} catch (_) { /* 上の JSON チェックで報告済み */ }

// ── 結果 ────────────────────────────────────────────────────────────────────
if (failures) {
  console.error(`\nNG: ${failures} 件の問題`);
  process.exit(1);
}
console.log('\nOK: すべてのチェックに合格');
