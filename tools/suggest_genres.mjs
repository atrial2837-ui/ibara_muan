#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { csvObjects } from '../src/adapter/csv/csv-objects.js';
import { normalizedKey, normalize } from '../src/domain/shared/text.js';
import { GENRE_LIST, UNCATEGORIZED } from '../src/domain/song/genre.js';

const DEFAULT_SPREADSHEET_ID = '1supVLmIOoa3fdwvT_NHioLefjsa-ldQBQCMhZakKD-o';
const DEFAULT_GID = '101';
const DEFAULT_USER_AGENT = 'ibara-muan-songlist/0.1 (+https://github.com/atrial2837-ui/ibara_muan)';

const LOCAL_CONFIDENCE = {
  exact: 0.95,
  strong: 0.88,
  medium: 0.72,
  weak: 0.55,
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadEnvFiles(['.env.local', '.env']);

  const csvText = args.input
    ? await fs.readFile(args.input, 'utf8')
    : await fetchText(sheetCsvUrl(args.spreadsheetId || DEFAULT_SPREADSHEET_ID, args.gid || DEFAULT_GID));

  const rows = csvObjects(csvText)
    .map((row, index) => ({
      rowNumber: index + 2,
      title: normalize(rowValue(row, '曲名')),
      artist: normalize(rowValue(row, 'アーティスト名')),
      currentGenre: normalize(rowValue(row, 'ジャンル')),
    }))
    .filter((row) => row.rowNumber >= 3 && row.title && row.title !== '曲名');

  const spotify = new SpotifyClient();
  const discogs = new DiscogsClient({
    unauthLimit: Number(args.discogsUnauthLimit || 0),
    maxRequests: Number(args.discogsMaxRequests || 250),
  });

  const suggestions = [];
  const summary = {
    total: rows.length,
    local: 0,
    spotify: 0,
    discogs: 0,
    mixed: 0,
    uncategorized: 0,
    spotifyEnabled: spotify.enabled,
    discogsEnabled: discogs.enabled,
  };

  for (const row of rows) {
    const candidates = [];
    const local = suggestLocal(row);
    if (local) candidates.push(local);

    if (spotify.enabled && shouldUseApi(local)) {
      const spotifySuggestion = await spotify.suggest(row);
      if (spotifySuggestion) candidates.push(spotifySuggestion);
    }

    if (discogs.enabled && shouldUseApi(local)) {
      const discogsSuggestion = await discogs.suggest(row);
      if (discogsSuggestion) candidates.push(discogsSuggestion);
    }

    const chosen = chooseSuggestion(candidates);
    const source = chosen.source || 'none';
    if (source.startsWith('mixed:')) summary.mixed += 1;
    else if (source.startsWith('local:')) summary.local += 1;
    else if (source.startsWith('spotify:')) summary.spotify += 1;
    else if (source.startsWith('discogs:')) summary.discogs += 1;
    if (chosen.genre === UNCATEGORIZED) summary.uncategorized += 1;

    suggestions.push({
      rowNumber: row.rowNumber,
      title: row.title,
      artist: row.artist,
      currentGenre: row.currentGenre,
      genre: chosen.genre,
      source,
      confidence: chosen.confidence.toFixed(2),
      notes: chosen.notes || '',
    });
  }

  summary.spotifyRequests = spotify.requests;
  summary.spotifyDisabledReason = spotify.disabledReason;
  summary.discogsRequests = discogs.requests;
  summary.discogsSkippedUnauthLimit = discogs.skippedUnauthLimit;
  summary.discogsRateLimited = discogs.rateLimited;

  if (args.outJson) {
    await fs.writeFile(args.outJson, `${JSON.stringify({ summary, suggestions }, null, 2)}\n`, 'utf8');
  }

  const tsv = suggestions.map((item) => [item.genre, item.source, item.confidence].map(tsvCell).join('\t')).join('\n');
  if (args.outTsv) {
    await fs.writeFile(args.outTsv, `${tsv}\n`, 'utf8');
  }

  if (!args.outJson && !args.outTsv) {
    process.stdout.write(`${tsv}\n`);
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.slice(2).split('=', 2);
    const value = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined && value && !value.startsWith('--')) index += 1;
    parsed[toCamel(key)] = inlineValue === undefined && (!value || value.startsWith('--')) ? true : value;
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

function rowValue(row, name) {
  if (row[name] !== undefined) return row[name];
  const key = Object.keys(row).find((candidate) => normalizedKey(candidate).startsWith(normalizedKey(name)));
  return key ? row[key] : '';
}

async function loadEnvFiles(names) {
  for (const name of names) {
    try {
      const text = await fs.readFile(path.resolve(process.cwd(), name), 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match || process.env[match[1]] !== undefined) continue;
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function sheetCsvUrl(spreadsheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

async function fetchText(url, options = {}) {
  const response = await fetchWithRetry(url, options);
  if (!response.ok) {
    throw new Error(`fetch failed: ${response.status} ${response.statusText} ${url}`);
  }
  return response.text();
}

async function fetchJson(url, options = {}) {
  const response = await fetchWithRetry(url, options);
  if (!response.ok) {
    if (response.status === 404) return null;
    const body = await response.text();
    throw new Error(`fetch failed: ${response.status} ${response.statusText} ${url} ${body.slice(0, 500)}`);
  }
  return response.json();
}

async function fetchWithRetry(url, options = {}, attempt = 0) {
  const response = await fetch(url, options);
  if (response.status !== 429 || attempt >= 4) return response;
  const retryAfter = Number(response.headers.get('retry-after') || 0);
  const waitMs = Math.max(retryAfter * 1000, 1200 * (attempt + 1));
  await delay(waitMs);
  return fetchWithRetry(url, options, attempt + 1);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tsvCell(value) {
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

function shouldUseApi(local) {
  return !local || local.confidence < 0.9;
}

function chooseSuggestion(candidates) {
  const valid = candidates.filter((candidate) => candidate && GENRE_LIST.includes(candidate.genre));
  if (!valid.length) return { genre: UNCATEGORIZED, source: 'none', confidence: 0.2 };

  const byGenre = new Map();
  for (const candidate of valid) {
    const current = byGenre.get(candidate.genre) || [];
    current.push(candidate);
    byGenre.set(candidate.genre, current);
  }

  let best = null;
  for (const [genre, group] of byGenre.entries()) {
    const max = Math.max(...group.map((item) => item.confidence));
    const boosted = Math.min(0.99, max + (group.length - 1) * 0.08);
    const sources = group.map((item) => item.source).join('+');
    const item = {
      genre,
      source: group.length >= 2 ? `mixed:${sources}` : group[0].source,
      confidence: boosted,
      notes: group.map((entry) => entry.notes).filter(Boolean).join(' / '),
    };
    if (!best || item.confidence > best.confidence) best = item;
  }

  return best;
}

function suggestion(genre, source, confidence, notes = '') {
  return { genre, source, confidence, notes };
}

function suggestLocal(row) {
  const title = normalizedKey(row.title);
  const artist = normalizedKey(row.artist);
  const text = `${title} ${artist}`;

  if (hasAny(text, ['茨むあん', 'ibara muan', 'ibaramuan'])) {
    return suggestion('オリジナル', 'local:ibara-original', LOCAL_CONFIDENCE.exact);
  }

  if (title === normalizedKey('発声練習')) {
    return suggestion(UNCATEGORIZED, 'local:non-song', LOCAL_CONFIDENCE.exact);
  }

  if (hasAny(artist, VTUBER_ARTISTS) || hasAny(text, VTUBER_KEYWORDS)) {
    return suggestion('VTuber', 'local:vtuber-artist', LOCAL_CONFIDENCE.exact);
  }

  if (hasAnyExact(title, VOCALOID_TITLES)
    || hasAny(text, ['初音ミク', '鏡音リン', '鏡音レン', '巡音ルカ', 'gumi', 'vocaloid', 'utau', 'cevio', '可不', 'flower', '音街ウナ'])
    || /(^|[\s(（])[\u3040-\u30ff\u3400-\u9fff0-9]+p($|[\s)）])/i.test(artist)
    || hasAny(artist, VOCALOID_ARTISTS)) {
    return suggestion('ボカロ', 'local:vocaloid-rule', LOCAL_CONFIDENCE.exact);
  }

  if (hasAnyExact(title, ANIME_TITLES) || hasAny(text, ANIME_KEYWORDS)) {
    return suggestion('アニソン', 'local:anime-tie-in', LOCAL_CONFIDENCE.exact);
  }

  if (hasAnyExact(title, GAME_CHARACTER_TITLES) || hasAny(artist, GAME_CHARACTER_ARTISTS) || hasAny(text, GAME_CHARACTER_KEYWORDS)) {
    return suggestion('ゲーム・キャラソン', 'local:game-character-rule', LOCAL_CONFIDENCE.exact);
  }

  if (hasAny(text, ['ディズニー', 'disney', 'アラジン', 'リトルマーメイド', 'リトル・マーメイド', 'アナと雪の女王', '塔の上のラプンツェル', 'モアナ', 'ライオンキング', '美女と野獣'])) {
    return suggestion('ディズニー', 'local:disney-keyword', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(text, ['劇団四季', 'ミュージカル', 'レ・ミゼラブル', 'les miserables', 'phantom of the opera', 'オペラ座の怪人'])) {
    return suggestion('ミュージカル', 'local:musical-keyword', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(artist, ['akb48', 'ske48', 'nmb48', 'hkt48', '乃木坂46', '欅坂46', '櫻坂46', '日向坂46', 'ももいろクローバー', 'モーニング娘', '＝love', '=love', 'fruits zipper'])) {
    return suggestion('アイドル', 'local:idol-artist', LOCAL_CONFIDENCE.strong);
  }

  if (hasAnyExact(artist, ['bts', 'twice', 'blackpink', 'lesserafim', 'le sserafim', 'newjeans', 'itzy', 'stray kids', 'seventeen'])) {
    return suggestion('K-POP', 'local:kpop-artist', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(text, ['合唱曲', '森のくまさん', '大きな古時計', 'ぞうさん', 'いぬのおまわりさん', 'どんぐりころころ', 'ちょうちょう', '赤とんぼ', 'ふるさと', 'シャボン玉', 'アメリカ民謡'])) {
    return suggestion('童謡・唱歌', 'local:children-song-keyword', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(artist, ['美空ひばり', '山口百恵', '松田聖子', '中森明菜', 'テレサ・テン', '石川さゆり', '坂本九', 'ピンク・レディー', '沢田研二'])) {
    return suggestion('歌謡曲', 'local:kayokyoku-artist', LOCAL_CONFIDENCE.strong);
  }

  if (hasAnyExact(artist, WESTERN_ARTISTS)) {
    return suggestion('洋楽', 'local:western-artist', LOCAL_CONFIDENCE.strong);
  }

  return suggestion('J-POP', 'local:default-jpop', 0.35);
}

function hasAny(text, words) {
  return words.some((word) => text.includes(normalizedKey(word)));
}

function hasAnyExact(text, words) {
  const key = normalizedKey(text);
  return words.some((word) => key === normalizedKey(word));
}

const VOCALOID_ARTISTS = [
  'deco*27', 'deco27', '40mp', 'みきとp', 'kanaria', 'かいりきベア', 'orangestar',
  'n-buna', 'ナブナ', 'neru', 'wowaka', 'ハチ', '米津玄師(ハチ)', 'ピノキオピー',
  'syudou', '柊キライ', 'バルーン', '須田景凪', 'kemu', 'じん', 'れるりり',
  '蝶々p', '黒うさp', 'doriko', 'ryo', '八王子p', 'giga',
  'ナユタン星人', 'ぬゆり', 'ツミキ', '煮ル果実', 'すりぃ', '傘村トータ',
  'halyosy', '164', 'keeno', 'r sound design', 'tokotoko',
  '西沢さんp', 'ユリイ・カノン', 'メル', 'きくお', 'easy pop', 'samfree',
  '*luna', '19\'s sound factory', 'adstlaxy', 'atols', 'azari', 'baker', 'buzzg',
  'chinozo', 'crusher-p', 'dateken', 'dixie flatline', 'eight', 'heavenz',
  'ika', 'iroha', 'junky', 'kei', 'last note.', 'mao sasagawa', 'maretu',
  'millstones', 'n.k', 'narry', 'nem', 'niki', 'nyanyannya', 'omoi',
  'oster project', 'otetsu', 'p.i.n.a.', 'pina', 'wotaku', 'yamada', 'ive',
  'こんにちは谷田さん', 'キタニタツヤ', 'ゆこぴ', 'マサラダ', '原口沙輔',
  '電ポルp', '羽生まゐご', '亜沙', '梅とら', 'アゴアニキp',
];

const WESTERN_ARTISTS = [
  'taylor swift', 'ariana grande', 'lady gaga', 'billie eilish', 'adele', 'sia',
  'bruno mars', 'maroon 5', 'queen', 'the beatles', 'oasis', 'coldplay',
  'carpenters', 'avril lavigne', 'linkin park', 'radiohead', 'paramore',
];

const ANIME_KEYWORDS = [
  '涼宮ハルヒ', '放課後ティータイム', 'けいおん', 'ランカ・リー', 'マクロス',
  'ワルキューレ', '高橋洋子', '水樹奈々', '藍井エイル', 'claris', 'egoist',
  'reona', '中川翔子', '結束バンド', 'linked horizon',
];

const VTUBER_ARTISTS = [
  '星街すいせい', 'hoshimachi suisei', '宝鐘マリン', '湊あくあ', 'ときのそら',
  'azki', '常闇トワ', '天音かなた', '白上フブキ', '猫又おかゆ', '大神ミオ',
  'さくらみこ', '兎田ぺこら', '沙花叉クロヱ', 'mori calliope', 'irys',
  'himehina', 'ヒメヒナ', '花譜', 'kaf', '理芽', '春猿火', 'ヰ世界情緒',
  '幸祜', 'キズナアイ', 'kizuna ai', 'しぐれうい', 'しゅがりり', '月ノ美兎', '樋口楓',
  '戌亥とこ', '町田ちま', '緑仙', '葛葉', '叶', '加賀美ハヤト', '剣持刀也',
  '不破湊', '星川サラ', 'somunia', 'kmnz', 'v.w.p',
];

const VTUBER_KEYWORDS = [
  'ホロライブ', 'hololive', 'にじさんじ', 'nijisanji', 'ぶいすぽ', 'vspo',
  'vsinger', 'virtual youtuber', 'vtuber',
];

const VOCALOID_TITLES = [
  '8.32', 'マカロン', 'シニカルナイトプラン', '夜撫でるメノウ',
  '幽霊東京', 'casino', 'd/n/a', '夏に去りし君を想フ', 'loveit?', 'しわ',
  'ワールド・ランプシェード', 'グッバイ宣言', 'ジェラシス', 'echo',
  '蜜月アン・ドゥ・トロワ', '会いたい', 'just be friends', 'とても素敵な六月でした',
  'お気に召すまま', 'アウトサイダー', 'ドラマツルギー', 'ナンセンス文学',
  '惑星ループ', 'それがあなたの幸せとしても', 'ヒロイン育成計画',
  'ラズベリー*モンスター', 'みくみくにしてあげる♪', '炉心融解',
  'happy halloween', 'スイートマジック', 'メランコリック', 'ラプラスショコラ',
  'ピエロ', 'はきだす', '脳内革命ガール', 'カガリビト',
  'このふざけた素晴らしき世界は、僕の為にある',
  'もしも一人残されて、世界が嘘じゃないなら', 'シザーハンズ',
  '嗚呼、素晴らしきニャン生', '夢喰い白黒バク', '-error', 'wave',
  'ジッタードール', 'エル・タンゴ・エゴイスタ', 'オーネヘルツ', 'テオ',
  'ゴシップ', '星屑ユートピア', 'レッド・パージ!!!', 'セツナトリップ',
  'メルト', 'メルト 10th anniversary mix', 'ワールドイズマイン', 'ブラック★ロックシューター',
  '恋は戦争', '罪の名前', 'ロミオとシンデレラ', '千本桜', 'シャルル',
  '雨とペトラ', 'パメラ', '花瓶に触れた', 'メーベル', 'king', 'queen',
  'エンヴィーベイビー', '酔いどれ知らず', 'デーモンロード', 'ベノム',
  'ダーリンダンス', 'ロストワンの号哭', '東京テディベア', '病名は愛だった',
  '脱法ロック', 'アンヘル', 'ロウワー', 'フィクサー', 'フラジール',
  'フォニイ', 'ビターチョコデコレーション', 'コールボーイ', 'キュートなカノジョ',
  '孤独の宗教', '神っぽいな', '転生林檎', '魔法少女とチョコレゐト',
  'ボッカデラベリタ', 'ラヴィ', 'テレキャスタービーボーイ', 'エゴロック',
  '六兆年と一夜物語', '地球最後の告白を', 'インビジブル', '拝啓ドッペルゲンガー',
  '夜咄ディセイブ', '如月アテンション', '夕景イエスタデイ', 'サマータイムレコード',
  'チルドレンレコード', 'カゲロウデイズ', 'アスノヨゾラ哨戒班', '回る空うさぎ',
  'からくりピエロ', 'キリトリセン', 'ドレミファロンド', 'サリシノハラ',
  '少女レイ', 'いーあるふぁんくらぶ', '吉原ラメント', '天ノ弱', 'からっぽのまにまに',
  '砂の惑星', 'パンダヒーロー', 'ドーナツホール', 'マトリョシカ', 'mrs.pumpkinの滑稽な夢',
  '強風オールバック', 'イガク', 'ム責任集合体', '抜錨', '失楽ペトリ',
  '阿吽のビーツ', '懺悔参り', '曖昧劣情lover', '恋愛裁判', '悪ノ召使',
  '悪ノ娘', 'このピアノでお前を8759632145回ぶん殴る', 'んっあっあっ。',
  'ねぇ、どろどろさん', 'urusaaa愛', '十面相', '林檎売りの泡沫少女',
  '偽物人間40号', 'アイロニ', 'マリオネットシンドローム',
  '夏の終わり、恋の始まり', 'ヴィラン', 'ショットガン・ラヴァーズ',
  'モノクロ∞ブルースカイ', '白い雪のプリンセスは', 'alice in n.y.',
  'bad ∞ end ∞ night', 'おおかみは赤ずきんに恋をした', '四季折の羽',
  'ジグソーパズル', 'ナイティナイト', 'ハローディストピア',
  'メリーバッドエンド', '廃墟の国のアリス', '繰り返し一粒',
  '絶え間なく藍色', 'ゆるふわ樹海ガール', '心拍数#0822',
  'いろは唄', 'キャットラビング',
];

const ANIME_TITLES = [
  'tot musica', 'クラクラ', '新時代', '私は最強', '逆光', '1・2・3',
  '創聖のアクエリオン', '亡國覚醒カタルシス', '勇侠青春謳', '聖少女領域',
  'shangri-la', '対象a', 'ちゅ、多様性。', 'alones', '千の夜をこえて',
  '決意の朝に', 'リライト', 'アイのシナリオ', 'プライド革命', '世界は恋に落ちている',
  '決戦スピリット', 'asphyxia', 'ムーンライト伝説', 'バクチ・ダンサー',
  '曇天', 'ようかい体操第一', '廻廻奇譚', '青空のラプソディ', '君に届け',
  'only my railgun', 'ファタール', '一番の宝物', 'オトノナルホウヘ→',
  '光るなら', 'can do', 'magia', 'シルエット', '月光花', 'そばかす',
  'おジャ魔女カーニバル', 'はなまるぴっぴはよいこだけ', 'おどるポンポコリン',
  'アイワナムチュー', 'トウキョウ・シャンディ・ランデヴ',
  '夢をかなえてドラえもん', 'ライオン', 'change', 'インフェルノ', 'クスシキ',
  'jingo jungle', 'paradisus-paradoxum', 'cry baby', 'イエスタデイ',
  'ミックスナッツ', 'オルフェンズの涙', 'すずめ', 'なんでもないや', '打上花火', 'rain', '紅蓮華',
  '炎', '残響散歌', 'i beg you', 'brave shine', '六等星の夜', 'unlasting',
  'adamas', 'crossing field', 'oath sign', 'unravel', '名前のない怪物',
  'エウテルペ', 'kabaneri of the iron fortress', '英雄 運命の詩', '君の知らない物語',
  'シュガーソングとビターステップ', 'オリオンをなぞる', 'go!!!', 'メリッサ',
  'アゲハ蝶', 'ブルーバード', 'change', 'イマジネーション', 'ピースサイン',
  '花になって', '晴る', '祝福', '花の塔', '平行線', 'ミカヅキ', 'ヒトリゴト',
  'alive', 'sincerely', 'あんなに一緒だったのに',
  'モザイクカケラ', 'god knows...', 'ハレ晴レユカイ', 'don\'t say "lazy"',
  '魂のルフラン', 'タッチ', 'デビルマンのうた', '君じゃなきゃダメみたい',
  'ハム太郎とっとこうた', 'バラライカ', 'かくしん的☆めたまるふぉ~ぜっ!',
  'snow halation', 'pop in 2', 'サインはb', 'アイドル', '少女s', 'サムライハート',
  'my dearest', 'うたかた花火', 'フリージア', '色彩', '優しい彗星',
  '勇者', '怪物', 'rolling star', 'again', 'テルーの唄', 'もののけ姫',
  '崖の上のポニョ', '海の幽霊', '地球儀', 'kick back', 'bow and arrow',
  'ウィーアー!', '宇宙戦艦ヤマト', 'ようこそジャパリパークへ',
  '風になる', 'ひまわりの約束', 'catch the moment', 'rising hope',
  'シルシ', '残酷な夜に輝け', 'ラピスラズリ', 'realize', 'this game',
  '白金ディスコ', 'お願いマッスル', '魂のルフラン', '青春コンプレックス',
];

const GAME_CHARACTER_TITLES = [
  'うまぴょい伝説', '鳥の詩', 'potatoになっていく', 'ステラ', 'セカイ',
  'needLe', 'jackpot sad girl', '限りなく灰色へ', 'アイディスマイル',
  'トンデモワンダーズ', 'にっこり^^調査隊のテーマ', 'バグ', 'ロウワー',
  'ビターチョコデコレーション', 'the world is all one !!', 'カルマ',
  'アカシア', '月を見ていた',
];

const GAME_CHARACTER_ARTISTS = [
  'leo/need', 'ワンダーランズ×ショウタイム', 'vivid bad squad',
  'more more jump', '25時、ナイトコードで。', 'ニーゴ', '初星学園',
  '765pro', 'シンデレラガールズ', 'millionstars', 'idolm@ster',
  'アイドルマスター', 'ウマ娘', 'μ\'s', 'aqours', '虹ヶ咲', 'liella',
  '蓮ノ空', 'roselia', 'afterglow', 'poppin\'party', 'raise a suilen',
  'morfonica', 'b小町', '月島きらり', 'ハムちゃんず', '土間うまる',
  '涼宮ハルヒ', '桜高軽音部', 'ランカ・リー',
];

const GAME_CHARACTER_KEYWORDS = [
  'プロジェクトセカイ', 'プロセカ', 'ウマ娘', 'うまぴょい', 'idolm@ster',
  'アイドルマスター', 'ラブライブ', 'バンドリ', 'bang dream', 'キャラクターソング',
  'character song', 'ゲーム主題歌', 'game music',
];

class SpotifyClient {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.enabled = Boolean(this.clientId && this.clientSecret);
    this.token = '';
    this.requests = 0;
    this.disabledReason = '';
  }

  async suggest(row) {
    if (!this.enabled) return null;
    const token = await this.getToken();
    const query = `track:${row.title} artist:${row.artist}`;
    const searchUrl = new URL('https://api.spotify.com/v1/search');
    searchUrl.searchParams.set('type', 'track');
    searchUrl.searchParams.set('limit', '5');
    searchUrl.searchParams.set('market', 'JP');
    searchUrl.searchParams.set('q', query);
    this.requests += 1;
    let result = null;
    try {
      result = await fetchJson(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      if (String(error.message || error).includes('Active premium subscription required')) {
        this.enabled = false;
        this.disabledReason = 'premium_required';
        return null;
      }
      throw error;
    }
    const track = bestSpotifyTrack(row, result?.tracks?.items || []);
    if (!track) return null;

    const artistIds = [...new Set((track.artists || []).map((artist) => artist.id).filter(Boolean))].slice(0, 5);
    if (!artistIds.length) return null;

    const artistsUrl = new URL('https://api.spotify.com/v1/artists');
    artistsUrl.searchParams.set('ids', artistIds.join(','));
    this.requests += 1;
    const artistResult = await fetchJson(artistsUrl, { headers: { Authorization: `Bearer ${token}` } });
    const tags = (artistResult?.artists || []).flatMap((artist) => artist.genres || []);
    const mapped = mapTagsToGenre(tags);
    if (!mapped) return null;
    return suggestion(mapped.genre, `spotify:artist:${compactTags(tags)}`, 0.65, track.name);
  }

  async getToken() {
    if (this.token) return this.token;
    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    this.requests += 1;
    const response = await fetchJson('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    this.token = response.access_token;
    return this.token;
  }
}

function bestSpotifyTrack(row, tracks) {
  const title = normalizedKey(row.title);
  const artist = normalizedKey(row.artist);
  return tracks
    .map((track) => {
      const trackTitle = normalizedKey(track.name);
      const artistText = normalizedKey((track.artists || []).map((item) => item.name).join(' '));
      const score = Number(trackTitle === title) * 2
        + Number(trackTitle.includes(title) || title.includes(trackTitle))
        + Number(artistText.includes(artist));
      return { track, score };
    })
    .filter((item) => item.score >= 2)
    .sort((left, right) => right.score - left.score)[0]?.track || null;
}

class DiscogsClient {
  constructor({ unauthLimit, maxRequests }) {
    this.token = process.env.DISCOGS_TOKEN || process.env.DISCOGS_USER_TOKEN || '';
    this.unauthLimit = unauthLimit;
    this.maxRequests = maxRequests;
    this.enabled = Boolean(this.token || this.unauthLimit > 0);
    this.requests = 0;
    this.skippedUnauthLimit = 0;
    this.rateLimited = false;
  }

  async suggest(row) {
    if (!this.enabled || this.requests >= this.maxRequests) return null;
    if (!row.artist) return null;
    if (!this.token && this.requests >= this.unauthLimit) {
      this.skippedUnauthLimit += 1;
      return null;
    }

    const url = new URL('https://api.discogs.com/database/search');
    url.searchParams.set('q', `${row.artist} ${row.title}`);
    url.searchParams.set('type', 'release');
    url.searchParams.set('per_page', '5');
    if (this.token) url.searchParams.set('token', this.token);

    if (!this.token && this.requests > 0) await delay(2600);
    this.requests += 1;
    let result = null;
    try {
      result = await fetchJson(url, { headers: { 'User-Agent': DEFAULT_USER_AGENT } });
    } catch (error) {
      if (String(error.message || error).includes('429')) {
        this.enabled = false;
        this.rateLimited = true;
        return null;
      }
      throw error;
    }
    const releases = result?.results || [];
    for (const release of releases) {
      const tags = [...(release.genre || []), ...(release.style || [])];
      const mapped = mapTagsToGenre(tags);
      if (!mapped) continue;
      const releaseTitle = normalize(release.title || '');
      const confidence = normalizedKey(releaseTitle).includes(normalizedKey(row.title)) ? 0.72 : 0.58;
      return suggestion(mapped.genre, `discogs:release:${compactTags(tags)}`, confidence, releaseTitle);
    }
    return null;
  }
}

function compactTags(tags) {
  return [...new Set(tags.map((tag) => normalize(tag)).filter(Boolean))].slice(0, 4).join('|') || 'no-tags';
}

function mapTagsToGenre(tags) {
  const text = normalizedKey(tags.join(' '));
  if (!text) return null;
  const mapping = [
    ['ゲーム・キャラソン', ['video game', 'game music', 'character song', 'idolmaster']],
    ['アニソン', ['anime', 'anison', 'j-anime', 'opening', 'ending']],
    ['ボカロ', ['vocaloid', 'utau', 'cevio', 'voice synth', 'utaite']],
    ['VTuber', ['vtuber', 'virtual youtuber', 'hololive', 'nijisanji']],
    ['ディズニー', ['disney']],
    ['ミュージカル', ['musical', 'show tunes', 'stage']],
    ['童謡・唱歌', ['children', 'nursery', '童謡']],
    ['歌謡曲', ['kayokyoku', 'kayōkyoku', 'enka', '歌謡曲']],
    ['K-POP', ['k-pop', 'korean']],
    ['アイドル', ['idol', 'j-idol']],
    ['J-POP', ['j-pop', 'jpop', 'j-rock', 'japanese pop', 'japanese']],
    ['洋楽', ['western', 'us pop', 'uk pop', 'britpop', 'classic rock', 'soul', 'r&b', 'hip hop', 'country', 'folk', 'electronic']],
  ];
  for (const [genre, needles] of mapping) {
    if (needles.some((needle) => text.includes(needle))) return { genre };
  }
  return null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
