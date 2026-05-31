/**
 * @module usecase/add-stream
 * @description 歌枠追加 UseCase。
 *
 * 根拠となる既存コード:
 *   - functions/api/admin/[[path]].js:256-327 (addStream 関数)
 *   - admin-server/server.js:256-424 (同等部分)
 *
 * @副作用 なし (Repository への読み書きのみ)
 */

import { normalize } from '../domain/shared/text.js';
import { splitSongLine } from '../domain/stream/setlist-parser.js';
import { ValidationError } from '../domain/error/validation-error.js';
import { upsertSong } from './upsert-song.js';

/**
 * @typedef {object} AddStreamDeps
 * @property {import('../domain/port/repositories/channel-repository.js').ChannelRepository} channels
 * @property {import('../domain/port/repositories/stream-repository.js').StreamRepository} streams
 * @property {import('../domain/port/repositories/stream-song-repository.js').StreamSongRepository} streamSongs
 * @property {import('../domain/port/repositories/song-repository.js').SongRepository} songs
 * @property {import('../domain/port/repositories/artist-repository.js').ArtistRepository} artists
 * @property {import('../domain/port/repositories/song-channel-stats-repository.js').SongChannelStatsRepository} stats
 * @property {import('../domain/port/clock.js').Clock} clock
 */

/**
 * @typedef {object} AddStreamInput
 * @property {string} channelCode    - チャンネルコード (例: 'new')
 * @property {string} streamedOn     - 配信日 YYYY-MM-DD
 * @property {string} [title]        - 配信タイトル (省略可)
 * @property {string} [url]          - 配信 URL (省略可)
 * @property {string} songsText      - セトリテキスト (改行区切り)
 * @property {number} [sourceIndex]  - 枠番号 (省略時は自動採番)
 */

/**
 * @typedef {object} AddStreamResult
 * @property {number} streamId  - 登録/更新された stream の ID
 * @property {number} count     - 登録された曲数
 */

/**
 * 配信日が YYYY-MM-DD 形式かどうかを検証する。
 *
 * 既存実装 (admin:259-260) に準拠。
 *
 * @param {string} streamedOn
 * @returns {string} 正規化済み配信日
 * @throws {ValidationError}
 */
function validateStreamedOn(streamedOn) {
  const normalized = normalize(streamedOn);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new ValidationError('配信日は YYYY-MM-DD で入力してください');
  }
  return normalized;
}

/**
 * URL キーを生成する。
 *
 * URL が指定されていればそれを使い、なければ "channelCode:streamedOn:title" を使う。
 * 既存実装 (admin:266) の inline ロジック。
 *
 * @param {string} url         - 正規化済み URL (空文字の場合あり)
 * @param {string} channelCode - チャンネルコード
 * @param {string} streamedOn  - YYYY-MM-DD
 * @param {string} title       - 正規化済みタイトル
 * @returns {string}
 */
function buildUrlKey(url, channelCode, streamedOn, title) {
  return url || `${channelCode}:${streamedOn}:${title}`;
}

/**
 * 歌枠を追加する (既存歌枠の上書きを含む)。
 *
 * 既存実装 (admin:256-327) に準拠した処理手順:
 *   1. channelCode でチャンネルを検索 → 未知なら ValidationError
 *   2. streamedOn を YYYY-MM-DD 形式で検証 → 不正なら ValidationError
 *   3. songsText を改行分割し空行除去 → 空なら ValidationError
 *   4. urlKey を生成
 *   5. sourceIndex を決定 (入力値 or streams.nextSourceIndex)
 *   6. 既存 stream を findByChannelDateUrlKey で検索
 *      - 既存あり:
 *        a. stream_songs から旧 song_id を取得し stats.decrementBySongIds で減算
 *        b. streamSongs.deleteByStreamId で旧行削除
 *        c. streams.update で song_count / title / url / source_index を更新
 *      - 既存なし: streams.insert で新規挿入
 *   7. 各曲について:
 *        a. splitSongLine で行解析
 *        b. upsertSong UseCase を呼ぶ
 *        c. streamSongs.insertBatch でセトリ行追加
 *        d. stats.upsertIncrement で sing_count +1
 *   8. { streamId, count } を返す
 *
 * @param {AddStreamDeps} deps
 * @param {AddStreamInput} input
 * @returns {Promise<AddStreamResult>}
 */
export async function addStream(deps, input) {
  // 1. チャンネル検索
  const channel = await deps.channels.findByCode(input.channelCode);
  if (!channel) {
    throw new ValidationError(`unknown channel: ${input.channelCode}`);
  }

  // 2. 配信日バリデーション
  const streamedOn = validateStreamedOn(input.streamedOn);

  // 3. 曲リスト解析
  const lines = String(input.songsText ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    throw new ValidationError('曲リストが空です');
  }

  // 4. urlKey 生成
  const url = normalize(input.url ?? '');
  const title = normalize(input.title ?? '');
  const urlKey = buildUrlKey(url, channel.code, streamedOn, title);

  // 5. sourceIndex 決定
  const sourceIndex =
    Number(input.sourceIndex) || (await deps.streams.nextSourceIndex(channel.id));

  const now = deps.clock.now().toISOString();

  // 6. 既存 stream 検索
  const existing = await deps.streams.findByChannelDateUrlKey(channel.id, streamedOn, urlKey);

  let streamId;

  if (existing) {
    // 既存あり: 旧 song_id を取得して sing_count をデクリメント
    const oldRows = await deps.streamSongs.findByStreamId(existing.id);
    const oldSongIds = oldRows
      .filter((r) => r.song_id != null)
      .map((r) => /** @type {number} */ (r.song_id));

    if (oldSongIds.length > 0) {
      await deps.stats.decrementBySongIds(oldSongIds, channel.id, now);
    }

    // 旧 stream_songs 削除
    await deps.streamSongs.deleteByStreamId(existing.id);

    // stream レコード更新
    await deps.streams.update(existing.id, {
      source_index: sourceIndex,
      title,
      url,
      song_count: lines.length,
    });

    streamId = existing.id;
  } else {
    // 既存なし: 新規挿入
    const result = await deps.streams.insert({
      channelId: channel.id,
      sourceIndex,
      streamedOn,
      title,
      url,
      urlKey,
      songCount: lines.length,
      createdAt: now,
    });
    streamId = result.id;
  }

  // 7. 各曲を upsert して stream_songs / stats を更新
  /** @type {import('../domain/port/repositories/stream-song-repository.js').NewStreamSong[]} */
  const streamSongRows = [];

  for (let i = 0; i < lines.length; i++) {
    const parsed = splitSongLine(lines[i]);

    const songResult = await upsertSong(
      { songs: deps.songs, artists: deps.artists, clock: deps.clock },
      {
        title: parsed.title,
        artist: parsed.artist,
        displayKey: parsed.displayKey || undefined,
        genre: parsed.genre || undefined,
      },
    );

    streamSongRows.push({
      streamId,
      songId: songResult.id,
      position: i + 1,
      rawText: parsed.raw,
      titleSnapshot: parsed.title,
      artistSnapshot: parsed.artist || null,
      songKeySnapshot: songResult.songKey,
      createdAt: now,
    });

    await deps.stats.upsertIncrement(songResult.id, channel.id, now);
  }

  await deps.streamSongs.insertBatch(streamSongRows);

  return { streamId, count: lines.length };
}
