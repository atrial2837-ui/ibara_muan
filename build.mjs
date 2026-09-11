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
 * サイトCSSを minify して docs/dist/ に出力する。
 * index.html は dist/*.css を参照する（/css/ の元ファイルは開発用ソース）。
 * theme.css の url("../assets/...") は dist/ からも同じパスに解決されるため
 * woff2 は external にしてそのまま通す。
 */
async function buildCss() {
  await esbuild.build({
    entryPoints: [
      join(__dirname, 'docs', 'css', 'theme.css'),
      join(__dirname, 'docs', 'css', 'components.css'),
      join(__dirname, 'docs', 'css', 'views.css'),
    ],
    outdir: OUT_DIR,
    bundle: true,
    minify: true,
    external: ['*.woff2'],
  });
  console.log('built docs/dist/{theme,components,views}.css');
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
 * アセット内容のハッシュを各ページの ?v= に自動反映する。
 *
 * sw.js が /dist/ /css/ を cache-first で配信するため、これが無いと
 * デプロイ後も古い JS/CSS が配られ続ける。手動バンプは事故るので毎回スタンプする。
 * ページごとに別のハッシュにしているのは、管理画面だけ直したときに
 * 公開ページ側のキャッシュまで無効化しないため。
 */
/** ローカルアセット(href/src)の ?v= を付け替える。無ければ付ける */
const ASSET_REF_RE = /(\b(?:href|src)=")((?:dist|css)\/[^"?]+\.(?:js|css))(?:\?v=[A-Za-z0-9_-]+)?(")/g;

function stampPage(pageName, assets) {
  const h = createHash('sha1');
  for (const f of assets) {
    // Windows チェックアウト(CRLF)と CI(Linux, LF)でバイト列が変わっても
    // 同じバージョン文字列になるよう、改行を LF に正規化してからハッシュする
    if (existsSync(f)) h.update(readFileSync(f, 'utf-8').replace(/\r\n/g, '\n'));
  }
  const ver = h.digest('hex').slice(0, 10);
  const page = join(__dirname, 'docs', pageName);
  const src = readFileSync(page, 'utf-8');
  // YouTube 等の ?v= を巻き込まないよう、href/src のローカルアセットだけを対象にする
  const out = src.replace(ASSET_REF_RE, `$1$2?v=${ver}$3`);
  if (out !== src) {
    writeFileSync(page, out);
    console.log(`stamped ${pageName} assets ?v=${ver}`);
  }
}

function stampAssetVersions() {
  const dist = (name) => join(__dirname, 'docs', 'dist', name);
  const css = (name) => join(__dirname, 'docs', 'css', name);

  stampPage('index.html', [dist('main.js'), dist('theme.css'), dist('components.css'), dist('views.css')]);
  // 管理画面は dist/admin.js と、minify 前の css/ をそのまま読んでいる
  stampPage('admin.html', [dist('admin.js'), css('theme.css'), css('components.css'), css('views.css'), css('admin.css')]);
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'admin') {
    await buildAdmin();
  } else if (mode === 'main') {
    await Promise.all([buildMain(), buildCss()]);
  } else {
    await Promise.all([buildMain(), buildAdmin(), buildCss()]);
  }
  cleanStaleChunks();
  stampAssetVersions();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
