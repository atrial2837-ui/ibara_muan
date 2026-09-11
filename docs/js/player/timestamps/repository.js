// コミュニティタイムスタンプ API クライアント。
// エンドポイント /api/timestamps/{channel}/{index} の契約(パス・メソッド・payload・
// エラー時挙動)をここに固定する。UI・キャッシュは stream-player.js 側。

export async function fetchCommunityTimestamps(channel, index) {
  const res = await fetch(`/api/timestamps/${encodeURIComponent(channel)}/${index}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.items || [];
}

export async function submitCommunityTimestamp(channel, index, { songIndex, timeSeconds, submitterNote }) {
  const res = await fetch(`/api/timestamps/${encodeURIComponent(channel)}/${index}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songIndex, timeSeconds, submitterNote }),
  });
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({}));
  return { ok: false, error: body.error || res.statusText };
}
