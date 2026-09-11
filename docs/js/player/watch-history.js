// 視聴履歴(続きから見る)の localStorage リポジトリ。
// キー・エントリ形状は ibara-watch-history-v1 契約として固定(views/dashboard.js が直接読む)。

// ─── 視聴履歴（続きから見る） ────────────────────────────────────────────────

const WATCH_HISTORY_KEY = 'ibara-watch-history-v1';

let _lastWatchSave = 0;

export function getWatchHistory() {
  try { return JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]'); } catch (_) { return []; }
}

export function clearWatchHistory() {
  try { localStorage.removeItem(WATCH_HISTORY_KEY); } catch (_) {}
}

export function _saveWatchEntry(stream, t) {
  if (!stream?.url || t < 10) return; // 10秒未満は記録しない
  try {
    const list = getWatchHistory().filter(e => e.url !== stream.url);
    list.unshift({
      url: stream.url,
      title: stream.title || '',
      t: Math.max(0, Math.floor(t)),
      isMv: !!stream.isMv,
      channel: stream.channel ?? null,
      index: stream.index ?? null,
      date: stream.date ?? null,
      updatedAt: Date.now(),
    });
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(list.slice(0, 10)));
  } catch (_) {}
}

export function _saveWatchEntryThrottled(stream, t) {
  const now = Date.now();
  if (now - _lastWatchSave < 5000) return;
  _lastWatchSave = now;
  _saveWatchEntry(stream, t);
}
