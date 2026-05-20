#!/usr/bin/env node
// transform_ga.mjs v3
// ----------------------------------------------------------------------------
// CHANGES from v2:
//   - Handles BigQuery's CSV export quirk: numbers come back as strings with
//     thousands separators ("1,608" not "1608"). The num() helper now strips
//     commas before Number() conversion.
//
// Reads two CSVs from ~/Downloads and merges them into summary.json.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DOWNLOADS = join(homedir(), 'Downloads');
const FUNNEL_CSV = join(DOWNLOADS, 'ga_funnel.csv');
const HEADLINES_CSV = join(DOWNLOADS, 'ga_headlines.csv');
const SUMMARY_PATH = join(process.cwd(), 'src/data/states/ga/summary.json');

for (const [label, path] of [['funnel', FUNNEL_CSV], ['headlines', HEADLINES_CSV], ['summary', SUMMARY_PATH]]) {
  if (!existsSync(path)) {
    console.error(`✗ Missing ${label} file: ${path}`);
    process.exit(1);
  }
}

function parseCSV(text) {
  // Strip UTF-8 BOM if present (BigQuery sometimes prepends one)
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.trim().split(/\r?\n/);
  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
  });
}

function parseRow(line) {
  const out = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') inQuotes = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

// FIX: BigQuery exports "1,608" as a string. Strip commas before parsing.
const num = (v) => {
  if (v == null || v === '') return 0;
  const cleaned = String(v).replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v) => {
  if (v == null || v === '') return null;
  const cleaned = String(v).replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const funnelRows = parseCSV(readFileSync(FUNNEL_CSV, 'utf8'));
const headlineRows = parseCSV(readFileSync(HEADLINES_CSV, 'utf8'));
const summary = JSON.parse(readFileSync(SUMMARY_PATH, 'utf8'));

if (headlineRows.length !== 1) {
  console.warn(`! Headlines CSV had ${headlineRows.length} rows; expected 1. Using first.`);
}
const h = headlineRows[0];

summary.total_bills = num(h.total_bills);
summary.became_law = num(h.became_law);
summary.vetoed = num(h.vetoed);
summary.still_active = num(h.still_active);
summary.unique_sponsors = num(h.unique_sponsors);
if (h.recorded_votes != null && h.recorded_votes !== '') {
  summary.recorded_votes = num(h.recorded_votes);
}
if (h.consent_pct != null && h.consent_pct !== '') {
  summary.consent_pct = numOrNull(h.consent_pct);
}

const TYPE_ORDER = ['Bills', 'Resolutions', 'Joint Res.'];
const CHAMBER_ORDER = ['House', 'Senate'];

const grouped = {};

for (const row of funnelRows) {
  const chamber = row.chamber;
  const billType = row.bill_type;
  if (!CHAMBER_ORDER.includes(chamber) || !TYPE_ORDER.includes(billType)) continue;

  const counts = {
    introduced: num(row.introduced),
    stuck: num(row.stuck),
    engrossed: num(row.engrossed),
    passed: num(row.passed),
    vetoed: num(row.vetoed),
    override_passed: num(row.override_passed),
    still_active: num(row.still_active),
  };

  // Drop zero optional fields so the Sankey doesn't render empty branches
  for (const k of ['engrossed', 'vetoed', 'override_passed', 'still_active']) {
    if (counts[k] === 0) delete counts[k];
  }

  grouped[chamber] ??= {};
  grouped[chamber][billType] = counts;

  // Sanity check: every bill in `introduced` should be in exactly one bucket
  const total = num(row.stuck) + num(row.engrossed) + num(row.passed)
    + num(row.vetoed) + num(row.override_passed) + num(row.still_active) + num(row.other);
  const intro = num(row.introduced);
  if (Math.abs(total - intro) > 0) {
    console.warn(`! ${chamber}/${billType}: buckets sum to ${total} but introduced is ${intro} (other=${row.other})`);
  }
}

summary.funnel.tracks = CHAMBER_ORDER
  .filter((c) => grouped[c])
  .map((chamber) => ({
    chamber,
    rows: TYPE_ORDER
      .filter((t) => grouped[chamber]?.[t])
      .map((t) => ({ type: t, counts: grouped[chamber][t] })),
  }));

summary._meta = {
  ...(summary._meta || {}),
  generated_at: new Date().toISOString(),
  generated_by: 'scripts/transform_ga.mjs',
  data_source: 'BigQuery (analytics_stg) via Metabase: 01_ga_funnel.sql + 02_ga_headlines.sql',
  session_id: 2167,
};

writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
console.log(`✓ Updated ${SUMMARY_PATH}`);
console.log(`  total_bills:     ${summary.total_bills.toLocaleString()}`);
console.log(`  became_law:      ${summary.became_law.toLocaleString()}`);
console.log(`  vetoed:          ${summary.vetoed.toLocaleString()}`);
console.log(`  unique_sponsors: ${summary.unique_sponsors.toLocaleString()}`);
console.log(`  funnel tracks:   ${summary.funnel.tracks.length} chambers, ` +
  `${summary.funnel.tracks.reduce((a, t) => a + t.rows.length, 0)} type rows`);
