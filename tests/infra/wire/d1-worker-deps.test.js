import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createD1WorkerDeps } from '../../../src/infra/wire/d1-worker-deps.js';

describe('createD1WorkerDeps', () => {
  it('DB binding がなければ依存構築時に明示的なエラーを返す', () => {
    assert.throws(
      () => createD1WorkerDeps({}),
      /D1 binding DB is missing/,
    );
  });
});
