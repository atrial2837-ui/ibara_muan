/**
 * @fileoverview YouTube ID 抽出・サムネイル URL 生成
 * Clean Architecture Domain 層 (shared/id) の実装
 *
 * SoT §2-3 に従い、既存の youtubeVideoId, youtubeThumb,
 * youtubeThumbFallback, youtubeThumbTiny を統合。
 */

/**
 * URL から YouTube 動画 ID (11 文字) を抽出
 * @param {string | null | undefined} url - YouTube URL
 * @returns {string | null} 抽出された ID、または null (無効/空文字の場合は null を返す)
 * @pure 副作用なし
 *
 * 対応パターン:
 *   - youtu.be/XXXXXXXXXXX
 *   - youtube.com/watch?v=XXXXXXXXXXX
 *   - youtube.com/live/XXXXXXXXXXX
 *   - youtube.com/shorts/XXXXXXXXXXX
 *   - youtube.com/embed/XXXXXXXXXXX
 */
export function extractYoutubeVideoId(url) {
  const text = String(url || '');
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?[^#]*v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * YouTube 動画 ID からサムネイル URL を生成
 * @param {string | null | undefined} url - YouTube URL (または動画 ID)
 * @param {('default' | 'mq' | 'hq')} [quality='hq'] - サムネイル品質
 *   - 'default': default.jpg (120x90)
 *   - 'mq': mqdefault.jpg (320x180)
 *   - 'hq': hqdefault.jpg (480x360) [デフォルト]
 * @returns {string} サムネイル URL、またはサムネイル取得不可の場合は空文字
 * @pure 副作用なし
 *
 * URL が無効または ID 抽出失敗時は既存と同じく空文字を返す
 */
export function youtubeThumbUrl(url, quality = 'hq') {
  const id = extractYoutubeVideoId(url);
  if (!id) return '';

  const qualityMap = {
    default: 'default.jpg',
    mq: 'mqdefault.jpg',
    hq: 'hqdefault.jpg',
  };

  const filename = qualityMap[quality] || qualityMap.hq;
  return `https://i.ytimg.com/vi/${id}/${filename}`;
}

/**
 * YouTube サムネイル (hqdefault.jpg, 480x360)
 * 互換性関数
 * @param {string | null | undefined} url - YouTube URL
 * @returns {string} hqdefault.jpg URL
 */
export function youtubeMaxThumb(url) {
  return youtubeThumbUrl(url, 'hq');
}

/**
 * YouTube サムネイル (mqdefault.jpg, 320x180)
 * 互換性関数
 * @param {string | null | undefined} url - YouTube URL
 * @returns {string} mqdefault.jpg URL
 */
export function youtubeHqThumb(url) {
  return youtubeThumbUrl(url, 'mq');
}

/**
 * YouTube サムネイル (default.jpg, 120x90)
 * 互換性関数
 * @param {string | null | undefined} url - YouTube URL
 * @returns {string} default.jpg URL
 */
export function youtubeDefaultThumb(url) {
  return youtubeThumbUrl(url, 'default');
}
