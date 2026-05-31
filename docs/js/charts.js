import { onThemeChange, getResolvedTheme } from './theme.js';

const CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
const charts = new Map();
let chartJsPromise = null;
let cssVars = {};

function ensureChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (chartJsPromise) return chartJsPromise;

  chartJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHART_JS_URL;
    script.async = true;
    script.onload = () => resolve(window.Chart);
    script.onerror = () => reject(new Error('Chart.js failed to load'));
    document.head.appendChild(script);
  });

  return chartJsPromise;
}

function readCssVars() {
  const cs = getComputedStyle(document.documentElement);
  const css = (name) => cs.getPropertyValue(name).trim();
  cssVars = {
    ink: css('--ink'),
    inkSoft: css('--ink-soft'),
    inkMute: css('--ink-mute'),
    primary: css('--primary'),
    primaryStrong: css('--primary-strong'),
    primarySoft: css('--primary-soft'),
    accent: css('--accent'),
    accentStrong: css('--accent-strong'),
    border: css('--border'),
    borderSoft: css('--border-soft'),
    surface: css('--surface'),
    gold: css('--gold'),
    chartPrimary: css('--chart-primary') || css('--primary'),
    chartPrimaryStrong: css('--chart-primary-strong') || css('--primary-strong'),
    chartPrimarySoft: css('--chart-primary-soft') || css('--primary-soft'),
    chartAccent: css('--chart-accent') || css('--accent'),
    chartAccentStrong: css('--chart-accent-strong') || css('--accent-strong'),
    chartAccentSoft: css('--chart-accent-soft') || css('--accent-soft'),
  };
}

export function getColors() {
  if (!cssVars.ink) readCssVars();
  return cssVars;
}

function defaults() {
  const c = getColors();
  return {
    color: c.ink,
    borderColor: c.border,
    font: { family: '"Ibara Noto Sans JP", "Noto Sans JP", "Yu Gothic", "Meiryo", system-ui, sans-serif', size: 11 },
    plugins: {
      legend: {
        labels: { color: c.inkSoft, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: c.surface,
        titleColor: c.ink,
        bodyColor: c.inkSoft,
        borderColor: c.border,
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        cornerRadius: 8,
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 11 },
      },
    },
    scales: {
      x: {
        ticks: { color: c.inkMute, font: { size: 10 } },
        grid: { color: c.borderSoft, drawBorder: false },
      },
      y: {
        ticks: { color: c.inkMute, font: { size: 10 } },
        grid: { color: c.borderSoft, drawBorder: false },
        beginAtZero: true,
      },
    },
  };
}

function deepMerge(a, b) {
  if (!b) return a;
  const out = Array.isArray(a) ? [...a] : { ...a };
  for (const k of Object.keys(b)) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
      out[k] = deepMerge(a && a[k] ? a[k] : {}, b[k]);
    } else {
      out[k] = b[k];
    }
  }
  return out;
}

export function createChart(id, type, data, options = {}) {
  ensureChartJs()
    .then((ChartCtor) => {
      const canvas = document.getElementById(id);
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (charts.has(id)) {
        charts.get(id).destroy();
      }
      const merged = deepMerge(defaults(), options);
      merged.responsive = true;
      merged.maintainAspectRatio = false;
      const chart = new ChartCtor(ctx, { type, data, options: merged });
      charts.set(id, chart);
      return chart;
    })
    .catch(() => {
      const canvas = document.getElementById(id);
      if (canvas) canvas.replaceWith(document.createTextNode('グラフを読み込めませんでした'));
    });
  return null;
}

export function destroyChart(id) {
  if (charts.has(id)) {
    charts.get(id).destroy();
    charts.delete(id);
  }
}

export function destroyAllCharts() {
  for (const c of charts.values()) c.destroy();
  charts.clear();
}

let rerenderHandler = null;
export function onRerenderNeeded(fn) { rerenderHandler = fn; }

onThemeChange(() => {
  readCssVars();
  if (rerenderHandler) rerenderHandler();
});

export function chartCanvas(id, opts = {}) {
  const cls = opts.class || '';
  return `<div class="chart-wrap ${cls}"><canvas id="${id}"></canvas></div>`;
}
