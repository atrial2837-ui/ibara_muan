-- コミュニティタイムスタンプ投稿テーブル
-- ユーザーが提案したタイムスタンプを蓄積し、管理者承認後に公開する

CREATE TABLE IF NOT EXISTS community_timestamps (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_code    TEXT    NOT NULL,          -- チャンネルコード (汎用文字列、単一チャンネル運用でも複数チャンネル運用でも利用可)
  stream_index    INTEGER NOT NULL,          -- 枠番号
  song_index      INTEGER NOT NULL,          -- セットリスト内インデックス (0-based)
  time_seconds    INTEGER NOT NULL,          -- タイムスタンプ（秒）
  status          TEXT    NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  submitter_note  TEXT,                      -- 投稿者コメント（任意）
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  reviewed_at     TEXT,                      -- 審査日時
  reviewer_note   TEXT                       -- 管理者コメント
);

CREATE INDEX IF NOT EXISTS idx_ct_lookup
  ON community_timestamps (channel_code, stream_index, status);

CREATE INDEX IF NOT EXISTS idx_ct_status_created
  ON community_timestamps (status, created_at DESC);
