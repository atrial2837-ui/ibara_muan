ALTER TABLE songs ADD COLUMN display_key TEXT NOT NULL DEFAULT '';
ALTER TABLE songs ADD COLUMN genre TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_songs_display_key ON songs(display_key);
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre);
