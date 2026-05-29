#!/usr/bin/env node
// transform_ga_timeline.mjs (v3)
// Reads ~/Downloads/ga_timeline.csv (Q11 v3.2 schema)
// Produces src/data/states/ga/timeline.json

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DOWNLOADS = join(homedir(), 'Downloads');
const CSV_PATH  = join(DOWNLOADS, 'ga_timeline.csv');
const OUT_DIR   = join(process.cwd(), 'src/data/states/ga');

const SEASONS = {
  2025: {
    session_begin: '2025-01-13',
    crossover:     '2025-03-06',
    adjournment:   '2025-04-04',
    chart_start:   '2025-01-01',
    chart_end:     '2025-05-31',
    bands: [
      { label: 'Pre-session',          start: '2025-01-01', end: '2025-01-12', color: 'rest' },
      { label: 'Introduction Rush',    start: '2025-01-13', end: '2025-01-26', color: 'intro' },
      { label: 'Committee Work',       start: '2025-01-27', end: '2025-02-27', color: 'committee' },
      { label: 'Crossover Crunch',     start: '2025-02-28', end: '2025-03-06', color: 'crunch' },
      { label: 'Cross-Chamber\nReview',start: '2025-03-07', end: '2025-03-21', color: 'review' },
      { label: 'Sine Die\nApproaching',start: '2025-03-22', end: '2025-04-04', color: 'crunch' },
      { label: 'Post-Session',         start: '2025-04-05', end: '2025-05-31', color: 'rest' },
    ],
  },
  2026: {
    session_begin: '2026-01-12',
    crossover:     '2026-03-06',
    adjournment:   '2026-04-06',
    chart_start:   '2026-01-01',
    chart_end:     '2026-05-31',
    bands: [
      { label: 'Pre-session',          start: '2026-01-01', end: '2026-01-11', color: 'rest' },
      { label: 'Introduction Rush',    start: '2026-01-12', end: '2026-01-25', color: 'intro' },
      { label: 'Committee Work',       start: '2026-01-26', end: '2026-02-27', color: 'committee' },
      { label: 'Crossover Crunch',     start: '2026-02-28', end: '2026-03-06', color: 'crunch' },
      { label: 'Cross-Chamber\nReview',start: '2026-03-07', end: '2026-03-23', color: 'review' },
      { label: 'Sine Die\nApproaching',start: '2026-03-24', end: '2026-04-06', color: 'crunch' },
      { label: 'Post-Session',         start: '2026-04-07', end: '2026-05-31', color: 'rest' },
    ],
  },
};

const METRICS = [
  'bills_introduced',
  'bills_floor_passed',
  'bills_became_law',
  'resolutions_introduced',
  'resolutions_adopted',
  'roll_call_votes',
];

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], cur = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === ',')   { row.push(cur); cur = ''; }
      else if (c === '"') inQuotes = true;
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  const headers = rows[0];
  return rows.slice(1)
    .filter((r) => r.length === headers.length)
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}

function parseDate(s) {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const months = { January:'01', February:'02', March:'03', April:'04', May:'05', June:'06',
                   July:'07', August:'08', September:'09', October:'10', November:'11', December:'12' };
  const m = s.match(/^(\w+)\s+(\d+),\s+(\d{4})$/);
  if (m) {
    const month = months[m[1]];
    if (!month) return null;
    return `${m[3]}-${month}-${String(m[2]).padStart(2, '0')}`;
  }
  return null;
}

const num = (v) => !v ? 0 : (parseInt(String(v).replace(/,/g, '').trim()) || 0);
const str = (v) => v == null ? '' : String(v).trim();

if (!existsSync(CSV_PATH)) {
  console.error(`✗ Missing: ${CSV_PATH}`);
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

console.log('Reading timeline CSV...');
const rawRows = parseCSV(readFileSync(CSV_PATH, 'utf8'));
console.log(`  ${rawRows.length} raw rows`);

const normalized = rawRows.map((r) => ({
  date: parseDate(r.activity_date),
  chamber: str(r.chamber),
  bills_introduced:        num(r.bills_introduced),
  bills_floor_passed:      num(r.bills_floor_passed),
  bills_became_law:        num(r.bills_became_law),
  resolutions_introduced:  num(r.resolutions_introduced),
  resolutions_adopted:     num(r.resolutions_adopted),
  roll_call_votes:         num(r.roll_call_votes),
})).filter((r) => r.date);

console.log(`  ${normalized.length} normalized rows`);

function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function emptyMetrics() {
  return Object.fromEntries(METRICS.map((m) => [m, 0]));
}

function buildYearData(year) {
  const season = SEASONS[year];
  const yearRows = normalized.filter((r) => r.date >= season.chart_start && r.date <= season.chart_end);

  const daily = {};
  for (const r of yearRows) {
    if (!daily[r.date]) {
      daily[r.date] = {
        date: r.date,
        house:  emptyMetrics(), senate: emptyMetrics(),
        other:  emptyMetrics(), total:  emptyMetrics(),
      };
    }
    const bucket = r.chamber === 'House' ? 'house'
                 : r.chamber === 'Senate' ? 'senate'
                 : 'other';
    for (const m of METRICS) {
      daily[r.date][bucket][m] += r[m];
      daily[r.date].total[m]   += r[m];
    }
  }

  // Fill zero-activity days for continuous lines
  const filled = [];
  const start = new Date(season.chart_start + 'T00:00:00');
  const end   = new Date(season.chart_end   + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().slice(0, 10);
    if (daily[dStr]) {
      filled.push(daily[dStr]);
    } else {
      filled.push({
        date: dStr,
        house: emptyMetrics(), senate: emptyMetrics(),
        other: emptyMetrics(), total: emptyMetrics(),
      });
    }
  }

  // Weekly bins
  const weeklyMap = {};
  for (const day of filled) {
    const wk = weekStart(day.date);
    if (!weeklyMap[wk]) {
      weeklyMap[wk] = {
        week_start: wk,
        house: emptyMetrics(), senate: emptyMetrics(),
        other: emptyMetrics(), total: emptyMetrics(),
      };
    }
    for (const ch of ['house','senate','other','total']) {
      for (const m of METRICS) weeklyMap[wk][ch][m] += day[ch][m];
    }
  }
  const weekly = Object.values(weeklyMap).sort((a,b) => a.week_start.localeCompare(b.week_start));

  // Totals + peaks per metric
  const totals = {};
  const peakDays = {};
  for (const m of METRICS) {
    totals[m] = filled.reduce((s,d) => s + d.total[m], 0);
    let max = 0, dt = null;
    for (const d of filled) if (d.total[m] > max) { max = d.total[m]; dt = d.date; }
    peakDays[m] = { date: dt, count: max };
  }

  // Top 5 days/weeks per metric
  const topDays = {};
  const topWeeks = {};
  for (const m of METRICS) {
    topDays[m] = [...filled]
      .filter((d) => d.total[m] > 0)
      .sort((a,b) => b.total[m] - a.total[m])
      .slice(0, 5)
      .map((d) => ({
        date: d.date, count: d.total[m],
        house: d.house[m], senate: d.senate[m],
      }));
    topWeeks[m] = [...weekly]
      .filter((w) => w.total[m] > 0)
      .sort((a,b) => b.total[m] - a.total[m])
      .slice(0, 5)
      .map((w) => ({
        week_start: w.week_start, count: w.total[m],
        house: w.house[m], senate: w.senate[m],
      }));
  }

  return {
    year, season,
    daily: filled, weekly,
    totals, peak_days: peakDays,
    top_days: topDays, top_weeks: topWeeks,
    active_days: filled.filter((d) => Object.values(d.total).some((v) => v > 0)).length,
  };
}

const output = {
  state: 'GA',
  session_id: 2167,
  session_label: '2025-2026 Regular Session',
  generated_at: new Date().toISOString(),
  metrics: METRICS,
  years: {
    2025: buildYearData(2025),
    2026: buildYearData(2026),
  },
};

writeFileSync(join(OUT_DIR, 'timeline.json'), JSON.stringify(output));
console.log(`  timeline.json: ${(Buffer.byteLength(JSON.stringify(output)) / 1024).toFixed(0)} KB`);

console.log('');
console.log('=== STATS ===');
for (const year of [2025, 2026]) {
  const y = output.years[year];
  console.log(`  ${year}: ${y.active_days} active days`);
  for (const m of METRICS) {
    console.log(`    ${m.padEnd(22)} ${y.totals[m].toLocaleString().padStart(6)}  peak: ${y.peak_days[m].date} (${y.peak_days[m].count})`);
  }
}
