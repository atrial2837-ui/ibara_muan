/**
 * @module usecase/generate-static-data
 * @description 静的 JSON 出力用の構造を組み立てる UseCase。
 *
 * **ファイル書き出しはしない** (Infra の責務)。生データから meta / songs / streams
 * の 3 つの構造を返す。
 *
 * 根拠となる既存コード:
 *   - admin-server/server.js:758-798 (generateStaticData)
 *   - admin-server/server.js:750-756 (buildStaticSiteData)
 *   - functions/api/data.js (BuildDatasetUseCase 相当)
 *
 * 依存: Phase 3C の buildDataset を内部で呼ぶ。
 *   - import { buildDataset } from './build-dataset.js'
 *   - Phase 3C 完了まで import エラーが発生可能。テストはモック で回避。
 *
 * @副作用 なし (Repository 読み取り + 構造組み立てのみ)
 */

/**
 * @typedef {object} GenerateStaticDataDeps
 * @property {import('../domain/port/repositories/channel-repository.js').ChannelRepository} channels
 * @property {import('../domain/port/repositories/artist-repository.js').ArtistRepository} artists
 * @property {import('../domain/port/repositories/song-repository.js').SongRepository} songs
 * @property {import('../domain/port/repositories/stream-repository.js').StreamRepository} streams
 * @property {import('../domain/port/repositories/stream-song-repository.js').StreamSongRepository} streamSongs
 * @property {import('../domain/port/repositories/song-channel-stats-repository.js').SongChannelStatsRepository} stats
 * @property {import('../domain/port/clock.js').Clock} clock
 */

/**
 * @typedef {object} GenerateStaticDataResult
 * @property {object} meta - メタ情報: { generatedAt, channels, combined }
 * @property {object} songs - 曲データ: { generatedAt, channels: { [code]: SongRecord[] } }
 * @property {object} streams - 歌枠データ: { generatedAt, channels: { [code]: StreamRecord[] } }
 */

/**
 * 静的 JSON 出力用の構造を組み立てる。
 *
 * admin-server:758-798 の generateStaticData と同じロジック。
 * ただし ファイル出力は行わない (戻り値のみ)。
 *
 * @param {GenerateStaticDataDeps} deps
 * @returns {Promise<GenerateStaticDataResult>}
 */
export async function generateStaticData(deps) {
  // Phase 3C の buildDataset を import して呼ぶ
  // (Phase 3C が未完成の場合は import エラー → テストでモック)
  let buildDataset;
  try {
    const module = await import('./build-dataset.js');
    buildDataset = module.buildDataset;
  } catch (err) {
    // Phase 3C がまだ実装されていない場合のフォールバック
    // テストのみでここに達し、実運用では build-dataset.js が存在するはず
    throw new Error('build-dataset.js is not available yet (Phase 3C in progress)');
  }

  // buildDataset で全データセットを取得
  const dataset = await buildDataset(deps);

  // 現在時刻を ISO 文字列で取得
  const generatedAt = deps.clock.now().toISOString();

  // 3 つの構造に分割
  const split = {
    meta: {
      generatedAt,
      channels: Object.fromEntries(
        Object.entries(dataset.channels).map(([code, channelData]) => [code, channelData.stats]),
      ),
      combined: dataset.combined.stats,
    },
    songs: {
      generatedAt,
      channels: Object.fromEntries(
        Object.entries(dataset.channels).map(([code, channelData]) => [code, channelData.songs]),
      ),
    },
    streams: {
      generatedAt,
      channels: Object.fromEntries(
        Object.entries(dataset.channels).map(([code, channelData]) => [code, channelData.streams]),
      ),
    },
  };

  return split;
}
