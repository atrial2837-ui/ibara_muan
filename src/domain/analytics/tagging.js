/**
 * @module domain/analytics/tagging
 * @description 曲タグ推論・トレンドラベルの純粋関数群。
 *
 * タグ付与の優先順位:
 * 1. 統計データベースタグ (歌唱回数, 最終披露日, キー有無)
 * 2. ジャンルベースタグ (genre からの自動推論)
 * 3. 文字列マッチングタグ (曲名・アーティスト名からの推論)
 * 4. 複合タグ (複数タグの組み合わせから生成)
 *
 * 既存: docs/js/data.js:124-169
 * @副作用 なし
 */

// ---------------------------------------------------------------------------
// 統計データベースタグ
// ---------------------------------------------------------------------------

/**
 * 歌唱回数・最終披露日・キー有無などの統計データからタグを付与する。
 *
 * @param {{ displayKey?: string, count?: number, daysSinceLast?: number|null, lastSung?: unknown }} song
 * @returns {string[]}
 */
export function inferStatsTags(song) {
  const tags = [];
  if (song.displayKey) tags.push('キー確認済み');
  if ((song.count ?? 0) >= 15) tags.push('殿堂入り');
  if ((song.count ?? 0) >= 10) tags.push('定番');
  if ((song.count ?? 0) >= 5) tags.push('よく歌う');
  if ((song.count ?? 0) <= 1) tags.push('レア');
  if ((song.count ?? 0) > 1 && (song.count ?? 0) <= 3) tags.push('準レア');
  if (song.daysSinceLast != null) {
    if (song.daysSinceLast >= 365) tags.push('超久しぶり');
    if (song.daysSinceLast >= 180) tags.push('久しぶり');
    if (song.daysSinceLast >= 90) tags.push('やや久しぶり');
    if (song.daysSinceLast <= 7) tags.push('超最近');
    if (song.daysSinceLast <= 30) tags.push('最近');
  }
  if (!song.lastSung) tags.push('歌ったことない');
  return tags;
}

// ---------------------------------------------------------------------------
// ジャンルベースタグ
// ---------------------------------------------------------------------------

/**
 * ジャンルからデフォルトの雰囲気タグを推論する。
 *
 * @param {string} genre
 * @returns {string[]}
 */
export function inferGenreMoodTags(genre) {
  const g = (genre || '').trim();
  switch (g) {
    case 'ボカロ':
      // VOCALOID はデジタル/電子系が基本。激しい・かわいい・エモいまで多様だが
      // エレクトロ と かっこいい をデフォルトに（タイトルマッチで上書きされる）
      return ['エレクトロ', 'かっこいい'];
    case 'アニソン':
      // OP は盛り上がる/かっこいい系が多数派
      return ['盛り上がる', 'かっこいい'];
    case 'J-POP':
      // J-POP は多様すぎるためデフォルトなし（タイトルマッチに委ねる）
      return [];
    case 'K-POP':
      // K-POP はポップ/ダンス/かわいい系が中心
      return ['かわいい', 'ファンキー', '盛り上がる'];
    case 'アイドル':
      // アイドル曲はかわいい/盛り上がる系
      return ['かわいい', '盛り上がる'];
    case 'ディズニー':
      // ディズニーはかわいい/盛り上がる/和風まで多様だが明るい系が多い
      return ['明るい', 'かわいい', '盛り上がる'];
    case '童謡・唱歌':
      // 童謡は懐かしくて和風
      return ['ノスタルジック', '懐かしい', '和風'];
    case 'ゲーム・キャラソン':
      // ゲーム曲はかっこいい/盛り上がる系が多い
      return ['かっこいい', '盛り上がる'];
    case 'オリジナル':
      // オリジナル曲はchill/しっとり系が多い傾向
      return ['chill'];
    default:
      return [];
  }
}

export function inferGenreTags(songOrGenre) {
  const genre = typeof songOrGenre === 'string' ? songOrGenre : songOrGenre?.genre;
  const g = (genre || '').trim();
  const tags = [];
  if (g) {
    tags.push(g);
    if (g === '童謡・唱歌') tags.push('童謡');
  }
  tags.push(...inferGenreMoodTags(g));
  return Array.from(new Set(tags.filter(Boolean)));
}

// ---------------------------------------------------------------------------
// 季節タグ
// ---------------------------------------------------------------------------

/**
 * @param {{ title?: string, artist?: string }} song
 * @returns {string[]}
 */
export function inferSeasonTags(song) {
  const text = `${song.title || ''} ${song.artist || ''}`.toLowerCase();
  const tags = [];
  const push = (name, re) => { if (re.test(text)) tags.push(name); };
  push('春', /春|桜|さくら|卒業|花に亡霊|春泥棒|桜ノ雨|桜流し|チェリー|花見|入学|新学期/);
  push('夏', /夏|サマー|花火|海|青と夏|夏色|君と夏フェス|夏祭り|金魚花火|打上花火|向日葵|ひまわり|水着|夕立/);
  push('秋', /秋|紅葉|月|十五夜|金木犀|晩餐歌|食欲|読書|運動会|ハロウィン/);
  push('冬', /冬|雪|クリスマス|白い|粉雪|スノー|snow|ジングル|メリクリ|雪の華|冬至|除夜|お正月|年末/);
  push('雨', /雨|レイン|rain|傘|カプチーノ|rain stops|梅雨|秋雨|しぐれ/);
  push('夜', /夜|月|星|スター|midnight|ナイト|夜明け|夜に|夜もすがら|ベテルギウス|深夜|宵|黄昏|夕暮れ|月明かり/);
  push('朝', /朝|モーニング|morning|日の出|朝日|目覚め|おはよう|早朝|夜明け|暁/);
  push('恋愛', /恋|愛|好き|ラブ|love|告白|プロポーズ|ダーリン|貴方|あなた|恋人|こい|あい/);
  push('別れ', /別れ|さよなら|goodbye|farewell|離|わかれ|袂/);
  push('イベント', /バレンタイン|クリスマス|ハロウィン|誕生日|birthday|ジングル|チョコ|記念日|お祝い|パーティ/);
  return Array.from(new Set(tags));
}

// ---------------------------------------------------------------------------
// 雰囲気タグ（文字列マッチング）
// ---------------------------------------------------------------------------

/**
 * @param {{ title?: string, artist?: string, genre?: string }} song
 * @returns {string[]}
 */
/** ムードタグのラベル一覧（ジャンルフォールバックの絞り込み用） */
const MOOD_TAG_SET = new Set([
  '盛り上がる', 'しっとり', 'かわいい', 'かっこいい', '懐かしい',
  'chill', '激しい', 'ミステリアス', 'ノスタルジック', 'エモい',
  'ダーク', 'ファンキー', '甘い', 'セクシー', '和風', 'エレクトロ', 'アコースティック',
  '明るい',
]);

export function inferMoodTags(song) {
  const text = `${song.title || ''} ${song.artist || ''} ${song.genre || ''}`.toLowerCase();
  const tagSet = new Set();
  const push = (name, re) => { if (re.test(text)) tagSet.add(name); };

  // ── キーワードマッチング ─────────────────────────────────────────────────────
  // 元のパターンを維持しつつ汎用キーワードを追加。
  // ※ ASCII短縮語（pop / night / hot / beat 等）はジャンル名や一般語に誤マッチするため避ける。
  push('盛り上がる', /ロキ|ヒバナ|チュルリラ|天使|お願い|革命|メルト|アイドル|うまぴょい|サンバ|夏色|おジャ魔女|only my railgun|internet|ガチャ|フィーバー|パーティ|cheer|sing|dance|jump|yeah|wow|全力|ファイト|諦めない|超えろ|駆け抜|走れ|前へ|立ち上がれ|ガンバ|勝利|ハッピー|祭り|まつり|ライブ|フェス|はじけ|弾け|ハジけ|盛り上がれ/);
  push('しっとり', /雨|夜|月|花に亡霊|少女レイ|たばこ|猫|lemon|裸の心|水平線|勿忘|ベテルギウス|糸|奏|炎|雪の華|夕暮れ|黄昏|after the rain|静|しず|落ち着|会いたい|逢いたい|会えない|逢えない|離れ|ぬくもり|温もり|手紙|想い|届け|あなたへ|君へ|遠く|遠い|帰りたい|泣きたい|悲しく|寂しく|さみしく/);
  push('かわいい', /可愛|かわいい|kawaii|恋愛サーキュレーション|白金ディスコ|だだだだ|だいしきゅう|きゅうくらりん|おじゃま虫|バレンタイン|sweets parade|ぽっぴっぽ|ふわふわ|ぷにぷに|marionette|ぴょん|にゃん|わん|きゅん|笑顔|えがお|嬉し|うれし|ドキドキ|ときめ|キラキラ|きらきら|ハート|ポップ|ほっこり|ぽかぽか/);
  push('かっこいい', /残響散歌|brave shine|i beg you|名前のない怪物|unravel|asphyxia|踊|怪物|インフェルノ|革命|ch4nge|g4l|overdose|紅蓮華|ギラギラ|ビッチ|最強|かっこ|cool|かっけ|ヒーロー|覚醒|無敵|制覇|疾走|気迫/);
  push('懐かしい', /secret base|butter-fly|タッチ|ムーンライト伝説|god knows|創聖|アクエリオン|ラムのラブソング|チェリー|そばかす|残酷な天使|未来への咆哮|17才|夏休み|あの日|思い出|なつか|懐|昔|子供|幼い|あの頃|青春|卒業|同窓|同級生/);
  push('chill', /chill|チル|のんびり|リラックス|ほっこり|まったり|宵|夕凪|お昼寝|ひなたぼっこ|カフェ|lounge|ambient|downtempo|ballad|眠|ねむ|おやすみ|ゆらゆら|ふわ|そよ風|星屑|夜空|満月|ミッドナイト|midnight|lofi|lo-fi|癒|いやし|安ら|穏や|のどか|落着|peace|calm|serene|そよ|ぼんやり|珈琲|紅茶|ティー|窓辺|本読み|読書|散歩|公園|猫|子猫|ぬいぐるみ|ブランケット|毛布|キャンドル|香り|アロマ|ハーブ|森林|林檎|林/);
  push('激しい', /激しい|アグレッシブ|aggressive|パンク|punk|メタル|metal|スクリーム|scream|叫|怒|暴|war|battle|戦|fight|beat|ドラムンバー|drum.?n.?bass|dubstep|hardcore|テクノ|techno|ヘドバン|headbang|shred|速|疾|猛|烈/);
  push('ミステリアス', /ミステリ|mystery|怪談|幽|呪|魔女|wizard|magic|魔法|幻想|ファンタジー|fantasy|異世界|ダーク|dark|闇|shadow|phantom|ゴシック|gothic|ヴィクトリアン|謎|なぞ|秘密|隠|迷路|迷宮|labyrinth|ピラミッド|古代|魔術|ウィザード|ドラゴン|竜|fairy|精霊|ゴースト|ghost/);
  push('ノスタルジック', /ノスタルジ|nostalg|レトロ|retro|昭和|平成|青春|少年|少女|初恋|あの頃|昔|memory|メモリー|タイムカプセル|年季|classical|クラシック|ジャズ|jazz|往年|昔日|追憶|reminisce|セピア|sepia|analog|レコード|蓄音器/);
  push('エモい', /エモ|emo|せつない|切ない|胸が痛|泣|涙|涙雨|カラス|夕焼け|卒業|別れ|さよなら|goodbye|farwell|悲|哀|愁|lonely|ロンリー|さびしい|孤独|一人|独り|雨空|曇り|灰色|グレイ|消えない|忘れない|忘れられない|戻れない|永遠|いつまでも|震え|溢れ/);
  push('ダーク', /ダーク|dark|黒|夜|闇|デス|death|死|墓|墓場|ドクロ|骸骨|血|ブラッド|blood|hell|地獄|悪魔|demon|devil|サタン|カオス|chaos|abyss|奈落|深淵|終末|apocalypse|破滅|滅|腐|毒|venom|蛇|サーペント/);
  push('ファンキー', /ファンキー|funk|ファンク|groove|グルーヴ|disco|ディスコ|ソウル|soul|rb|r&b|ラテン|latin|bossa|ボサノバ|ska|スカ|reggae|レゲエ|swing|スウィング|ジャム|jam|ラグタイム|ragtime/);
  push('甘い', /甘|あま|ハニー|honey|シュガ|sugar|キャンディ|candy|チョコ|choco|バニラ|vanilla|クリーム|cream|デザート|dessert|お菓子|ケーキ|cake|恋|ラブ|love|ダーリン|darling|ハグ|hug|kiss|キス|チュー|微笑|ほほえ|にっこり|デート|ロマンス|romance|プロポーズ|結婚|指輪/);
  push('セクシー', /セクシー|sexy|セクシ|エロ|ero|色|色艶|艶|誘惑|くびれ|ヒップ|ラブシーン|ナイト|night|ムーンライト|midnight|after dark|アダルト|adult|hot|ホット|spicy|スパイス|毒|venom|棘|トゲ|痛|いた/);
  push('和風', /和風|日本|大和|桜|富士|侍|忍者|花見|茶道|お正月|七夕|盆踊り|祭|和太鼓|琴|尺八|三味線|演歌|enka|大和魂|wa|着物|浴衣|花火|提灯|神社|鳥居|風鈴|線香花火|金魚|鯉のぼり|お月見|紅葉|雪見|炉端|畳|障子|浮世絵|武士|刀|扇子|折り紙|千代紙/);
  push('エレクトロ', /エレクトロ|electro|エレクトロニカ|electronic|シンセ|synth|テクノ|techno|edm|house|トランス|trance|ビート|beat|bass|ベース|dubstep|dnb|ドラムンバー|remix|リミックス|dj|ディジェー|クラブ|club|rave|レイヴ|サイバー|cyber|デジタル|digital|glitch|グリッチ/);
  push('アコースティック', /アコースティック|acoustic|アコギ|アコースティックギター|ピアノ|piano|ヴァイオリン|violin|チェロ|cello|フルート|flute|クラリネット|オーケストラ|orchestra|ストリング|string|生楽器|弾き語り|camp|キャンプ|焚き火|キャンプファイヤー|星空|広野|草原|牧場|country|カントリー|folk|フォーク/);

  // ── ジャンルベース補完（常に適用） ────────────────────────────────────────
  // キーワードマッチとは独立して、ジャンルのデフォルトムードを付与する。
  // アイドル曲が「甘い」タグを持っていても「かわいい」も付くように常時追加する。
  for (const m of inferGenreMoodTags(song.genre || '')) {
    if (MOOD_TAG_SET.has(m)) tagSet.add(m);
  }

  return Array.from(tagSet).filter(Boolean);
}

// ---------------------------------------------------------------------------
// 複合タグ
// ---------------------------------------------------------------------------

/**
 * 複数のタグ組み合わせから複合タグを生成する。
 *
 * @param {string[]} existingTags
 * @returns {string[]}
 */
export function inferCompositeTags(existingTags) {
  const tagSet = new Set(existingTags.map(t => t.toLowerCase()));
  const composite = [];

  if (tagSet.has('chill') && tagSet.has('夜')) composite.push('夜chill');
  if (tagSet.has('chill') && tagSet.has('雨')) composite.push('雨chill');
  if (tagSet.has('chill') && tagSet.has('朝')) composite.push('朝chill');
  if (tagSet.has('しっとり') && tagSet.has('恋愛')) composite.push('ラブソング');
  if (tagSet.has('しっとり') && tagSet.has('別れ')) composite.push('失恋ソング');
  if (tagSet.has('エモい') && tagSet.has('恋愛')) composite.push('エモラブ');
  if (tagSet.has('エモい') && tagSet.has('別れ')) composite.push('エモ別れ');
  if (tagSet.has('盛り上がる') && tagSet.has('夏')) composite.push('夏フェス');
  if (tagSet.has('盛り上がる') && tagSet.has('イベント')) composite.push('パーティソング');
  if (tagSet.has('かわいい') && tagSet.has('春')) composite.push('春のかわいい曲');
  if (tagSet.has('かわいい') && tagSet.has('恋愛')) composite.push('キュンソング');
  if (tagSet.has('懐かしい') && tagSet.has('春')) composite.push('春の思い出');
  if (tagSet.has('懐かしい') && tagSet.has('夏')) composite.push('夏の思い出');
  if (tagSet.has('和風') && tagSet.has('冬')) composite.push('日本の冬');
  if (tagSet.has('和風') && tagSet.has('春')) composite.push('日本の春');
  if (tagSet.has('ディズニー') && tagSet.has('恋愛')) composite.push('ディズニーラブ');
  if (tagSet.has('k-pop') && tagSet.has('かわいい')) composite.push('K-POPかわいい');
  if (tagSet.has('k-pop') && tagSet.has('ファンキー')) composite.push('K-POPダンス');
  if (tagSet.has('定番') && tagSet.has('盛り上がる')) composite.push('定番アンセム');
  if (tagSet.has('定番') && tagSet.has('しっとり')) composite.push('定番バラード');
  if ((tagSet.has('久しぶり') || tagSet.has('超久しぶり')) && tagSet.has('懐かしい')) composite.push('久しぶりの名曲');
  if (tagSet.has('アコースティック') && tagSet.has('恋愛')) composite.push('アコースティックラブ');
  if (tagSet.has('アコースティック') && tagSet.has('朝')) composite.push('モーニングアコースティック');
  if (tagSet.has('エレクトロ') && tagSet.has('盛り上がる')) composite.push('エレクトロダンス');
  if (tagSet.has('ダーク') && tagSet.has('ミステリアス')) composite.push('ダークミステリー');
  if (tagSet.has('ファンキー') && tagSet.has('夏')) composite.push('サマーファンク');
  if (tagSet.has('セクシー') && tagSet.has('夜')) composite.push('ナイトグルーヴ');
  if (tagSet.has('甘い') && tagSet.has('かわいい')) composite.push('甘かわ');
  if (tagSet.has('ノスタルジック') && tagSet.has('秋')) composite.push('秋の追憶');

  return composite;
}

export function inferCompoundTags(songOrTags) {
  if (Array.isArray(songOrTags)) return inferCompositeTags(songOrTags);
  return inferCompositeTags([
    ...(songOrTags?.moodTags || []),
    ...(songOrTags?.seasonTags || []),
    ...(songOrTags?.statsTags || []),
    ...(songOrTags?.genreTags || []),
  ]);
}

// ---------------------------------------------------------------------------
// 配信者タグ
// ---------------------------------------------------------------------------

/**
 * @param {{ displayKey?: string, count?: number, daysSinceLast?: number|null }} song
 * @returns {string[]}
 */
export function singerTags(song) {
  const tags = [];
  if (song.displayKey) tags.push('キー確認済み');
  if ((song.count ?? 0) >= 10) tags.push('定番');
  if (song.daysSinceLast != null && song.daysSinceLast >= 180) tags.push('久しぶり候補');
  if ((song.count ?? 0) <= 1) tags.push('レア');
  return tags;
}

// ---------------------------------------------------------------------------
// トレンドラベル
// ---------------------------------------------------------------------------

/**
 * @param {{ lastSung?: unknown, daysSinceLast?: number|null, count?: number }} song
 * @returns {string}
 */
export function trendLabel(song) {
  if (!song.lastSung) return '履歴未確認';
  if (song.daysSinceLast != null && song.daysSinceLast <= 30) return '最近';
  if (song.daysSinceLast != null && song.daysSinceLast >= 365) return '超久しぶり';
  if (song.daysSinceLast != null && song.daysSinceLast >= 180) return '久しぶり';
  if ((song.count ?? 0) <= 1) return 'レア';
  if ((song.count ?? 0) >= 10) return '定番';
  return '通常';
}

// ---------------------------------------------------------------------------
// 統合タグ生成
// ---------------------------------------------------------------------------

/**
 * すべてのタグ推論を統合して、曲の完全なタグセットを生成する。
 *
 * @param {{ title?: string, artist?: string, genre?: string, displayKey?: string, count?: number, daysSinceLast?: number|null, lastSung?: unknown }} song
 * @returns {string[]}
 */
export function inferAllTags(song) {
  const allTags = [];
  const statsTags = inferStatsTags(song);
  const genreTags = inferGenreTags(song);
  const seasonTags = inferSeasonTags(song);
  const moodTags = inferMoodTags(song);
  allTags.push(...statsTags);
  allTags.push(...genreTags);
  allTags.push(...seasonTags);
  allTags.push(...moodTags);
  const compoundTags = inferCompositeTags(allTags);
  allTags.push(...compoundTags);
  const tags = Array.from(new Set(allTags.filter(Boolean)));
  tags.statsTags = statsTags;
  tags.genreTags = genreTags;
  tags.seasonTags = seasonTags;
  tags.moodTags = moodTags;
  tags.compoundTags = compoundTags;
  return tags;
}
