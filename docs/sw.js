const CACHE_VERSION = 'v6';
const ASSET_CACHE = `ibara-assets-${CACHE_VERSION}`;
const DATA_CACHE  = `ibara-data-${CACHE_VERSION}`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => k !== ASSET_CACHE && k !== DATA_CACHE)
            .map(k => caches.delete(k))
        )
      ),
    ])
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 同一オリジンの GET のみ処理
  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  const path = url.pathname;

  // /api/* → SW は一切介在しない（投稿・投票・取り消しが即時反映される必要があり、
  // 古い応答を返すと削除した項目が残って見える）
  if (path.startsWith('/api/')) return;

  // /data/*.json → network-first（オフライン時だけキャッシュ）
  // 以前は stale-while-revalidate だったが、それだと更新が常に1回分遅れて表示される
  // （デプロイ直後に開くと古いデータが出て、次に開いたときようやく新しくなる）。
  // 曲の追加やタイムスタンプは出したらすぐ見えてほしいので、ネットワーク優先にする。
  if (path.startsWith('/data/') && path.endsWith('.json')) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // 静的アセット（バージョンクエリ付き CSS/JS・フォント・画像）→ cache-first
  if (
    path.startsWith('/assets/') ||
    path.startsWith('/dist/')   ||
    path.startsWith('/css/')    ||
    path.startsWith('/js/')     ||
    path.endsWith('.woff2')
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // HTML・その他 → network-first（常に最新を優先）
  event.respondWith(networkFirst(request, ASSET_CACHE));
});

// キャッシュ優先、ミスのときだけネットワーク
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// ネットワーク優先、失敗したらキャッシュ
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}
