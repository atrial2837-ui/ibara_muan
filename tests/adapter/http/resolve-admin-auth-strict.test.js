import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveAdminAuthStrict } from '../../../src/adapter/http/resolve-admin-auth-strict.js';

describe('resolveAdminAuthStrict', () => {
  it('true / 1 で strict', () => {
    assert.equal(resolveAdminAuthStrict(true), true);
    assert.equal(resolveAdminAuthStrict('true'), true);
    assert.equal(resolveAdminAuthStrict('1'), true);
  });

  it('未設定 / false / 0 で非 strict', () => {
    assert.equal(resolveAdminAuthStrict(undefined), false);
    assert.equal(resolveAdminAuthStrict(false), false);
    assert.equal(resolveAdminAuthStrict('false'), false);
    assert.equal(resolveAdminAuthStrict('0'), false);
  });
});
