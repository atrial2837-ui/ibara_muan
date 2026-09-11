// 共有URL・外部YouTube URLのビルダー(state / URL状態 / location に依存)。
// 共有モーダルUIは stream-player.js 側。
import { state } from '../store.js';
import { youtubeVideoId } from '../utils.js';
import { readUrlState } from '../url-state.js';

export function _youtubeExternalUrl(url, startAt = 0) {
  const raw = String(url || '');
  const id = youtubeVideoId(raw);
  if (!id) return raw;
  const t = Math.max(0, Math.floor(Number(startAt) || 0));
  return `https://www.youtube.com/watch?v=${id}${t > 0 ? `&t=${t}s` : ''}`;
}

export function _svBuildShareUrl(id, t = 0, options = {}) {
  if (!id) return '';
  const current = readUrlState();
  const params = new URLSearchParams();
  const channel = current.channel || state.channel;
  if (channel && channel !== 'main') params.set('ch', channel);
  params.set('v', id);
  if (options.includeTime !== false && t > 5) params.set('t', String(Math.floor(t)));
  return `${location.origin}${location.pathname}?${params}`;
}
