import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createD1RestDepsFromEnv } from '../src/infra/wire/d1-rest-deps.js';
import { LocalFileWriter } from '../src/infra/fs-local/local-file-writer.js';
import { generateStaticData } from '../src/usecase/generate-static-data.js';
import { formatStaticDataFiles } from '../src/adapter/presenter/static-data-presenter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(path.resolve(__dirname, '..'), 'docs', 'data');

async function main() {
  const deps = createD1RestDepsFromEnv();

  console.log('Fetching D1 data via UseCase...');
  const staticData = await generateStaticData(deps);

  console.log('Formatting static data files...');
  const files = formatStaticDataFiles(staticData);

  console.log(`Writing ${Object.keys(files).length} files to ${OUT_DIR}...`);
  const writer = new LocalFileWriter(OUT_DIR);
  const { files: fileStats, totalBytes } = writer.writeJsonFiles(files, { trailingNewline: false });

  console.log('Done.');
  for (const [name, bytes] of Object.entries(fileStats)) {
    console.log(`  ${name}: ${bytes} bytes`);
  }
  console.log(`Total: ${totalBytes} bytes`);
  console.log(`Stats: repertoire=${staticData.meta.combined.repertoire}, streams=${staticData.meta.combined.streams}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
