/**
 * @module admin/timestamp-matcher
 * @description 歌枠の固定コメント（セトリ＋タイムスタンプ）を貼り付けて、
 * セットリスト各曲の開始秒を割り当てる純粋関数群。
 *
 * DOM にも通信にも触らないので、管理画面からも Node のツールからも使える。
 *
 * 照合の優先順は実データで決めたもので、順番を変えると精度が落ちる:
 *   1. 曲名の完全一致 かつ アーティストも一致（同名異アーティストの取り違え対策）
 *   2. 曲名の完全一致
 *   3. 曲名の部分一致（3文字以上かつ長さ比50%以上）
 *   4. 残りを並び順で補完（前後に確定済みがある区間だけ）
 *
 * 3 の下限を入れているのは、`5:21 "ん？"` のような短い相槌行が
 * 「高嶺の花子さん」に化けて刺さった実例があるため。
 *
 * 行の書式はチャンネルと時期でまちまち:
 *   新ch  `15:04 曲名 / 歌手 19:20`（時刻が前と後ろの両方）
 *   旧ch  `アーティスト/曲名12:54`（曲名の後ろに時刻）
 * どちらも「行から時刻を全部抜いた残り」を候補にすれば同じ扱いにできる。
 *
 * @副作用 なし
 */

/** 時刻。`1:02:03` と `12:34` の両方 */
const TS_RE = /(\d{1,3}:\d{2}(?::\d{2})?)/g;

/**
 * 曲ではない行。固定コメントによく混ざる目印を落とす。
 *
 * 末尾まで一致させるのが肝。前方一致にすると `START:DASH!! / μ's` が
 * 「start」の行と見なされて捨てられる（実際に2枠で取りこぼした）。
 * 目印行は単語だけか、せいぜい連番が付く程度なので末尾を縛って困らない。
 */
const NON_SONG_RE = /^(start|end|開始|終了|声入り|あくび|雑談|フリートーク|挨拶|自己紹介|告知|宣伝|お知らせ|休憩|スクショ|オープニング|エンディング|待機)\s*\d*\s*[~〜ー…!！?？]*$/i;

/** YouTube のコメント欄をそのまま貼ったときに混ざるヘッダー行 */
const HEADER_RE = /さんによって固定されています|^@|^\d+\s*(秒|分|時間|日|週間|か月|年)前$|^セトリ|^セットリスト|^タイムスタンプ|^setlist/i;

/** 曲名とアーティストの区切り。セトリ側の優先順（' / ' → '／' → '/'）とは別に、コメントは記号が多様 */
const SPLIT_RE = /[/／◇▸|｜･・]+/;

/**
 * 比較用に文字列をならす。
 * NFKC で半角カナ・全角英数を吸収し、括弧内の注記と記号・空白を落とす。
 *
 * @param {string} value
 * @returns {string}
 */
export function norm(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[（(\[【].*?[)）\]】]/g, '')
    .replace(/[\s　]/g, '')
    .replace(/[!-/:-@[-`{-~、。・！？「」『』…～－ー―‐]/g, '');
}

/**
 * 行頭の曲番号（`1.` `12)` `3、`）を落とす。
 * @param {string} value
 * @returns {string}
 */
export function stripTrackNo(value) {
  return String(value || '').replace(/^\s*\d{1,3}\s*[.．、)）:：]\s*/, '');
}

/**
 * `1:02:03` / `12:34` を秒に直す。
 * 分・秒が 60 以上の打ち間違い（`4:60:04` など）は無効として null を返す。
 *
 * @param {string} text
 * @returns {number|null}
 */
export function toSeconds(text) {
  const parts = String(text || '').split(':').map(Number);
  if (!parts.length || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 3) {
    if (parts[1] >= 60 || parts[2] >= 60) return null;
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    if (parts[1] >= 60) return null;
    return parts[0] * 60 + parts[1];
  }
  return null;
}

/**
 * 固定コメントを候補の一覧にする。時刻の昇順で返す。
 *
 * 行に複数の時刻があるときは、先頭を開始時刻とみなす（新chの
 * `15:04 曲名 / 歌手 19:20` は 15:04 が開始で 19:20 は終了）。
 *
 * @param {string} comment 固定コメント全文
 * @returns {{seconds:number, segments:string[], raw:string}[]}
 */
export function parseCandidates(comment) {
  const out = [];
  for (const line of String(comment || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || HEADER_RE.test(trimmed)) continue;

    const found = [...trimmed.matchAll(TS_RE)];
    if (!found.length) continue;
    const seconds = toSeconds(found[0][1]);
    if (seconds == null) continue;

    // 時刻を抜いた残り全部。旧ch の「曲名の直後に時刻」も同じ形になる
    const rest = trimmed.replace(TS_RE, ' ');
    if (NON_SONG_RE.test(stripTrackNo(rest.trim()))) continue;

    // 行まるごとと、区切りで割った断片の両方を候補にする
    const segments = [...new Set(
      [rest, ...rest.split(SPLIT_RE)]
        .map((part) => norm(stripTrackNo(part.trim())))
        .filter(Boolean),
    )];
    if (!segments.length) continue;

    out.push({ seconds, segments, raw: trimmed });
  }
  return out.sort((a, b) => a.seconds - b.seconds);
}

/** 部分一致の判定。短すぎる断片と、長さが違いすぎる組み合わせは弾く */
function looseHit(segment, title) {
  if (segment.length < 3 || title.length < 3) return false;
  const [long, short] = segment.length >= title.length ? [segment, title] : [title, segment];
  return long.includes(short) && short.length / long.length >= 0.5;
}

/**
 * セットリストに開始秒を割り当てる。
 *
 * @param {{title:string, artist?:string}[]} songs 曲順に並んだセットリスト
 * @param {string} comment 固定コメント全文
 * @returns {{seconds:number|null, how:string|null, raw:string|null}[]} songs と同じ長さ
 */
export function matchSetlist(songs, comment) {
  const list = Array.isArray(songs) ? songs : [];
  const candidates = parseCandidates(comment);
  const result = list.map(() => ({ seconds: null, how: null, raw: null }));
  const used = new Set();

  const titles = list.map((s) => norm(s?.title));
  const artists = list.map((s) => norm(s?.artist));

  const take = (i, c, how) => {
    result[i] = { seconds: candidates[c].seconds, how, raw: candidates[c].raw };
    used.add(c);
  };

  // 1) 曲名完全一致 かつ アーティスト一致
  for (let i = 0; i < list.length; i++) {
    if (!titles[i] || !artists[i]) continue;
    for (let c = 0; c < candidates.length; c++) {
      if (used.has(c)) continue;
      const segs = candidates[c].segments;
      if (segs.includes(titles[i]) && segs.includes(artists[i])) { take(i, c, '曲名+歌手'); break; }
    }
  }
  // 2) 曲名完全一致
  for (let i = 0; i < list.length; i++) {
    if (result[i].seconds != null || !titles[i]) continue;
    for (let c = 0; c < candidates.length; c++) {
      if (used.has(c)) continue;
      if (candidates[c].segments.includes(titles[i])) { take(i, c, '曲名一致'); break; }
    }
  }
  // 3) 部分一致
  for (let i = 0; i < list.length; i++) {
    if (result[i].seconds != null || !titles[i]) continue;
    for (let c = 0; c < candidates.length; c++) {
      if (used.has(c)) continue;
      if (candidates[c].segments.some((seg) => looseHit(seg, titles[i]))) { take(i, c, '部分一致'); break; }
    }
  }
  // 4) 残りを並び順で補完。前後の確定済みに挟まれた範囲の候補だけを使う
  const posOf = (seconds) => candidates.findIndex((c) => c.seconds === seconds);
  for (let i = 0; i < list.length; i++) {
    if (result[i].seconds != null) continue;
    let lo = -1;
    let hi = candidates.length;
    for (let k = i - 1; k >= 0; k--) if (result[k].seconds != null) { lo = posOf(result[k].seconds); break; }
    for (let k = i + 1; k < list.length; k++) if (result[k].seconds != null) { hi = posOf(result[k].seconds); break; }
    for (let c = lo + 1; c < hi; c++) {
      if (used.has(c)) continue;
      take(i, c, '並び順');
      break;
    }
  }

  return result;
}

/**
 * 割り当て結果の点検。曲順に対して時刻が巻き戻っている箇所を返す。
 * 逆転はコメントの誤記か、照合の取り違えか、セトリの並び自体がずれている目印になる。
 *
 * @param {{seconds:number|null}[]} matched
 * @returns {{index:number, prevIndex:number}[]}
 */
export function findInversions(matched) {
  const out = [];
  let prevIndex = -1;
  for (let i = 0; i < (matched?.length || 0); i++) {
    if (matched[i]?.seconds == null) continue;
    if (prevIndex >= 0 && matched[i].seconds < matched[prevIndex].seconds) out.push({ index: i, prevIndex });
    prevIndex = i;
  }
  return out;
}
