import { ensureSongTags } from './data.js';

export function ensureSongsTags(songs) {
  for (const song of songs || []) ensureSongTags(song);
  return songs || [];
}
