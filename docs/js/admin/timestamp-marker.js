/**
 * @module admin/timestamp-marker
 * @description 管理画面の「タイムスタンプ打刻」で使う純粋関数群。
 *
 * DOM もプレイヤーも触らないので、そのままテストできる。
 *
 * ## 打刻の持ち方
 * セトリと同じ長さの配列で `{ start, end }` を持つ。どちらも秒数か null（未打刻）。
 * 曲の終わりを別に持つのは、コメントの書式が
 * 「開始 曲名 / アーティスト 終了」と両端を書くため。
 * 曲の終わり＝拍手が起きる地点なので、tools/chat-spikes.mjs の拍手の山がそのまま当たりになる。
 *
 * ## 配信の頭
 * 「start」「声入り」の2行は曲ではないので meta として別に持つ。
 * これにより API へ送る songIndex はセトリの並びとそのまま一致する。
 *
 * ## 時刻の書式
 * 1時間未満は `m:ss`、超えたら `h:mm:ss`。実際の固定コメントもこの書き分けをしている
 * （例: `4:20 開幕` / `1:00:47 シリョクケンサ`）。
 */

/** コメント1行分のテンプレート。{time} {end} {title} {artist} {n} を差し替える。 */
export const COMMENT_TEMPLATES = {
  'start-end': { label: '開始 曲名 / アーティスト 終了', template: '{time} {title} / {artist} {end}' },
  'start-only': { label: '開始 曲名 / アーティスト', template: '{time} {title} / {artist}' },
  'artist-first': { label: 'アーティスト/曲名 開始', template: '{artist}/{title} {time}' },
  'numbered': { label: '番号付き', template: '{n}. {time} {title} / {artist} {end}' },
};

/** 配信の頭に置く行の既定値。時刻は打刻して差し替える。 */
export const DEFAULT_META_ROWS = [
  { key: 'start', label: 'start' },
  { key: 'voice', label: '声入り' },
];

/**
 * 秒を時刻文字列にする。
 *
 * @param {number|null|undefined} seconds
 * @param {'auto'|'hms'|'ms'} [mode='auto'] - auto は1時間未満なら m:ss
 * @returns {string} 未打刻(null)なら ''
 */
export function formatSeconds(seconds, mode = 'auto') {
  if (seconds == null || !Number.isFinite(Number(seconds))) return '';
  const total = Math.max(0, Math.floor(Number(seconds)));
  const h = Math.floor(total / 3600);
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (mode === 'ms') return `${Math.floor(total / 60)}:${pad(s)}`;
  if (mode === 'hms' || h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

/**
 * "1:23:45" / "12:34" / "90" を秒に直す。解釈できなければ null。
 *
 * @param {unknown} text
 * @returns {number|null}
 */
export function parseTimeInput(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  if (!/^\d{1,3}(:\d{1,2}){0,2}$/.test(raw)) return null;
  const parts = raw.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  // "1:75" のような桁あふれを弾く（先頭以外は 60 未満）
  if (parts.length > 1 && parts.slice(1).some((n) => n >= 60)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** セトリの長さに合わせた未打刻の配列を作る。 */
export function createMarks(songCount) {
  return Array.from({ length: Math.max(0, Number(songCount) || 0) }, () => ({ start: null, end: null }));
}

/**
 * 指定位置の開始/終了に時刻を記録した新しい配列を返す。
 *
 * @param {{start:number|null,end:number|null}[]} marks
 * @param {number} index
 * @param {'start'|'end'} field
 * @param {number|null} seconds
 * @returns {{start:number|null,end:number|null}[]}
 */
export function setMark(marks, index, field, seconds) {
  const list = Array.isArray(marks) ? marks.map((m) => ({ ...m })) : [];
  const i = Math.trunc(Number(index));
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return list;
  if (field !== 'start' && field !== 'end') return list;
  list[i][field] = seconds == null ? null : Math.max(0, Math.floor(Number(seconds)));
  return list;
}

/**
 * 開始が未打刻の最初の位置。全部埋まっていれば -1。
 *
 * @param {{start:number|null}[]} marks
 * @param {number} [from=0]
 * @returns {number}
 */
export function nextUnmarkedIndex(marks, from = 0) {
  const list = Array.isArray(marks) ? marks : [];
  for (let i = Math.max(0, from); i < list.length; i++) if (list[i]?.start == null) return i;
  return -1;
}

/**
 * 「終了」を打つ相手を決める。
 *
 * 前から順に打っていくと、開始を打った時点で対象は次の曲へ進んでいる。
 * そのまま終了キーを押したときに、いま歌い終わった曲へ入るようにする。
 *   - 選択中の曲が開始済みならそこ（特定の曲を打ち直したいとき）
 *   - そうでなければ「開始済みだが終了が空」の最後の曲
 *
 * @param {{start:number|null,end:number|null}[]} marks
 * @param {number} selected - いま選択している位置
 * @returns {number} 対象の位置。見つからなければ -1
 */
export function endTargetIndex(marks, selected) {
  const list = Array.isArray(marks) ? marks : [];
  const i = Math.trunc(Number(selected));
  if (Number.isInteger(i) && i >= 0 && i < list.length && list[i]?.start != null) return i;
  for (let j = list.length - 1; j >= 0; j--) {
    if (list[j]?.start != null && list[j]?.end == null) return j;
  }
  return -1;
}

/**
 * 打刻の矛盾を洗い出す。
 *   - 開始がセトリ順どおり増えていない
 *   - 終了が同じ曲の開始より前
 *   - 終了が次の曲の開始より後（曲が重なっている）
 *
 * @param {{start:number|null,end:number|null}[]} marks
 * @returns {{ index: number, reason: string }[]}
 */
export function findMarkIssues(marks) {
  const list = Array.isArray(marks) ? marks : [];
  const issues = [];
  let prevStart = -1;
  list.forEach((m, i) => {
    const { start, end } = m || {};
    if (start != null) {
      if (start < prevStart) issues.push({ index: i, reason: '前の曲より開始が早い' });
      prevStart = Math.max(prevStart, start);
    }
    if (start != null && end != null && end <= start) issues.push({ index: i, reason: '終了が開始より前' });
  });
  for (let i = 0; i < list.length - 1; i++) {
    const end = list[i]?.end;
    const nextStart = list[i + 1]?.start;
    if (end != null && nextStart != null && end > nextStart) {
      issues.push({ index: i, reason: '次の曲の開始より終了が遅い' });
    }
  }
  return issues;
}

/**
 * 次に打刻する曲のシーク先を予測する。
 *
 * 直前に打刻済みの位置から「残り時間 ÷ 残り曲数」で等間隔に置いた位置を返す。
 * あくまで当たりを付けるための値。
 *
 * @param {{start:number|null}[]} marks
 * @param {number} index - これから打刻する位置
 * @param {number} duration - 配信の長さ（秒）
 * @returns {number|null}
 */
export function predictSeek(marks, index, duration) {
  const list = Array.isArray(marks) ? marks : [];
  const i = Math.trunc(Number(index));
  const total = Number(duration);
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return null;
  if (!Number.isFinite(total) || total <= 0) return null;

  let prevIndex = -1;
  for (let j = i - 1; j >= 0; j--) if (list[j]?.start != null) { prevIndex = j; break; }

  const start = prevIndex < 0 ? 0 : /** @type {number} */ (list[prevIndex].start);
  const remainingSongs = list.length - (prevIndex + 1);
  if (remainingSongs <= 0) return null;
  const step = (total - start) / remainingSongs;
  return Math.max(0, Math.round(start + step * (i - prevIndex)));
}

/**
 * 現在位置より後ろにある最初のアンカー（チャットの山など）。無ければ null。
 *
 * @param {number[]} anchors
 * @param {number} seconds
 * @returns {number|null}
 */
export function nextAnchor(anchors, seconds) {
  const list = (Array.isArray(anchors) ? anchors : []).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  for (const a of list) if (a > seconds) return a;
  return null;
}

/**
 * 現在位置より前にある最後のアンカー。無ければ null。
 *
 * @param {number[]} anchors
 * @param {number} seconds
 * @returns {number|null}
 */
export function prevAnchor(anchors, seconds) {
  const list = (Array.isArray(anchors) ? anchors : []).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  let found = null;
  for (const a of list) { if (a < seconds) found = a; else break; }
  return found;
}

/**
 * 歌枠1件の打刻状況を判定する。
 *
 * プルダウンで「もう入っている枠」と「まだの枠」を見分けるために使う。
 *
 * @param {number} songCount - その枠のセトリ曲数
 * @param {number} covered   - 登録済みのタイムスタンプ件数
 * @returns {{ state: 'done'|'partial'|'none', mark: string, covered: number, songCount: number }}
 */
export function coverageState(songCount, covered) {
  const total = Math.max(0, Math.floor(Number(songCount) || 0));
  const done = Math.max(0, Math.floor(Number(covered) || 0));
  if (done <= 0) return { state: 'none', mark: '未', covered: 0, songCount: total };
  // 曲数が不明(0)でも、入っていれば済み扱いにする
  if (total > 0 && done < total) {
    return { state: 'partial', mark: `△${done}/${total}`, covered: done, songCount: total };
  }
  return { state: 'done', mark: '✓', covered: done, songCount: total };
}

/**
 * 歌枠プルダウンに出す1行を組み立てる。
 *
 * 打刻ツールでは先頭に状態（✓ / △ / 未）を置く。選択肢が191件並ぶため、
 * 「未」の枠を目で拾えるようにするのが目的。
 * セトリ編集のように打刻状態が関係ない場面では covered に null を渡すと状態を省く。
 *
 * @param {{ streamed_on?: string, source_index?: number|null, title?: string, song_count?: number }} stream
 * @param {number|null} covered - 登録済みのタイムスタンプ件数。null なら状態を出さない
 * @returns {string}
 */
export function streamOptionLabel(stream, covered) {
  const songCount = Number(stream?.song_count) || 0;
  const mark = covered == null ? '' : coverageState(songCount, covered).mark;
  const index = stream?.source_index ?? '-';
  const title = String(stream?.title ?? '').slice(0, 40);
  return `${mark} ${stream?.streamed_on ?? ''} #${index} ${title}（${songCount}曲）`.replace(/\s+/g, ' ').trim();
}

/**
 * 打刻したあとに自動で飛ぶ先を決める。
 *
 * チャットの山（tools/chat-spikes.mjs の出力）があればそれを優先する。
 * 山は拍手＝曲の終わり際に立つので、いま開始を打った曲の終わり付近に着地する。
 * そこから終了を打ち、少し進めば次の曲の頭に届く。
 * 山が無い枠では「残り時間 ÷ 残り曲数」で等間隔に当たりを付ける。
 *
 * @param {{start:number|null}[]} marks
 * @param {number} index - 次に打刻する曲の位置
 * @param {number} duration - 配信の長さ（秒）
 * @param {number[]} anchors - チャットの山（秒）
 * @param {number} from - いまの再生位置（秒）
 * @param {{ guard?: number }} [options] - guard: いま打った曲の中の山を拾わないための余白
 * @returns {{ seconds: number, by: 'anchor'|'even' }|null}
 *   決められなければ null。by はどちらで決めたか（案内文を正しく出すために返す）。
 */
export function nextJumpTarget(marks, index, duration, anchors, from, options = {}) {
  const { guard = 60 } = options;
  const anchor = nextAnchor(anchors, Number(from || 0) + guard);
  if (anchor != null) return { seconds: anchor, by: 'anchor' };
  const even = predictSeek(marks, index, duration);
  return even == null ? null : { seconds: even, by: 'even' };
}

/**
 * コメント用のテキストを組み立てる。
 *
 * 出力例（既定のテンプレート）:
 * ```
 * 0:00 start
 * 4:42 声入り
 *
 * 15:04 残酷な天使のテーゼ / 高橋洋子 19:20
 * 1:00:47 シリョクケンサ / 40mP 1:04:31
 * ```
 * 開始が未打刻の曲は行ごと落とす。終了が未打刻なら末尾の時刻を省く。
 *
 * @param {{title:string, artist?:string}[]} songs
 * @param {{start:number|null,end:number|null}[]} marks
 * @param {object} [options]
 * @param {string} [options.template]
 * @param {'auto'|'hms'|'ms'} [options.timeFormat]
 * @param {{key:string,label:string}[]} [options.metaRows] - 配信の頭に置く行
 * @param {Record<string, number|null>} [options.meta] - metaRows の key → 秒数
 * @param {string} [options.footer]
 * @returns {string}
 */
export function buildCommentText(songs, marks, options = {}) {
  const {
    template = COMMENT_TEMPLATES['start-end'].template,
    timeFormat = 'auto',
    metaRows = DEFAULT_META_ROWS,
    meta = {},
    footer = '',
  } = options;

  const headerLines = (metaRows || [])
    .filter((row) => meta?.[row.key] != null)
    .map((row) => `${formatSeconds(meta[row.key], timeFormat)} ${row.label}`.trim());

  const list = Array.isArray(songs) ? songs : [];
  const songLines = [];
  list.forEach((song, i) => {
    const mark = Array.isArray(marks) ? marks[i] : null;
    if (mark?.start == null) return;
    const artist = String(song?.artist ?? '').trim();
    let line = String(template)
      .replaceAll('{time}', formatSeconds(mark.start, timeFormat))
      .replaceAll('{end}', formatSeconds(mark.end, timeFormat))
      .replaceAll('{title}', String(song?.title ?? '').trim())
      .replaceAll('{artist}', artist)
      .replaceAll('{n}', String(i + 1));
    // アーティスト未設定・終了未打刻でも区切りが浮かないように整える
    if (!artist) line = line.replace(/\s*[/／]\s*(?=\s|$)/, ' ');
    songLines.push(line.replace(/\s{2,}/g, ' ').trim());
  });

  const blocks = [];
  if (headerLines.length) blocks.push(headerLines.join('\n'));
  if (songLines.length) blocks.push(songLines.join('\n'));
  if (String(footer).trim()) blocks.push(String(footer).trim());
  // 配信の頭とセトリの間は1行空ける
  return blocks.join('\n\n');
}

/**
 * 保存API へ送る形に変換する。開始が未打刻の曲は含めない。
 *
 * community_timestamps は1曲1時刻なので、曲の開始だけを送る。
 * 終了はコメント整形用の情報なので保存対象外。
 *
 * @param {{start:number|null}[]} marks
 * @returns {{ songIndex: number, timeSeconds: number }[]}
 */
export function buildSavePayload(marks) {
  const list = Array.isArray(marks) ? marks : [];
  const items = [];
  list.forEach((mark, songIndex) => {
    if (mark?.start == null) return;
    items.push({ songIndex, timeSeconds: Math.max(0, Math.floor(mark.start)) });
  });
  return items;
}

/**
 * 既存の承認済みタイムスタンプ（API の items 形式）を marks に戻す。
 *
 * @param {{songIndex:number, timeSeconds:number}[]} items
 * @param {number} songCount
 * @returns {{start:number|null,end:number|null}[]}
 */
export function marksFromItems(items, songCount) {
  const marks = createMarks(songCount);
  for (const item of Array.isArray(items) ? items : []) {
    const i = Number(item?.songIndex);
    const sec = Number(item?.timeSeconds);
    if (!Number.isInteger(i) || i < 0 || i >= marks.length) continue;
    if (!Number.isFinite(sec)) continue;
    marks[i].start = Math.max(0, Math.floor(sec));
  }
  return marks;
}
