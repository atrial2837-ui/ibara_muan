/**
 * OGP ミドルウェア
 *
 * `/?v=<videoId>` の共有リンクで HTML が要求されたとき、OGP / Twitter Card の
 * メタタグを動画タイトル＋サムネイルに書き換える。X・LINE・Discord などに
 * リンクを貼ったとき、サイト共通カードではなく動画カードとして展開される。
 *
 * 動画タイトルは YouTube oEmbed から取得し、Cloudflare のエッジキャッシュに
 * 1日キャッシュする。取得失敗時はサイト既定のメタのまま返す。
 */

const VIDEO_ID_RE = /^[\w-]{11}$/;

export async function onRequest(context) {
  const { request, next } = context;
  if (request.method !== 'GET') return next();

  const url = new URL(request.url);
  // SPA ルートの HTML リクエストのみ対象（/api/ などはそのまま通す）
  if (url.pathname !== '/' && url.pathname !== '/index.html') return next();
  const v = url.searchParams.get('v');
  if (!v || !VIDEO_ID_RE.test(v)) return next();

  const response = await next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  // 動画タイトル取得（oEmbed・エッジキャッシュ1日）
  let title = '';
  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${v}&format=json`,
      { cf: { cacheTtl: 86400, cacheEverything: true } }
    );
    if (oembed.ok) {
      const data = await oembed.json();
      if (data?.title) title = String(data.title);
    }
  } catch (_) { /* タイトル不明でもサムネイルだけ差し替える */ }

  const ogTitle = title ? `${title}｜茨むあん 歌唱データベース` : '茨むあん 歌唱データベース';
  const ogImage = `https://i.ytimg.com/vi/${v}/hqdefault.jpg`;
  const ogDesc = title
    ? `「${title}」を茨むあん歌唱データベースで視聴`
    : '茨むあんさんの歌った曲リスト・歌枠アーカイブを視聴';

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  const replacements = {
    'og:title': ogTitle,
    'og:description': ogDesc,
    'og:image': ogImage,
    'og:url': url.href,
    'og:type': 'video.other',
  };
  const twitterReplacements = {
    'twitter:title': ogTitle,
    'twitter:description': ogDesc,
    'twitter:image': ogImage,
    'twitter:card': 'summary_large_image',
  };

  return new HTMLRewriter()
    .on('meta[property]', {
      element(el) {
        const prop = el.getAttribute('property');
        if (prop && prop in replacements) el.setAttribute('content', esc(replacements[prop]));
      },
    })
    .on('meta[name]', {
      element(el) {
        const name = el.getAttribute('name');
        if (name && name in twitterReplacements) el.setAttribute('content', esc(twitterReplacements[name]));
      },
    })
    .on('title', {
      element(el) {
        if (title) el.setInnerContent(ogTitle);
      },
    })
    .transform(response);
}
