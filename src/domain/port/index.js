/**
 * @module domain/port
 * @description Port 層のバレル export。
 *
 * Repository / Gateway / Clock の interface (JSDoc typedef) を
 * 一括で参照可能にする。実装は infra/ 層が担う (依存性逆転)。
 *
 * 依存方向: domain/port は domain/ の他サブモジュールのみに依存し、
 * infra / adapter / apps からは import しない。
 *
 * エクスポートする typedef 一覧:
 *   - Clock
 *   - Song, NewSong, SongMetadata, SongRepository
 *   - Artist, NewArtist, ArtistRepository
 *   - Stream, NewStream, StreamPatch, StreamRepository
 *   - StreamSong, NewStreamSong, StreamSongRepository
 *   - SongChannelStat, SongChannelStatsRepository
 *   - Channel, ChannelRepository
 *   - SpreadsheetGateway
 *   - WorkflowDispatchInput, GitHubActionsGateway
 *   - PreviewSong, StreamInput, AdminApiGateway
 *   - Setlist, SetlistStore
 */

// Clock
export * from './clock.js';

// Repositories
export * from './repositories/song-repository.js';
export * from './repositories/artist-repository.js';
export * from './repositories/stream-repository.js';
export * from './repositories/stream-song-repository.js';
export * from './repositories/song-channel-stats-repository.js';
export * from './repositories/channel-repository.js';

// Gateways
export * from './gateways/spreadsheet-gateway.js';
export * from './gateways/github-actions-gateway.js';
export * from './gateways/admin-api-gateway.js';
export * from './gateways/setlist-store.js';
