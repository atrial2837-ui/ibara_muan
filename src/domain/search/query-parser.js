/**
 * @module domain/search/query-parser
 * @description 検索クエリの field:value フィルタ解析。
 *
 * 既存: docs/js/search.js:52-66
 * @副作用 なし
 */

import { GENRE_LIST } from '../song/genre.js';
import { normalize } from '../shared/text.js';

/** @type {RegExp} */
export const FIELD_FILTER_RE = /(?<key>title|artist|genre|tag|mood|season|key|count|last|days)\s*(?<op>:|<=|>=|=|<|>)\s*(?<val>"[^"]*"|\S+)/gi;

/**
 * @typedef {object} FieldFilter
 * @property {string} key
 * @property {string} op
 * @property {string} val
 */

/**
 * @typedef {object} SearchQuery
 * @property {string[]} tokens
 * @property {FieldFilter[]} filters
 */

/**
 * @param {string} raw
 * @returns {SearchQuery}
 */
export function parseQuery(raw) {
  /** @type {FieldFilter[]} */
  const filters = [];
  let rest = raw;
  rest = rest.replace(FIELD_FILTER_RE, (_m, key, op, val) => {
    let v = val;
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    filters.push({ key: key.toLowerCase(), op: op || ':', val: v });
    return ' ';
  });

  rest = applyNaturalLanguageFilters(rest, filters);
  rest = rest.trim().replace(/\s+/g, ' ');
  const tokens = rest ? rest.split(' ') : [];
  return { tokens, filters };
}

/**
 * フリーワード内のよくある日本語条件を既存の field filter に寄せる。
 * 例: "最近歌っていないボカロ" → genre:ボカロ + days:>30
 *
 * @param {string} raw
 * @param {FieldFilter[]} filters
 * @returns {string}
 */
function applyNaturalLanguageFilters(raw, filters) {
  let rest = raw || '';
  const before = filters.length;

  for (const { label, patterns } of NATURAL_GENRES) {
    for (const pattern of patterns) {
      if (!pattern.test(rest)) continue;
      addFilter(filters, 'genre', ':', label);
      rest = rest.replace(pattern, ' ');
      break;
    }
  }

  for (const rule of NATURAL_PRIORITY_RULES) {
    if (!rule.pattern.test(rest)) continue;
    addFilter(filters, rule.key, rule.op, rule.val);
    rest = rest.replace(rule.pattern, ' ');
  }

  for (const { key, label, patterns } of NATURAL_FACETS) {
    for (const pattern of patterns) {
      if (!pattern.test(rest)) continue;
      addFilter(filters, key, ':', label);
      rest = rest.replace(pattern, ' ');
      break;
    }
  }

  for (const rule of NATURAL_RULES) {
    if (!rule.pattern.test(rest)) continue;
    addFilter(filters, rule.key, rule.op, rule.val);
    rest = rest.replace(rule.pattern, ' ');
  }

  if (filters.length > before) {
    // 読点・句点を空白に
    rest = rest.replace(/[、。・]/g, ' ');
    // 「な」「の」「で」「系」「感じ」「とか」「みたいな」「曲」などを除去
    const JUNK = /(の|な|で|を|が|に|は|も|だけ|から|など|とか|みたいな|ような|系の?|感じ?|感の?|曲|楽曲|ソング|歌)/g;
    // 前後のジャンクを削除（日本語はword境界\bが効かないため位置で判断）
    rest = rest
      .replace(new RegExp('^' + JUNK.source + '+', 'g'), ' ')
      .replace(new RegExp(JUNK.source + '+$', 'g'), ' ')
      .replace(new RegExp('(?<=\\s)' + JUNK.source + '+(?=\\s|$)', 'g'), ' ');
    if (/^\s*$/.test(rest.replace(JUNK, ' '))) {
      rest = ' ';
    }
  }

  return rest;
}

/**
 * @param {FieldFilter[]} filters
 * @param {string} key
 * @param {string} op
 * @param {string} val
 */
function addFilter(filters, key, op, val) {
  if (filters.some((filter) => filter.key === key && filter.op === op && filter.val === val)) return;
  filters.push({ key, op, val });
}

const NATURAL_PRIORITY_RULES = [
  { pattern: /(1週間以内|7日以内|超最近)/i, key: 'last', op: ':', val: 'fresh' },
  { pattern: /(15回以上|殿堂入り)/i, key: 'count', op: '>=', val: '15' },
  { pattern: /(3回以下|準レア)/i, key: 'count', op: '<=', val: '3' },
];

const NATURAL_GENRES = [
  ...GENRE_LIST.map((genre) => ({
    label: genre,
    patterns: [new RegExp(escapeRegExp(normalize(genre)), 'i')],
  })),
  { label: 'ボカロ', patterns: [/ボーカロイド/i, /vocaloid/i, /ボカロ曲/i, /ボカロ系/i] },
  { label: 'アニソン', patterns: [/アニメソング/i, /アニメ曲/i, /アニソン系/i, /アニメ系/i, /アニメの曲/i] },
  { label: 'J-POP', patterns: [/jpop/i, /邦楽/i, /ポップス?/i, /ポップ(系|な曲)/i] },
  { label: 'R&B', patterns: [/r&b/i, /rnb/i, /リズム(アンド)?ブルース/i] },
];

const NATURAL_FACETS = [
  // ── 雰囲気 ──────────────────────────────────────────────────────────────────
  { key: 'mood', label: 'しっとり', patterns: [
    /しっとり/i, /バラード/i, /落ち着(い|く)/i, /静か/i, /泣ける/i,
    /スロー(テンポ)?/i, /ゆったり/i, /ゆっくり/i, /ゆるやか/i,
    /しんみり/i, /情緒(ある|系)?/i, /しみじみ/i, /じんわり/i,
    /穏やか/i, /おだやか/i, /大人(っぽい|な)(曲)?/i,
  ] },
  { key: 'mood', label: '盛り上がる', patterns: [
    /明るい/i, /元気/i, /楽しい/i, /盛り上が(る|り)/i, /アップテンポ/i,
    /熱い/i, /あつい/i, /アツい/i, /アツイ/i,
    /ノリノリ/i, /ノリ(が)?いい/i,
    /アゲアゲ/i, /アゲ(な|系)?/i,
    /ハイテンション/i, /テンション(が)?(上がる|あがる|高い|高め)/i,
    /ウキウキ/i, /わくわく/i, /ワクワク/i,
    /楽しくなれる/i, /元気が出る/i, /元気になれる/i,
    /ポジティブ/i,
  ] },
  { key: 'mood', label: 'かわいい', patterns: [
    /かわいい/i, /可愛い/i, /キュート/i,
    /ふわふわ/i, /ほんわか/i, /ふわっと/i,
    /ポップかわいい/i,
  ] },
  { key: 'mood', label: 'かっこいい', patterns: [
    /かっこいい/i, /格好いい/i, /クール/i, /ロック/i,
    /渋い/i, /しぶい/i, /スタイリッシュ/i, /おしゃれ/i,
    /ハードロック/i, /ヘビメタ/i, /バンド(系)?/i,
  ] },
  { key: 'mood', label: 'chill', patterns: [
    /chill/i, /チル(い|な|系)?/i, /のんびり/i, /リラックス/i, /ほっこり/i, /まったり/i,
    /癒し(系|な)?/i, /いやし/i, /ヒーリング/i,
    /ゆるい/i, /ゆる(系|め|い)/i,
    /安らぎ/i, /和む/i, /なごむ/i, /なごやか/i,
    /まどろむ/i, /うとうと/i, /夜(に)?聴(き|く)/i, /寝る前/i,
  ] },
  { key: 'mood', label: '激しい', patterns: [
    /激しい/i, /アグレッシブ/i, /パンク/i, /メタル/i, /スクリーム/i, /叫ぶ/i,
    /燃える/i, /もえる/i, /燃え上がる/i, /激アツ/i,
    /ガチ(な|系)?/i, /気合(い)?(入り|満々)?/i, /熱量(高い)?/i,
    /テンション爆上がり/i,
  ] },
  { key: 'mood', label: 'ミステリアス', patterns: [
    /ミステリ(アス)?/i, /怪談/i, /幽霊/i, /魔女/i, /魔法/i, /幻想/i,
    /神秘(的)?/i, /ふしぎ/i, /不思議/i,
  ] },
  { key: 'mood', label: '懐かしい', patterns: [
    /懐かし(い|む|の)/i, /なつかし/i, /懐メロ/i,
    /古き(良き)?/i, /昔っぽい/i, /昔の(曲)?/i, /むかしの/i,
    /思い出(の曲)?/i,
  ] },
  { key: 'mood', label: 'ノスタルジック', patterns: [
    /ノスタルジ(ック)?/i, /レトロ/i, /昭和/i, /平成/i, /青春/i, /初恋/i, /あの頃/i,
    /記憶/i,
  ] },
  { key: 'mood', label: '切ない', patterns: [
    /切ない/i, /せつない/i,
  ] },
  { key: 'mood', label: 'エモい', patterns: [
    /エモ(い|系)?/i,
    /苦しい/i, /もどかしい/i, /片思い/i, /失恋/i, /恋しい/i,
    /胸が痛/i, /涙/i, /夕焼け/i, /卒業/i, /別れ/i, /さよなら/i,
    /感動(的|系)?/i, /ジーン(とする)?/i, /じ[んー]とする/i,
    /心に(刺さる|響く|くる)/i, /胸に(刺さる|響く|くる)/i, /胸が熱くなる/i,
    /グッとくる/i, /ぐっとくる/i,
  ] },
  { key: 'mood', label: 'ダーク', patterns: [
    /ダーク(系)?/i, /闇/i, /地獄/i, /悪魔/i, /カオス/i,
    /怖い/i, /恐い/i, /こわい/i, /ゾクゾク/i, /ホラー(系)?/i,
    /不気味/i, /暗め/i, /くらい(曲)?/i, /陰気/i,
  ] },
  { key: 'mood', label: 'ファンキー', patterns: [
    /ファンキー/i, /ファンク/i, /グルーヴ/i, /ディスコ/i, /ソウル/i,
    /ノリのいいR&B/i,
  ] },
  { key: 'mood', label: '甘い', patterns: [
    /甘い/i, /ハニー/i, /シュガー/i, /キャンディ/i, /チョコ/i, /バニラ/i,
    /甘甘/i, /甘々/i, /ラブラブ/i, /恋愛(っぽい)?/i, /恋(の曲)?/i, /ラブ(ソング)?/i,
  ] },
  { key: 'mood', label: 'セクシー', patterns: [/セクシー/i, /セクシ/i, /エロ/i, /色っぽい/i, /誘惑/i] },
  { key: 'mood', label: '和風', patterns: [
    /和風/i, /日本風/i, /大和/i, /桜/i, /侍/i, /忍者/i, /演歌/i,
    /和(テイスト|な感じ|っぽい)/i, /琴/i, /三味線/i, /雅/i, /みやび/i,
  ] },
  { key: 'mood', label: 'エレクトロ', patterns: [
    /エレクトロ(ニカ)?/i, /シンセ/i, /テクノ/i, /edm/i,
    /電子(音楽)?/i, /ダンスミュージック/i,
  ] },
  { key: 'mood', label: 'アコースティック', patterns: [
    /アコースティック/i, /アコギ/i, /ピアノ(曲|弾き語り)?/i, /ヴァイオリン/i, /弾き語り/i,
    /生(音|演奏)/i, /生演奏(っぽい)?/i, /ギター(一本|弾き語り)/i,
  ] },
  { key: 'season', label: '春', patterns: [/春/i, /桜/i, /卒業/i] },
  { key: 'season', label: '夏', patterns: [/夏/i, /海/i, /花火/i] },
  { key: 'season', label: '秋', patterns: [/秋/i] },
  { key: 'season', label: '冬', patterns: [/冬/i, /雪/i, /クリスマス/i] },
  { key: 'tag', label: 'キー確認済み', patterns: [/キー\s*(確認済み|あり|有り|公開|わかる|分かる)/i] },
  { key: 'tag', label: '定番', patterns: [/定番/i] },
  { key: 'tag', label: '久しぶり候補', patterns: [/久しぶり候補/i] },
  { key: 'tag', label: 'レア', patterns: [/レア/i] },
  { key: 'tag', label: '殿堂入り', patterns: [/殿堂入り/i] },
  { key: 'tag', label: 'よく歌う', patterns: [/よく歌う/i, /よく歌っている/i] },
  { key: 'tag', label: '準レア', patterns: [/準レア/i] },
  { key: 'tag', label: '超久しぶり', patterns: [/超久しぶり/i, /1年以上/i, /365日以上/i] },
  { key: 'tag', label: 'やや久しぶり', patterns: [/やや久しぶり/i, /90日以上/i, /3ヶ月以上/i] },
  { key: 'tag', label: '超最近', patterns: [/超最近/i, /1週間以内/i, /7日以内/i] },
  { key: 'tag', label: '歌ったことない', patterns: [/歌ったことない/i, /未歌唱/i, /初めて/i] },
  { key: 'tag', label: 'ラブソング', patterns: [/ラブソング/i, /恋愛ソング/i, /愛の歌/i] },
  { key: 'tag', label: '失恋ソング', patterns: [/失恋ソング/i, /失恋ソング/i, /別れソング/i] },
  { key: 'tag', label: '夏フェス', patterns: [/夏フェス/i, /夏祭りソング/i] },
  { key: 'tag', label: 'パーティソング', patterns: [/パーティソング/i, /パーティー/i] },
  { key: 'tag', label: 'キュンソング', patterns: [/キュンソング/i, /キュン/i, /ときめき/i] },
  { key: 'tag', label: '定番アンセム', patterns: [/定番アンセム/i, /全員で歌/i, /大合唱/i] },
  { key: 'tag', label: '定番バラード', patterns: [/定番バラード/i] },
  { key: 'tag', label: '久しぶりの名曲', patterns: [/久しぶりの名曲/i] },
  { key: 'tag', label: '夜chill', patterns: [/夜chill/i, /ナイトチル/i] },
  { key: 'tag', label: '朝chill', patterns: [/朝chill/i, /モーニングチル/i] },
  { key: 'tag', label: 'エモラブ', patterns: [/エモラブ/i] },
  { key: 'tag', label: 'エレクトロダンス', patterns: [/エレクトロダンス/i] },
  { key: 'tag', label: '和風', patterns: [/和風/i, /日本風/i, /大和/i, /桜/i, /侍/i, /忍者/i, /演歌/i] },
  { key: 'tag', label: 'エレクトロ', patterns: [/エレクトロ/i, /エレクトロニカ/i, /シンセ/i, /テクノ/i, /edm/i] },
  { key: 'tag', label: 'アコースティック', patterns: [/アコースティック/i, /アコギ/i, /ピアノ/i, /ヴァイオリン/i, /弾き語り/i] },
  { key: 'key', label: '+1', patterns: [/\+1/i, /プラス1/i] },
  { key: 'key', label: '+2', patterns: [/\+2/i, /プラス2/i] },
  { key: 'key', label: '+3', patterns: [/\+3/i, /プラス3/i] },
  { key: 'key', label: '-1', patterns: [/-1/i, /マイナス1/i] },
  { key: 'key', label: '-2', patterns: [/-2/i, /マイナス2/i] },
  { key: 'key', label: '-3', patterns: [/-3/i, /マイナス3/i] },
];

const NATURAL_RULES = [
  // ── 最終歌唱からの日数 ──────────────────────────────────────────────────────
  { pattern: /最近\s*(歌っ?て)?\s*(いない|ない|なさそう|なさげ)/i, key: 'days', op: '>', val: '30' },
  { pattern: /しばらく\s*(歌っ?て)?\s*(いない|ない)/i, key: 'days', op: '>', val: '30' },
  { pattern: /(しばらく歌って?ない|かなり久しぶり|かなりひさしぶり)/i, key: 'last', op: ':', val: 'stale' },
  { pattern: /(久しぶり|久々|半年以上|180日以上|長く\s*歌っ?て\s*(いない|ない))/i, key: 'last', op: ':', val: 'stale' },
  { pattern: /(最近\s*(歌った|歌ってる|歌われた)|30日以内|最近披露)/i, key: 'last', op: ':', val: 'fresh' },
  { pattern: /(履歴未確認|未歌唱|歌ったこと\s*(が)?\s*ない|まだ歌っていない|まだうたっていない)/i, key: 'last', op: ':', val: 'never' },
  { pattern: /(100日以上|3ヶ月以上|半年以上)\s*(歌っ?て)?\s*(いない|ない)/i, key: 'days', op: '>', val: '100' },
  { pattern: /(1週間以内|7日以内|超最近)/i, key: 'last', op: ':', val: 'fresh' },
  // ── 歌唱回数 ────────────────────────────────────────────────────────────────
  { pattern: /(定番|よく歌う|よく歌っている|よく歌われる)/i, key: 'count', op: '>=', val: '8' },
  { pattern: /(レア|あまり歌っていない|あまり歌わない|珍しい|めずらしい)/i, key: 'count', op: '<=', val: '2' },
  { pattern: /(15回以上|殿堂入り)/i, key: 'count', op: '>=', val: '15' },
  { pattern: /(10回以上|10回超え|たくさん歌)/i, key: 'count', op: '>=', val: '10' },
  { pattern: /(5回以下|5回以内|少なめ)/i, key: 'count', op: '<=', val: '5' },
  { pattern: /(3回以下|準レア)/i, key: 'count', op: '<=', val: '3' },
  { pattern: /(2回以下|2回以内)/i, key: 'count', op: '<=', val: '2' },
  { pattern: /(1回(だけ|のみ)?歌|初披露(だけ)?)/i, key: 'count', op: '=', val: '1' },
];

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
