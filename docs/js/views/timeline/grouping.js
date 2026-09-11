/**
 * 配信タイムラインの並び替え・月グループ化・セトリ整形。
 *
 * DOM に触らない純粋関数だけを置く（テスト可能にするための分離）。
 * 描画は views/timeline.js が担当する。
 */

/**
 * 配信を年月ごとにまとめる。入力の並び順を保ったまま、
 * 初出の月から順に [{ key, label, streams }] を返す。
 *
 * @param {Array<{date: Date|string|number}>} streams
 * @returns {Array<{key: string, label: string, streams: object[]}>}
 */
export function groupByYearMonth(streams) {
  const groups = new Map();
  for (const s of streams) {
    const d = s.date instanceof Date ? s.date : new Date(s.date || 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    if (!groups.has(key)) groups.set(key, { key, label, streams: [] });
    groups.get(key).streams.push(s);
  }
  return [...groups.values()];
}

/**
 * 配信を指定の条件で並び替える（元配列は破壊しない）。
 * 同点時は常に「新しい配信 → 枠番号の大きい順」で決着させ、
 * 同じ入力なら常に同じ並びになるようにする。
 *
 * @param {object[]} streams
 * @param {'date-desc'|'date-asc'|'songs-desc'|'songs-asc'|'index-desc'|'index-asc'|'title'} sort
 * @returns {object[]}
 */
export function sortTimelineStreams(streams, sort) {
  const list = [...streams];
  const dateTime = (s) => s.date instanceof Date ? s.date.getTime() : new Date(s.date || 0).getTime();
  const streamIndex = (s) => Number(s.index) || 0;
  const songCount = (s) => s.songs?.length || 0;
  const byDateDesc = (a, b) => dateTime(b) - dateTime(a) || streamIndex(b) - streamIndex(a);

  switch (sort) {
    case 'date-asc':
      list.sort((a, b) => dateTime(a) - dateTime(b) || streamIndex(a) - streamIndex(b));
      break;
    case 'songs-desc':
      list.sort((a, b) => songCount(b) - songCount(a) || byDateDesc(a, b));
      break;
    case 'songs-asc':
      list.sort((a, b) => songCount(a) - songCount(b) || byDateDesc(a, b));
      break;
    case 'index-desc':
      list.sort((a, b) => streamIndex(b) - streamIndex(a) || byDateDesc(a, b));
      break;
    case 'index-asc':
      list.sort((a, b) => streamIndex(a) - streamIndex(b) || byDateDesc(a, b));
      break;
    case 'title':
      list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ja') || byDateDesc(a, b));
      break;
    case 'date-desc':
    default:
      list.sort(byDateDesc);
      break;
  }
  return list;
}

/**
 * セットリストをコピー用テキストにする。
 * アーティスト未登録の曲は曲名のみ、曲名が空の行は落とす。
 *
 * @param {{songs?: Array<{title?: string, artist?: string}>}} stream
 * @returns {string}
 */
export function formatStreamSetlist(stream) {
  return (stream.songs || [])
    .map((song) => {
      const title = String(song?.title || '').trim();
      const artist = String(song?.artist || '').trim();
      return artist ? `${title} / ${artist}` : title;
    })
    .filter(Boolean)
    .join('\n');
}
