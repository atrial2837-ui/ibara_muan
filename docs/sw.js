const CACHE_VERSION = 'v1';
const ASSET_CACHE = `ibara-muan-assets-${CACHE_VERSION}`;
const DATA_CACHE  = `ibara-muan-data-${CACHE_VERSION}`;

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

  // /data/*.json → stale-while-revalidate（即座に返しつつ裏で更新）
  if (path.startsWith('/data/') && path.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
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

// キャッシュがあれば即返し、裏でネットワーク取得してキャッシュ更新
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached ?? fetchPromise;
}

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
