/**
 * @file tests/domain/policy/admin-auth.test.js
 * @description evaluateAdminAuth の単体テスト (Node built-in test runner)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAdminAuth } from '../../../src/domain/policy/admin-auth.js';

describe('evaluateAdminAuth', () => {
  // ─── strict=true (デフォルト) で expected 未設定 ─────────────────────────

  it('expected が null で strict=true (デフォルト) → 拒否', () => {
    const result = evaluateAdminAuth({ token: null }, null);
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'ADMIN_TOKEN is not configured');
  });

  it('expected が undefined で strict=true (デフォルト) → 拒否', () => {
    const result = evaluateAdminAuth({ token: 'any' }, undefined);
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'ADMIN_TOKEN is not configured');
  });

  it('expected が空文字で strict=true (デフォルト) → 拒否', () => {
    const result = evaluateAdminAuth({ token: '' }, '');
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'ADMIN_TOKEN is not configured');
  });

  it('options を省略した場合は strict=true がデフォルト → 拒否', () => {
    const result = evaluateAdminAuth({ token: 'secret' }, null);
    assert.equal(result.allowed, false);
  });

  // ─── strict=false で expected 未設定 (既存互換) ───────────────────────────

  it('expected が null で strict=false → 許可 (既存互換)', () => {
    const result = evaluateAdminAuth({ token: null }, null, { strict: false });
    assert.equal(result.allowed, true);
  });

  it('expected が undefined で strict=false → 許可 (既存互換)', () => {
    const result = evaluateAdminAuth({ token: null }, undefined, { strict: false });
    assert.equal(result.allowed, true);
  });

  it('expected が空文字で strict=false → 許可 (既存互換)', () => {
    const result = evaluateAdminAuth({ token: '' }, '', { strict: false });
    assert.equal(result.allowed, true);
  });

  // ─── expected がある場合のトークン一致チェック ───────────────────────────

  it('expected あり・token が一致 → 許可', () => {
    const result = evaluateAdminAuth({ token: 'secret-xxx' }, 'secret-xxx');
    assert.equal(result.allowed, true);
    assert.equal(result.reason, undefined);
  });

  it('expected あり・token が不一致 → 拒否', () => {
    const result = evaluateAdminAuth({ token: 'wrong-token' }, 'secret-xxx');
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'Invalid admin token');
  });

  it('expected あり・token が null → 拒否', () => {
    const result = evaluateAdminAuth({ token: null }, 'secret-xxx');
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'Invalid admin token');
  });

  it('expected あり・token が空文字 → 拒否', () => {
    const result = evaluateAdminAuth({ token: '' }, 'secret-xxx');
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'Invalid admin token');
  });

  it('strict=false でも expected がある場合はトークン検証が行われる', () => {
    const ok = evaluateAdminAuth({ token: 'correct' }, 'correct', { strict: false });
    assert.equal(ok.allowed, true);

    const ng = evaluateAdminAuth({ token: 'wrong' }, 'correct', { strict: false });
    assert.equal(ng.allowed, false);
    assert.equal(ng.reason, 'Invalid admin token');
  });
});
