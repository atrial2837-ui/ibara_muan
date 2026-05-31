export const SHEET_ID = '1supVLmIOoa3fdwvT_NHioLefjsa-ldQBQCMhZakKD-o';

export const CHANNELS = {
  main: {
    id: 'main',
    label: '茨むあん',
    listGid: '0',
    setlistGid: '0',
  },
};

export const DEFAULT_CHANNEL = 'main';

// Legacy aliases (kept for backwards compatibility)
export const LIST_GID = CHANNELS.main.listGid;
export const SETLIST_GID = CHANNELS.main.setlistGid;

export const TIMELINE_INITIAL = 12;
export const TIMELINE_STEP = 12;
export const RANKING_LIST_LIMIT = 50;
export const TOP_ARTISTS_LIMIT = 20;
export const ACTIVITY_RECENT_LIMIT = 5;

export const DAYS_FRESH = 30;
export const DAYS_STALE = 180;

export const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

export const gvizUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&_t=${Date.now()}`;
