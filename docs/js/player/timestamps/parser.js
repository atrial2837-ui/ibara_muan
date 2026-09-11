// タイムスタンプコメント解析の純粋関数群
// 配信コメントからタイムスタンプ・曲名・アーティストを抽出し、セトリと突き合わせる

export const TS_TOKEN_RE = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;

// タイムスタンプ文字列（MM:SS or H:MM:SS）を秒数に変換
export function _parseTs(str) {
  const m = String(str || '').match(/(\d+):(\d{2}):(\d{2})|(\d+):(\d{2})/);
  if (!m) return null;
  if (m[1] !== undefined) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
  return parseInt(m[4]) * 60 + parseInt(m[5]);
}

// 配信タイムスタンプコメントの1行をパース
// 形式ゆれを広めに受ける:
// "MM:SS 曲名 / アーティスト MM:SS", "1. 曲名 - アーティスト 12:34",
// "[12:34] 曲名／アーティスト", "曲名 by アーティスト 12:34" など。
export function _parseTsCommentLine(line) {
  const source = String(line || '').trim();
  if (!source) return null;

  const timestamps = source.match(TS_TOKEN_RE) || [];
  if (!timestamps.length) return null;

  const body = _cleanTsCommentBody(source);
  if (!body) return null;

  const { title, artist } = _splitTsCommentSong(body);
  if (!title) return null;
  return {
    start: timestamps[0].trim(),
    title,
    artist,
    end: timestamps.length > 1 ? timestamps[timestamps.length - 1].trim() : '',
    raw: body,
  };
}

export function _cleanTsCommentBody(line) {
  return String(line || '')
    .replace(TS_TOKEN_RE, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/^\s*(?:\d+[\).．、:]|[#＃]\d+|[・\-*＊•▶▷♪♫🎵🎶]+)\s*/u, '')
    .replace(/^[\s　\[\]【】()（）<>＜＞「」『』"'`]+|[\s　\[\]【】()（）<>＜＞「」『』"'`]+$/g, '')
    .replace(/\s*(?:[-–—~〜→⇒>|｜]{2,}|[|｜])\s*$/g, '')
    .replace(/[ \t　]+/g, ' ')
    .trim();
}

export function _stripSongEdgeDecor(s) {
  return String(s || '')
    .replace(/^[\s　\[\]【】()（）<>＜＞「」『』"'`・\-*＊•▶▷♪♫🎵🎶]+/u, '')
    .replace(/[\s　\[\]【】()（）<>＜＞「」『』"'`]+$/g, '')
    .trim();
}

export function _splitTsCommentSong(body) {
  const text = _stripSongEdgeDecor(body);
  if (!text) return { title: '', artist: '' };

  const patterns = [
    /^(.+?)\s*(?:\/|／)\s*(.+)$/,
    /^(.+?)\s+(?:by|BY|By)\s+(.+)$/,
    /^(.+?)\s*(?:-|－|–|—|~|〜|｜|\|)\s*(.+)$/,
    /^(.+?)\s+(?:covered\s+by|cover\s+by|歌[:：])\s+(.+)$/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const title = _stripSongEdgeDecor(m[1]);
    const artist = _stripSongEdgeDecor(m[2]);
    if (title && artist) return { title, artist };
  }

  return { title: text, artist: '' };
}

// 文字列を正規化（大文字小文字・空白・記号を統一）してマッチングに使う
export function _normForMatch(s) {
  return (s || '').toLowerCase()
    .replace(/[\s　]/g, '')
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[・｡。、，,．.！!？?「」『』【】（）()]/g, '');
}

// パースした曲名・アーティストでセトリ内のインデックスを探す
export function _matchSongIdx(title, artist, songs) {
  const nt = _normForMatch(title);
  const na = _normForMatch(artist);
  let bestIdx = -1, bestScore = 0;
  for (let i = 0; i < songs.length; i++) {
    const st = _normForMatch(songs[i].title);
    const sa = _normForMatch(songs[i].artist);
    let score = 0;
    if (st === nt) score += 80;
    else if (nt.length > 1 && (st.includes(nt) || nt.includes(st))) score += 40;
    if (na && sa === na) score += 20;
    else if (na && na.length > 1 && (sa.includes(na) || na.includes(sa))) score += 10;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  if (bestScore < 40 && na) {
    for (let i = 0; i < songs.length; i++) {
      const st = _normForMatch(songs[i].title);
      const sa = _normForMatch(songs[i].artist);
      let score = 0;
      if (st === na) score += 70;
      else if (na.length > 1 && (st.includes(na) || na.includes(st))) score += 35;
      if (sa && sa === nt) score += 20;
      else if (nt.length > 1 && (sa.includes(nt) || nt.includes(sa))) score += 10;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
  }
  return bestScore >= 40 ? bestIdx : -1;
}
