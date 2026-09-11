/**
 * @module usecase/replace-setlist
 * @description 既存歌枠のセトリを全置換する UseCase。
 * stream_id で歌枠を直接特定し、旧セトリを削除して新セトリを登録する。
 * 歌枠のメタ情報 (title / url / streamed_on) は変更しない。
 */

import { NotFoundError } from '../domain/error/not-found-error.js';
import { ValidationError } from '../domain/error/validation-error.js';
import { splitSongLine } from '../domain/stream/setlist-parser.js';
import { upsertSong } from './upsert-song.js';

/**
 * @typedef {object} ReplaceSetlistInput
 * @property {number|string} streamId
 * @property {string} songsText  - 改行区切りのセトリテキスト
 */

/**
 * @param {import('./add-stream.js').AddStreamDeps} deps
 * @param {ReplaceSetlistInput} input
 * @returns {Promise<{ streamId: number, count: number }>}
 */
export async function replaceSetlist(deps, input) {
  const stream = await deps.streams.findById(Number(input.streamId));
  if (!stream) throw new NotFoundError('stream not found');

  const allChannels = await deps.channels.findAll();
  const channel = allChannels.find((c) => c.id === stream.channel_id);
  if (!channel) throw new NotFoundError('channel not found for stream');

  const lines = String(input.songsText ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) throw new ValidationError('曲リストが空です');

  const now = deps.clock.now().toISOString();

  // 旧セトリの stats をデクリメント
  const oldRows = await deps.streamSongs.findByStreamId(stream.id);
  const oldSongIds = oldRows
    .filter((r) => r.song_id != null)
    .map((r) => /** @type {number} */ (r.song_id));
  if (oldSongIds.length > 0) {
    await deps.stats.decrementBySongIds(oldSongIds, channel.id, now);
  }

  await deps.streamSongs.deleteByStreamId(stream.id);

  /** @type {import('../domain/port/repositories/stream-song-repository.js').NewStreamSong[]} */
  const newRows = [];
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
    newRows.push({
      streamId: stream.id,
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

  await deps.streamSongs.insertBatch(newRows);

  // song_count を更新 (その他のフィールドは据え置き)
  await deps.streams.update(stream.id, {
    source_index: stream.source_index,
    title: stream.title,
    url: stream.url,
    song_count: lines.length,
  });

  return { streamId: stream.id, count: lines.length };
}
