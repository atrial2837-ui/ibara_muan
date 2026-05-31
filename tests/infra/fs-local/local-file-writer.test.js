import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { LocalFileWriter } from '../../../src/infra/fs-local/local-file-writer.js';

describe('LocalFileWriter', () => {
  /** @type {string} */
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanau-local-file-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('JSON ファイル群を書き出す', () => {
    const writer = new LocalFileWriter(tmpDir);
    const { files, totalBytes } = writer.writeJsonFiles({
      meta: { ok: true },
      songs: [{ title: 'test' }],
    });
    assert.ok(files['data/meta.json'] > 0);
    assert.ok(files['data/songs.json'] > 0);
    assert.equal(totalBytes, files['data/meta.json'] + files['data/songs.json']);
    assert.ok(fs.existsSync(path.join(tmpDir, 'meta.json')));
  });
});
