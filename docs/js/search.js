import { normalize, parseQuery, matchReasons } from './domain-compat.js';
import { ensureSongsTags } from './tagging.js';

const SEARCH_HISTORY_KEY = 'ibara-search-history-v1';
const MAX_HISTORY = 10;

export function getSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch (_) {
    return [];
  }
}

export function addSearchHistory(query) {
  const q = (query || '').trim();
  if (!q) return;
  const history = getSearchHistory().filter(item => item !== q);
  history.unshift(q);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function removeSearchHistory(query) {
  const history = getSearchHistory().filter(item => item !== query);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

export function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

const fuseOptions = {
  keys: [
    { name: 'title', weight: 0.65 },
    { name: 'artist', weight: 0.35 },
    { name: 'genreText', weight: 0.18 },
    { name: 'tagText', weight: 0.14 },
    { name: 'moodText', weight: 0.12 },
    { name: 'seasonText', weight: 0.1 },
    { name: 'keyText', weight: 0.1 },
    { name: 'moodTagText', weight: 0.1 },
    { name: 'singerTagText', weight: 0.08 },
  ],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 1,
  includeScore: true,
};

let fuse = null;
let fuseCtor = null;
let fusePromise = null;
let songRef = null;
let indexToken = 0;

function loadFuse() {
  if (fuseCtor) return Promise.resolve(fuseCtor);
  if (!fusePromise) {
    fusePromise = import('fuse.js').then((module) => {
      fuseCtor = module.default;
      return fuseCtor;
    });
  }
  return fusePromise;
}

export { parseQuery, matchReasons };

export function buildIndex(songs) {
  ensureSongsTags(songs);
  songRef = songs;
  fuse = null;
  const token = ++indexToken;
  const build = () => {
    loadFuse()
      .then((Fuse) => {
        if (token === indexToken && songRef === songs) fuse = new Fuse(songs, fuseOptions);
      })
      .catch(() => {});
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(build, { timeout: 3000 });
  } else {
    window.setTimeout(build, 1500);
  }
}

const FIELD_RE = /(?<key>title|artist|genre|tag|mood|season|key|count|last|days)\s*(?<op>:|<=|>=|=|<|>)\s*(?<val>"[^"]*"|\S+)/gi;

function parseQueryLocal(raw) {
  const filters = [];
  let rest = raw;
  rest = rest.replace(FIELD_RE, (m, key, op, val, ..._args) => {
    let v = val;
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    filters.push({ key: key.toLowerCase(), op: op || ':', val: v });
    return ' ';
  });
  rest = rest.trim().replace(/\s+/g, ' ');
  const tokens = rest ? rest.split(' ') : [];
  return { tokens, filters };
}

function applyFieldFilters(songs, filters) {
  return songs.filter(song => {
    for (const f of filters) {
      const v = f.val;
      switch (f.key) {
        case 'title': {
          if (!normalize(song.title).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        }
        case 'artist': {
          if (!normalize(song.artist).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        }
        case 'genre': {
          if (!normalize(song.genreText || song.genre).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        }
        case 'key': {
          if (!normalize(song.keyText).toLowerCase().split(/\s+/).includes(normalize(v).toLowerCase())) return false;
          break;
        }
        case 'tag': {
          if (!normalize(song.tagText).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        }
        case 'mood': {
          if (!normalize(song.moodText).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        }
        case 'season': {
          if (!normalize(song.seasonText).toLowerCase().includes(normalize(v).toLowerCase())) return false;
          break;
        }
        case 'count': {
          const n = parseFloat(v);
          if (Number.isNaN(n)) return false;
          if (!cmp(song.count, f.op, n)) return false;
          break;
        }
        case 'days': {
          const n = parseFloat(v);
          if (Number.isNaN(n)) return false;
          const d = song.daysSinceLast == null ? Infinity : song.daysSinceLast;
          if (!cmp(d, f.op, n)) return false;
          break;
        }
        case 'last': {
          if (v === 'never' || v === 'untouched') {
            if (song.lastSung) return false;
          } else if (v === 'fresh') {
            if (song.daysSinceLast == null || song.daysSinceLast > 30) return false;
          } else if (v === 'stale') {
            if (song.daysSinceLast == null || song.daysSinceLast < 180) return false;
          } else {
            const days = parseInt(String(v).replace(/d$/i, ''), 10);
            if (!Number.isNaN(days)) {
              const d = song.daysSinceLast == null ? Infinity : song.daysSinceLast;
              if (!cmp(d, f.op === ':' ? '<=' : f.op, days)) return false;
            }
          }
          break;
        }
      }
    }
    return true;
  });
}

function cmp(a, op, b) {
  switch (op) {
    case '>':  return a >  b;
    case '<':  return a <  b;
    case '>=': return a >= b;
    case '<=': return a <= b;
    case '=':
    case ':':  return a == b;
  }
  return true;
}

export function search(rawQuery, fallbackSongs) {
  const songs = songRef || fallbackSongs || [];
  const q = (rawQuery || '').trim();
  if (!q) return { results: songs, tokens: [] };
  ensureSongsTags(songs);
  const { tokens, filters } = parseQuery(q);
  let pool = applyFieldFilters(songs, filters);
  if (!tokens.length) return { results: pool, tokens: [] };
  const phrase = tokens.join(' ');
  if (!fuseCtor) {
    loadFuse()
      .then((Fuse) => {
        if (!fuse && songRef) fuse = new Fuse(songRef, fuseOptions);
      })
      .catch(() => {});
    const needle = normalize(phrase).toLowerCase();
    return {
      results: pool.filter((song) => [
        song.title,
        song.artist,
        song.genreText || song.genre,
        song.tagText,
        song.moodText,
        song.seasonText,
        song.keyText,
        song.moodTagText || '',
        song.singerTagText || '',
      ].some((value) => normalize(value).toLowerCase().includes(needle))),
      tokens,
    };
  }
  const fuseLocal = (pool === songs && fuse)
    ? fuse
    : new fuseCtor(pool, fuseOptions);
  const fuseResults = fuseLocal.search(phrase);
  return { results: fuseResults.map(r => r.item), tokens };
}
