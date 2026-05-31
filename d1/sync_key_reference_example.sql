-- Run this after key_reference_latest_streams_from_sheet exists in D1.
-- Adjust column names if your source table uses different names.

UPDATE songs
SET
  display_key = COALESCE((
    SELECT key
    FROM key_reference_latest_streams_from_sheet ref
    WHERE songs.song_key = lower(trim(ref.title)) || '__' || lower(trim(ref.artist))
    LIMIT 1
  ), display_key),
  genre = COALESCE((
    SELECT genre
    FROM key_reference_latest_streams_from_sheet ref
    WHERE songs.song_key = lower(trim(ref.title)) || '__' || lower(trim(ref.artist))
    LIMIT 1
  ), genre)
WHERE EXISTS (
  SELECT 1
  FROM key_reference_latest_streams_from_sheet ref
  WHERE songs.song_key = lower(trim(ref.title)) || '__' || lower(trim(ref.artist))
);
