/**
 * @module tests/infra/github/fetch-github-actions-gateway.test
 * @description FetchGitHubActionsGateway のテスト。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FetchGitHubActionsGateway } from '../../../src/infra/github/fetch-github-actions-gateway.js';

test('constructor: throws when token is missing', () => {
  assert.throws(() => new FetchGitHubActionsGateway({ token: '' }), /token is required/i);
  assert.throws(() => new FetchGitHubActionsGateway({}), /token is required/i);
});

test('constructor: accepts token and creates instance', () => {
  const gw = new FetchGitHubActionsGateway({ token: 'ghp_test123' });
  assert(gw.token === 'ghp_test123');
  assert(typeof gw.fetch === 'function');
});

test('dispatchWorkflow: sends POST to correct GitHub API endpoint', async () => {
  let capturedUrl = '';
  let capturedOptions = null;
  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return { ok: true };
  };

  const gw = new FetchGitHubActionsGateway({
    token: 'ghp_test123',
    fetchImpl: mockFetch,
  });

  await gw.dispatchWorkflow({
    owner: 'myorg',
    repo: 'myrepo',
    workflow: 'deploy.yml',
    ref: 'main',
  });

  assert.equal(
    capturedUrl,
    'https://api.github.com/repos/myorg/myrepo/actions/workflows/deploy.yml/dispatches'
  );
  assert.equal(capturedOptions.method, 'POST');
  assert.equal(capturedOptions.headers.authorization, 'Bearer ghp_test123');
});

test('dispatchWorkflow: includes correct headers', async () => {
  const mockFetch = async (url, options) => {
    assert.equal(options.headers.accept, 'application/vnd.github+json');
    assert.equal(options.headers['content-type'], 'application/json');
    assert.equal(options.headers['user-agent'], 'ibara-muan-songlist');
    return { ok: true };
  };

  const gw = new FetchGitHubActionsGateway({
    token: 'ghp_test123',
    fetchImpl: mockFetch,
  });

  await gw.dispatchWorkflow({
    owner: 'org',
    repo: 'repo',
    workflow: 'test.yml',
    ref: 'main',
  });
});

test('dispatchWorkflow: sends ref in body', async () => {
  let capturedBody = null;
  const mockFetch = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return { ok: true };
  };

  const gw = new FetchGitHubActionsGateway({
    token: 'ghp_test123',
    fetchImpl: mockFetch,
  });

  await gw.dispatchWorkflow({
    owner: 'org',
    repo: 'repo',
    workflow: 'test.yml',
    ref: 'develop',
    inputs: { environment: 'staging' },
  });

  assert.equal(capturedBody.ref, 'develop');
  assert.deepEqual(capturedBody.inputs, { environment: 'staging' });
});

test('dispatchWorkflow: fetch の this を壊さず呼び出す', async () => {
  let capturedThis = null;
  function strictFetch() {
    capturedThis = this;
    if (this !== globalThis) {
      throw new TypeError('Illegal invocation: function called with incorrect this reference');
    }
    return { ok: true };
  }

  const gw = new FetchGitHubActionsGateway({
    token: 'ghp_test123',
    fetchImpl: strictFetch,
  });

  await gw.dispatchWorkflow({
    owner: 'org',
    repo: 'repo',
    workflow: 'test.yml',
    ref: 'main',
  });

  assert.equal(capturedThis, globalThis);
});

test('dispatchWorkflow: throws on HTTP error', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 401,
    text: async () => '{"message":"Bad credentials"}',
  });

  const gw = new FetchGitHubActionsGateway({
    token: 'invalid_token',
    fetchImpl: mockFetch,
  });

  await assert.rejects(
    () =>
      gw.dispatchWorkflow({
        owner: 'org',
        repo: 'repo',
        workflow: 'test.yml',
        ref: 'main',
      }),
    /401/
  );
});

test('dispatchWorkflow: throws on HTTP 422 validation error', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 422,
    text: async () => '{"message":"Validation Failed"}',
  });

  const gw = new FetchGitHubActionsGateway({
    token: 'ghp_test123',
    fetchImpl: mockFetch,
  });

  await assert.rejects(
    () =>
      gw.dispatchWorkflow({
        owner: 'org',
        repo: 'repo',
        workflow: 'nonexistent.yml',
        ref: 'main',
      }),
    /422/
  );
});
