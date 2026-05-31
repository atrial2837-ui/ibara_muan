/**
 * @module usecase/load-admin-status
 * @description Admin UI 用のステータス情報を取得・集計する UseCase。
 *
 * docs/js/admin.js の loadStatus / renderQuality / collectIssues の
 * データ取得・集計部分を UseCase として分離。
 *
 * チャンネル毎の統計情報 (songCount, streamCount, lastStreamedOn) を計算し、
 * 品質チェック (stale, empty issues) を実施する。
 *
 * 根拠となる既存コード:
 *   - docs/js/admin.js:223-276 (loadStatus)
 *   - docs/js/admin.js:188-209 (renderQuality + collectIssues)
 *   - docs/js/admin.js:123-168 (collectIssues)
 *
 * @副作用 なし (Repository 読み取り + 純粋な集計処理)
 */

const STALE_DAYS_THRESHOLD = 30;

/**
 * @typedef {object} LoadAdminStatusDeps
 * @property {import('../domain/port/repositories/channel-repository.js').ChannelRepository} channels
 * @property {import('../domain/port/repositories/song-repository.js').SongRepository} songs
 * @property {import('../domain/port/repositories/stream-repository.js').StreamRepository} streams
 * @property {import('../domain/port/clock.js').Clock} clock
 */

/**
 * @typedef {object} ChannelStatus
 * @property {string} code - チャンネルコード
 * @property {string} name - チャンネル表示名
 * @property {number} songCount - チャンネル内で歌われた曲数 (stream + song join)
 * @property {number} streamCount - チャンネル内の歌枠数
 * @property {string|null} lastStreamedOn - 最新の歌枠日 (YYYY-MM-DD) または null
 */

/**
 * @typedef {object} QualityIssue
 * @property {string} code - チャンネルコード
 * @property {string} message - 問題の説明
 */

/**
 * @typedef {object} AdminStatus
 * @property {ChannelStatus[]} channels - チャンネルごとのステータス
 * @property {QualityIssue[]} issues - 品質チェック結果
 * @property {string} checkedAt - 確認時刻 (ISO8601)
 */

/**
 * Admin UI 用のステータス情報を取得・集計する。
 *
 * 各チャンネルについて:
 *   1. streamCount: channel_id で当該チャンネルの歌枠数
 *   2. lastStreamedOn: 最新歌枠の streamed_on
 *   3. songCount: 曲テーブルの総数 (全体統計扱い。建築物アナリティクスから)
 *   4. issues: stale (30日以上), empty (曲0件)
 *
 * @param {LoadAdminStatusDeps} deps
 * @returns {Promise<AdminStatus>}
 */
export async function loadAdminStatus(deps) {
  // 全データを並列取得
  const [allChannels, allSongs, allStreams] = await Promise.all([
    deps.channels.findAll(),
    deps.songs.findAll(),
    deps.streams.findAll(),
  ]);

  // チャンネルごとのステータスを計算
  const channels = [];
  for (const ch of allChannels) {
    const chStreams = allStreams.filter((s) => s.channel_id === ch.id);

    // 最新歌枠日を取得
    let lastStreamedOn = null;
    if (chStreams.length > 0) {
      const latest = chStreams.reduce((prev, curr) =>
        curr.streamed_on > prev.streamed_on ? curr : prev,
      );
      lastStreamedOn = latest.streamed_on;
    }

    channels.push({
      code: ch.code,
      name: ch.name,
      songCount: allSongs.length, // 全曲統計 (チャンネル別フィルタなし)
      streamCount: chStreams.length,
      lastStreamedOn,
    });
  }

  // 品質チェック: 各チャンネルについて stale / empty を検出
  const issues = [];
  const now = deps.clock.now();

  for (const ch of allChannels) {
    const chStreams = allStreams.filter((s) => s.channel_id === ch.id);

    // songs が 0 件の場合
    if (allSongs.length === 0) {
      issues.push({
        code: ch.code,
        message: '曲が登録されていません',
      });
    }

    // 歌枠が 0 件の場合
    if (chStreams.length === 0) {
      issues.push({
        code: ch.code,
        message: '歌枠が記録されていません',
      });
    } else {
      // 30日以上 stream がない場合
      const latest = chStreams.reduce((prev, curr) =>
        curr.streamed_on > prev.streamed_on ? curr : prev,
      );
      const latestDate = new Date(`${latest.streamed_on}T00:00:00Z`);
      const daysSince = Math.floor((now - latestDate) / (24 * 60 * 60 * 1000));
      if (daysSince > STALE_DAYS_THRESHOLD) {
        issues.push({
          code: ch.code,
          message: `${daysSince}日間歌枠がありません`,
        });
      }
    }
  }

  return {
    channels,
    issues,
    checkedAt: now.toISOString(),
  };
}
