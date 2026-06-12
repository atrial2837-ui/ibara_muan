import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'docs', 'dist');

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const common = {
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  treeShaking: true,
  external: ['chart.js'],
};

async function buildMain() {
  await esbuild.build({
    ...common,
    entryPoints: [{ in: join(__dirname, 'docs', 'js', 'main.js'), out: 'main' }],
    outdir: OUT_DIR,
    splitting: true,          // 動的importをチャンクに分離してunused JSを削減
    chunkNames: 'chunk-[hash]',
    metafile: true,
  });
  console.log('built docs/dist/main.js');
}

async function buildAdmin() {
  await esbuild.build({
    ...common,
    entryPoints: [join(__dirname, 'docs', 'js', 'admin.js')],
    outfile: join(OUT_DIR, 'admin.js'),
    metafile: true,
  });
  console.log('built docs/dist/admin.js');
}

/**
 * main.js / admin.js から（推移的に）参照されていない古いチャンクを削除する。
 * チャンク名は内容ハッシュ付きなので、ビルドのたびに旧世代が溜まり続けるのを防ぐ。
 */
function cleanStaleChunks() {
  const keep = new Set();
  const queue = [join(OUT_DIR, 'main.js'), join(OUT_DIR, 'admin.js')];
  while (queue.length) {
    const file = queue.pop();
    if (!existsSync(file)) continue;
    const src = readFileSync(file, 'utf-8');
    for (const m of src.matchAll(/chunk-[A-Z0-9]+\.js/g)) {
      const p = join(OUT_DIR, m[0]);
      if (!keep.has(p)) { keep.add(p); queue.push(p); }
    }
  }
  let removed = 0;
  for (const name of readdirSync(OUT_DIR)) {
    if (!/^chunk-[A-Z0-9]+\.js$/.test(name)) continue;
    const p = join(OUT_DIR, name);
    if (!keep.has(p)) { unlinkSync(p); removed++; }
  }
  if (removed) console.log(`cleaned ${removed} stale chunk(s)`);
}

/**
 * アセット内容のハッシュを index.html の ?v= に自動反映する。
 * sw.js が /dist/ /css/ を cache-first で配信するため、バージョン文字列を
 * 上げ忘れるとデプロイ後も全ユーザーに古い JS/CSS が配られ続ける。
 * 手動バンプは事故るので、ビルドのたびに内容ハッシュでスタンプする。
 */
function stampAssetVersions() {
  const hashed = [
    join(__dirname, 'docs', 'dist', 'main.js'),
    join(__dirname, 'docs', 'css', 'theme.css'),
    join(__dirname, 'docs', 'css', 'components.css'),
    join(__dirname, 'docs', 'css', 'views.css'),
  ];
  const h = createHash('sha1');
  for (const f of hashed) {
    if (existsSync(f)) h.update(readFileSync(f));
  }
  const ver = h.digest('hex').slice(0, 10);
  const page = join(__dirname, 'docs', 'index.html');
  const src = readFileSync(page, 'utf-8');
  // ローカルアセットの .css?v= / .js?v= のみ置換（YouTube 等の ?v= は触らない）
  const out = src.replace(/(\.(?:css|js)\?v=)[A-Za-z0-9_-]+/g, `$1${ver}`);
  if (out !== src) {
    writeFileSync(page, out);
    console.log(`stamped index.html assets ?v=${ver}`);
  }
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'admin') {
    await buildAdmin();
  } else if (mode === 'main') {
    await buildMain();
  } else {
    await Promise.all([buildMain(), buildAdmin()]);
  }
  cleanStaleChunks();
  stampAssetVersions();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
