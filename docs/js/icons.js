const PATHS = {
  analytics: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l3-4 4 2 5-7"/><circle cx="7" cy="15" r="1"/><circle cx="10" cy="11" r="1"/><circle cx="14" cy="13" r="1"/><circle cx="19" cy="6" r="1"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  artist: '<path d="M16 11a4 4 0 1 0-8 0"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="M18 5v7"/><path d="M18 5l3-1v3l-3 1"/>',
  bookmark: '<path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/>',
  calendar: '<path d="M7 3v4"/><path d="M17 3v4"/><path d="M4 8h16"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 13h3"/><path d="M13 13h3"/><path d="M8 17h3"/>',
  chart: '<path d="M4 13h5v7H4z"/><path d="M10 4h5v16h-5z"/><path d="M16 9h4v11h-4z"/>',
  check: '<path d="M5 12l4 4L19 6"/>',
  checkbox: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  chevronUp: '<path d="M6 15l6-6 6 6"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  drag: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
  copy: '<rect x="8" y="8" width="10" height="12" rx="2"/><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  dice: '<rect x="5" y="5" width="14" height="14" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4"/>',
  heart: '<path d="M20.8 5.6a5.4 5.4 0 0 0-7.6 0L12 6.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.8a5.4 5.4 0 0 0 0-7.6z"/>',
  infinity: '<path d="M12 12c-2-2.67-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.33 6-4z"/><path d="M12 12c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4z"/>',
  lightbulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14a6 6 0 1 1 8 0c-1 1-1.5 2-1.5 4h-5c0-2-.5-3-1.5-4z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M8 21h8"/>',
  moon: '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a7 7 0 1 0 11.5 11.5z"/>',
  music: '<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',
  next: '<path d="M5 5v14l11-7z"/><path d="M19 5v14"/>',
  pause: '<path d="M8 5v14"/><path d="M16 5v14"/>',
  play: '<path d="M7 5v14l11-7z"/>',
  playlist: '<path d="M5 6h10"/><path d="M5 11h10"/><path d="M5 16h7"/><path d="M18 8v10l3-2 3 2V8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1z"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  previous: '<path d="M19 5v14L8 12z"/><path d="M5 5v14"/>',
  question: '<path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5"/><path d="M12 18h.01"/>',
  rank: '<path d="M8 4h8v3a4 4 0 0 1-8 0z"/><path d="M6 5H3v2a4 4 0 0 0 4 4"/><path d="M18 5h3v2a4 4 0 0 1-4 4"/><path d="M12 11v5"/><path d="M8 20h8"/><path d="M9 16h6v4H9z"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  repeatOne: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/><path d="M11 10h1.5v4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  sparkle: '<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  time: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>',
  video: '<rect x="4" y="6" width="12" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  volume: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M18.5 6.5a9 9 0 0 1 0 11"/>',
};

export function icon(name, className = 'ui-icon') {
  const path = PATHS[name] || PATHS.music;
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}

export function labelIcon(name, text, className = 'label-icon') {
  return `${icon(name, className)} ${text}`;
}
