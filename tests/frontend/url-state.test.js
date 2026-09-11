// docs/js/url-state.js のテスト。
// タブ削減に伴う旧URL(?tab=analytics)の読み替えと、URL組み立ての約束を固定する。
// ブラウザ依存は globalThis.window の最小スタブで再現する（node --test 用）。
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { readUrlState, writeUrlState } from '../../docs/js/url-state.js';

// history.pushState(null, '', url) の第3引数が URL 本体。
const URL_AT = 3;

function stubWindow(search = '', pathname = '/') {
  const calls = { history: [], events: [] };
  globalThis.window = {
    location: { search, pathname },
    history: {
      pushState: (...args) => { calls.history.push(['pushState', ...args]); },
      replaceState: (...args) => { calls.history.push(['replaceState', ...args]); },
    },
    dispatchEvent: (event) => { calls.events.push(event); return true; },
  };
  return calls;
}

beforeEach(() => {
  delete globalThis.window;
});

describe('readUrlState', () => {
  it('旧タブ analytics は dashboard に読み替える', () => {
    stubWindow('?tab=analytics');
    assert.equal(readUrlState().tab, 'dashboard');
  });

  it('残したタブ(ranking/songs/timeline/playlists)はそのまま', () => {
    for (const tab of ['ranking', 'songs', 'timeline', 'playlists']) {
      stubWindow(`?tab=${tab}`);
      assert.equal(readUrlState().tab, tab);
    }
  });

  it('未知のタブ・未指定は dashboard', () => {
    stubWindow('?tab=nope');
    assert.equal(readUrlState().tab, 'dashboard');
    stubWindow('');
    assert.equal(readUrlState().tab, 'dashboard');
  });

  it('ch は main/all のみ受け付ける', () => {
    stubWindow('?ch=all');
    assert.equal(readUrlState().channel, 'all');
    stubWindow('?ch=xx');
    assert.equal(readUrlState().channel, 'main');
    stubWindow('');
    assert.equal(readUrlState().channel, 'main');
  });
});

describe('writeUrlState', () => {
  it('dashboard の tab は URL に出さない', () => {
    const calls = stubWindow('?tab=songs');
    const merged = writeUrlState({ tab: 'dashboard' }, { replace: true });
    assert.equal(merged.tab, 'dashboard');
    assert.equal(calls.history.length, 1);
    assert.equal(calls.history[0][0], 'replaceState');
    assert.match(String(calls.history[0][URL_AT]), /^\/$/);
  });

  it('旧タブを書こうとしても dashboard として正規化される', () => {
    const calls = stubWindow('');
    writeUrlState({ tab: 'analytics' });
    assert.equal(calls.history.length, 1);
    assert.match(String(calls.history[0][URL_AT]), /^\/$/);
  });

  it('ranking は tab 付きで pushState する', () => {
    const calls = stubWindow('');
    writeUrlState({ tab: 'ranking' });
    assert.equal(calls.history[0][0], 'pushState');
    assert.match(String(calls.history[0][URL_AT]), /tab=ranking/);
  });

  it('書き込み後に urlstatechange を1回だけ送る', () => {
    const calls = stubWindow('');
    writeUrlState({ tab: 'songs' });
    assert.equal(calls.events.length, 1);
    assert.equal(calls.events[0].detail.tab, 'songs');
  });
});
