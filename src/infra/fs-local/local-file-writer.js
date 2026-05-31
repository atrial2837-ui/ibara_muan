/**
 * @module infra/fs-local/local-file-writer
 * @description ローカルファイルシステムへの JSON 書き出し (Node.js 専用)。
 *
 * generateStaticData の出力を docs/data/*.json に書く責務を Infra に閉じ込める。
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * @typedef {object} WrittenFileStats
 * @property {Record<string, number>} files - 相対パス → バイト数
 * @property {number} totalBytes
 */

export class LocalFileWriter {
  /**
   * @param {string} outDir - 出力ディレクトリの絶対パス
   */
  constructor(outDir) {
    this.outDir = outDir;
  }

  /**
   * 名前付き JSON オブジェクト群をファイルに書き出す。
   *
   * @param {Record<string, unknown>} files - ファイル名 (拡張子なし) → JSON 内容
   * @param {{ pathPrefix?: string, trailingNewline?: boolean }} [options]
   * @returns {WrittenFileStats}
   */
  writeJsonFiles(files, options = {}) {
    const pathPrefix = options.pathPrefix ?? 'data/';
    const trailingNewline = options.trailingNewline !== false;

    fs.mkdirSync(this.outDir, { recursive: true });

    /** @type {Record<string, number>} */
    const writtenFiles = {};

    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(this.outDir, `${name}.json`);
      const text = trailingNewline ? `${JSON.stringify(content)}\n` : JSON.stringify(content);
      fs.writeFileSync(filePath, text, 'utf8');
      writtenFiles[`${pathPrefix}${name}.json`] = Buffer.byteLength(text);
    }

    const totalBytes = Object.values(writtenFiles).reduce((sum, size) => sum + size, 0);
    return { files: writtenFiles, totalBytes };
  }
}
