/**
 * @module tests/infra/admin-api/fetch-admin-api-gateway.test
 * @description FetchAdminApiGateway のテスト。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FetchAdminApiGateway } from '../../../src/infra/admin-api/fetch-admin-api-gateway.js';

test('constructor: uses default options', () => {
  const gw = new FetchAdminApiGateway();
  assert.equal(gw.baseUrl, '');
  assert.equal(gw.tokenProvider(), null);
  assert(typeof gw.fetch === 'function');
});

test('constructor: accepts custom options', () => {
  const tokenProvider = () => 'test-token';
  const mockFetch = () => {};
  const gw = new FetchAdminApiGateway({
    baseUrl: 'https://api.example.com',
    tokenProvider,
    fetchImpl: mockFetch,
  });
  assert.equal(gw.baseUrl, 'https://api.example.com');
  assert.equal(gw.tokenProvider(), 'test-token');
  assert.equal(gw.fetch, mockFetch);
});

test('searchSongs: sends GET request with query parameter', async () => {
  let capturedUrl = '';
  const mockFetch = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      json: async () => ({ songs: [{ id: 1, title: 'Test Song' }] }),
    };
  };

  const gw = new FetchAdminApiGateway({
    baseUrl: 'https://api.example.com',
    fetchImpl: mockFetch,
  });

  const result = await gw.searchSongs('test');
  assert(capturedUrl.includes('songs/search?q=test'));
  assert.equal(result[0].title, 'Test Song');
});

test('searchSongs: includes admin token in header if provided', async () => {
  let capturedHeaders = null;
  const mockFetch = async (url, options) => {
    capturedHeaders = options.headers;
    return {
      ok: true,
      json: async () => ({ songs: [] }),
    };
  };

  const gw = new FetchAdminApiGateway({
    tokenProvider: () => 'secret-token',
    fetchImpl: mockFetch,
  });

  await gw.searchSongs('query');
  assert.equal(capturedHeaders['x-admin-token'], 'secret-token');
});

test('previewStream: sends POST request with body', async () => {
  let capturedUrl = '';
  let capturedBody = null;
  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ songs: [] }),
    };
  };

  const gw = new FetchAdminApiGateway({
    fetchImpl: mockFetch,
  });

  const input = {
    channelCode: 'ch1',
    streamedOn: '2026-05-24',
    title: 'Stream Title',
    url: 'https://example.com',
    songsText: 'song1\nsong2',
  };

  await gw.previewStream(input);
  assert(capturedUrl.includes('preview-stream'));
  assert.equal(capturedBody.channelCode, 'ch1');
});

test('addStream: sends POST request and returns result', async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ streamId: 42, count: 3 }),
  });

  const gw = new FetchAdminApiGateway({
    fetchImpl: mockFetch,
  });

  const result = await gw.addStream({
    channelCode: 'ch1',
    streamedOn: '2026-05-24',
    title: 'New Stream',
    url: 'https://example.com',
    songsText: 'a\nb\nc',
  });

  assert.equal(result.streamId, 42);
  assert.equal(result.count, 3);
});

test('saveSongMetadata: sends POST with song data', async () => {
  let capturedBody = null;
  const mockFetch = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({}) };
  };

  const gw = new FetchAdminApiGateway({
    fetchImpl: mockFetch,
  });

  await gw.saveSongMetadata(123, 'G#m', 'Rock');
  assert.equal(capturedBody.songId, 123);
  assert.equal(capturedBody.displayKey, 'G#m');
  assert.equal(capturedBody.genre, 'Rock');
});

test('importKeyReferenceCsv: sends CSV text', async () => {
  let capturedBody = null;
  const mockFetch = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ updated: 5 }),
    };
  };

  const gw = new FetchAdminApiGateway({
    fetchImpl: mockFetch,
  });

  const result = await gw.importKeyReferenceCsv('title,artist,key\na,b,c');
  assert.equal(result.updated, 5);
  assert(capturedBody.csvText.includes('title,artist,key'));
});

test('syncKeyReferenceUrl: sends URL for sync', async () => {
  let capturedBody = null;
  const mockFetch = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ updated: 10 }),
    };
  };

  const gw = new FetchAdminApiGateway({
    fetchImpl: mockFetch,
  });

  const result = await gw.syncKeyReferenceUrl('https://example.com/data.csv');
  assert.equal(result.updated, 10);
  assert.equal(capturedBody.url, 'https://example.com/data.csv');
});

test('triggerStaticDataGeneration: sends POST to correct endpoint', async () => {
  let capturedUrl = '';
  const mockFetch = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      json: async () => ({
        ok: true,
        owner: 'org',
        repo: 'repo',
        workflow: 'deploy.yml',
        ref: 'main',
        requestedAt: '2026-05-24',
      }),
    };
  };

  const gw = new FetchAdminApiGateway({
    fetchImpl: mockFetch,
  });

  const result = await gw.triggerStaticDataGeneration();
  assert(capturedUrl.includes('static-data/generate'));
  assert.equal(result.ok, true);
  assert.equal(result.owner, 'org');
});

test('request: throws on HTTP error with error message', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: 'Bad request' }),
  });

  const gw = new FetchAdminApiGateway({
    fetchImpl: mockFetch,
  });

  await assert.rejects(() => gw.searchSongs('test'), /Bad request/);
});

test('request: throws on HTTP error without error message', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
  });

  const gw = new FetchAdminApiGateway({
    fetchImpl: mockFetch,
  });

  await assert.rejects(() => gw.previewStream({}), /500/);
});

test('searchSongs: encodes special characters in query', async () => {
  let capturedUrl = '';
  const mockFetch = async (url) => {
    capturedUrl = url;
    return { ok: true, json: async () => ({ songs: [] }) };
  };

  const gw = new FetchAdminApiGateway({
    fetchImpl: mockFetch,
  });

  await gw.searchSongs('hello world & test');
  assert(capturedUrl.includes('hello%20world%20%26%20test'));
});

test('request: includes baseUrl in request', async () => {
  let capturedUrl = '';
  const mockFetch = async (url) => {
    capturedUrl = url;
    return { ok: true, json: async () => ({}) };
  };

  const gw = new FetchAdminApiGateway({
    baseUrl: 'https://api.example.com',
    fetchImpl: mockFetch,
  });

  await gw.previewStream({});
  assert(capturedUrl.startsWith('https://api.example.com/api/admin'));
});
