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
    throw new Error(`fetch failed: ${response.status} ${response.statusText} ${url}`);
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

  if (hasAny(text, ['ディズニー', 'disney', 'アラジン', 'リトルマーメイド', 'リトル・マーメイド', 'アナと雪の女王', '塔の上のラプンツェル', 'モアナ', 'ライオンキング', '美女と野獣'])) {
    return suggestion('ディズニー', 'local:disney-keyword', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(text, ['劇団四季', 'ミュージカル', 'レ・ミゼラブル', 'les miserables', 'phantom of the opera', 'オペラ座の怪人'])) {
    return suggestion('ミュージカル', 'local:musical-keyword', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(text, ['初音ミク', '鏡音リン', '鏡音レン', '巡音ルカ', 'gumi', 'vocaloid', 'utau', 'cevio', '可不', 'flower', '音街ウナ'])
    || /(^|[\s(（])[\wぁ-んァ-ヶ一-龠]+p($|[\s)）])/.test(artist)
    || hasAny(artist, VOCALOID_ARTISTS)) {
    return suggestion('ボカロ', 'local:vocaloid-artist', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(text, ['プロジェクトセカイ', 'プロセカ', 'leo/need', 'ワンダーランズ×ショウタイム', 'vivid bad squad', 'more more jump', '25時、ナイトコードで。', 'ニーゴ', 'ウマ娘', 'うまぴょい', 'idolm@ster', 'アイドルマスター', 'ラブライブ', 'バンドリ', 'bang dream'])) {
    return suggestion('ゲーム・キャラソン', 'local:game-character-keyword', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(text, ['ホロライブ', 'hololive', 'にじさんじ', 'nijisanji', '星街すいせい', '宝鐘マリン', '湊あくあ', 'ときのそら', '月ノ美兎', '葛葉', '戌亥とこ', 'himehina', '花譜'])) {
    return suggestion('VTuber', 'local:vtuber-artist', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(artist, ['akb48', 'ske48', 'nmb48', 'hkt48', '乃木坂46', '欅坂46', '櫻坂46', '日向坂46', 'ももいろクローバー', 'モーニング娘', '＝love', '=love', 'fruits zipper'])) {
    return suggestion('アイドル', 'local:idol-artist', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(artist, ['bts', 'twice', 'blackpink', 'ive', 'lesserafim', 'le sserafim', 'newjeans', 'itzy', 'stray kids', 'seventeen'])) {
    return suggestion('K-POP', 'local:kpop-artist', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(text, ['合唱曲', '森のくまさん', '大きな古時計', 'ぞうさん', 'いぬのおまわりさん', 'どんぐりころころ', 'ちょうちょう', '赤とんぼ', 'ふるさと', 'シャボン玉', 'アメリカ民謡'])) {
    return suggestion('童謡・唱歌', 'local:children-song-keyword', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(artist, ['美空ひばり', '山口百恵', '松田聖子', '中森明菜', 'テレサ・テン', '石川さゆり', '坂本九', 'ピンク・レディー', '沢田研二'])) {
    return suggestion('歌謡曲', 'local:kayokyoku-artist', LOCAL_CONFIDENCE.strong);
  }

  if (hasAny(text, ANIME_KEYWORDS)) {
    return suggestion('アニソン', 'local:anime-keyword', LOCAL_CONFIDENCE.medium);
  }

  if (hasAny(artist, WESTERN_ARTISTS)) {
    return suggestion('洋楽', 'local:western-artist', LOCAL_CONFIDENCE.strong);
  }

  return suggestion('J-POP', 'local:default-jpop', 0.35);
}

function hasAny(text, words) {
  return words.some((word) => text.includes(normalizedKey(word)));
}

const VOCALOID_ARTISTS = [
  'deco*27', 'deco27', '40mp', 'みきとp', 'kanaria', 'かいりきベア', 'orangestar',
  'n-buna', 'ナブナ', 'neru', 'wowaka', 'ハチ', '米津玄師(ハチ)', 'ピノキオピー',
  'syudou', '柊キライ', 'バルーン', '須田景凪', 'kemu', 'じん', 'れるりり',
  '蝶々p', '黒うさp', 'doriko', 'ryo', 'supercell', '八王子p', 'giga',
  'ナユタン星人', 'ぬゆり', 'ツミキ', '煮ル果実', 'すりぃ', '傘村トータ',
  'まふまふ', 'halyosy', '164', 'keeno', 'r sound design', 'tokotoko',
  '西沢さんp', 'ユリイ・カノン', 'メル', 'きくお', 'easy pop', 'samfree',
  '*luna', '19\'s sound factory',
];

const WESTERN_ARTISTS = [
  'taylor swift', 'ariana grande', 'lady gaga', 'billie eilish', 'adele', 'sia',
  'bruno mars', 'maroon 5', 'queen', 'the beatles', 'oasis', 'coldplay',
  'carpenters', 'avril lavigne', 'linkin park', 'radiohead', 'paramore',
];

const ANIME_KEYWORDS = [
  '涼宮ハルヒ', '放課後ティータイム', 'けいおん', 'ランカ・リー', 'マクロス',
  'ワルキューレ', '高橋洋子', '水樹奈々', '藍井エイル', 'lisa', 'aimer',
  'claris', 'egoist', 'reona', '中川翔子', '結束バンド', 'supercell',
  'unison square garden', 'flow', 'asian kung-fu generation', 'ポルノグラフィティ',
  'ハムちゃんず', '土間うまる', '千石撫子', 'linked horizon',
];

class SpotifyClient {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.enabled = Boolean(this.clientId && this.clientSecret);
    this.token = '';
    this.requests = 0;
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
    const result = await fetchJson(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
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
