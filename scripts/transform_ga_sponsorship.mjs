#!/usr/bin/env node
// transform_ga_sponsorship.mjs (v2)
// V2 CHANGES:
//   - Reads cosponsor_bills_passed, cosponsor_bills_engrossed_plus from Q8 v2
//   - Uses term "primary" in console output (data keys stay "lead" for SQL compat)
//   - Sponsorship_legislator_detail unchanged structure
//
// Run from repo root:
//   node scripts/transform_ga_sponsorship.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DOWNLOADS = join(homedir(), 'Downloads');
const ROWS_CSV       = join(DOWNLOADS, 'ga_sponsorship_rows.csv');
const LEGISLATOR_CSV = join(DOWNLOADS, 'ga_sponsorship_legislator.csv');
const OUT_DIR        = join(process.cwd(), 'src/data/states/ga');

const PASSAGE_RATE_VOLUME_FLOOR = 10;
const LONE_WOLF_MIN_PASSED = 1;
const NAME_ATTACHER_MIN_COSPONSOR = 50;
const NAME_ATTACHER_MIN_RATIO = 20;  // cosponsor:lead ratio threshold

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

const num = (v) => {
  if (v == null || v === '' || v === 'null') return 0;
  const cleaned = String(v).replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};
const str = (v) => v == null ? '' : String(v).trim();
const bool = (v) => v === 'true' || v === 'TRUE' || v === true;

for (const path of [ROWS_CSV, LEGISLATOR_CSV]) {
  if (!existsSync(path)) {
    console.error(`✗ Missing input: ${path}`);
    process.exit(1);
  }
}
mkdirSync(OUT_DIR, { recursive: true });

console.log('Reading CSVs...');
const rowsData = parseCSV(readFileSync(ROWS_CSV, 'utf8'));
const legData  = parseCSV(readFileSync(LEGISLATOR_CSV, 'utf8'));
console.log(`  ${rowsData.length.toLocaleString()} sponsorship rows`);
console.log(`  ${legData.length} legislators`);

const legislatorsById = {};
for (const r of legData) {
  const pid = num(r.people_id);
  legislatorsById[pid] = {
    id: pid,
    name: str(r.legislator_name),
    party: str(r.party),
    chamber: str(r.chamber),
    district: str(r.district),

    lead_count_bills: num(r.lead_count_bills),
    cosponsor_count_bills: num(r.cosponsor_count_bills),
    total_sponsored_bills: num(r.total_sponsored_bills),
    lead_count_res: num(r.lead_count_res),
    cosponsor_count_res: num(r.cosponsor_count_res),
    total_sponsored_res: num(r.total_sponsored_res),
    joint_count: num(r.joint_count),

    lead_bills_introduced: num(r.lead_bills_introduced),
    lead_bills_engrossed_only: num(r.lead_bills_engrossed_only),
    lead_bills_enrolled: num(r.lead_bills_enrolled),
    lead_bills_passed: num(r.lead_bills_passed),
    lead_bills_vetoed: num(r.lead_bills_vetoed),
    lead_bills_failed: num(r.lead_bills_failed),
    lead_bills_engrossed_plus: num(r.lead_bills_engrossed_plus),
    passage_rate_bills_pct: parseFloat(r.passage_rate_bills_pct) || 0,
    engrossed_rate_bills_pct: parseFloat(r.engrossed_rate_bills_pct) || 0,

    // NEW v2: cosponsor success
    cosponsor_bills_passed: num(r.cosponsor_bills_passed),
    cosponsor_bills_engrossed_plus: num(r.cosponsor_bills_engrossed_plus),

    lead_res_passed: num(r.lead_res_passed),
    lead_res_engrossed_plus: num(r.lead_res_engrossed_plus),
    passage_rate_res_pct: parseFloat(r.passage_rate_res_pct) || 0,

    avg_cosponsors_when_lead: parseFloat(r.avg_cosponsors_when_lead) || 0,
    lone_wolf_lead_bills: num(r.lone_wolf_lead_bills),
    lone_wolf_passed: num(r.lone_wolf_passed),

    bills_led: [],
    bills_cosponsored: [],
  };
}

console.log('Building per-legislator bill lists...');

const rowsByBill = {};
const billMetadata = {};
for (const r of rowsData) {
  const billId = num(r.bill_id);
  if (!rowsByBill[billId]) rowsByBill[billId] = [];
  rowsByBill[billId].push(r);

  if (!billMetadata[billId]) {
    billMetadata[billId] = {
      bill_id: billId,
      bill_number: str(r.bill_number),
      title: str(r.title),
      bill_class: str(r.bill_class),
      status_id: num(r.status_id),
      outcome: str(r.outcome),
      is_constitutional_amendment: bool(r.is_constitutional_amendment),
    };
  }
}

const cosponsorCountByBill = {};
for (const billId in rowsByBill) {
  cosponsorCountByBill[billId] = rowsByBill[billId].filter((r) =>
    str(r.sponsor_role) === 'cosponsor'
  ).length;
}

for (const r of rowsData) {
  const pid = num(r.people_id);
  const billId = num(r.bill_id);
  const role = str(r.sponsor_role);

  if (!legislatorsById[pid]) continue;

  const meta = billMetadata[billId];
  const billRecord = {
    bill_id: billId,
    bill_number: meta.bill_number,
    title: meta.title,
    bill_class: meta.bill_class,
    outcome: meta.outcome,
    status_id: meta.status_id,
    is_constitutional_amendment: meta.is_constitutional_amendment,
    cosponsor_count: cosponsorCountByBill[billId] || 0,
    sponsor_order: num(r.sponsor_order),
  };

  if (role === 'lead') {
    legislatorsById[pid].bills_led.push(billRecord);
  } else if (role === 'cosponsor') {
    legislatorsById[pid].bills_cosponsored.push(billRecord);
  }
}

const sortBills = (a, b) => {
  if (a.bill_class !== b.bill_class) {
    return a.bill_class === 'bill' ? -1 : 1;
  }
  const rank = { passed: 6, enrolled: 5, vetoed: 4, engrossed: 3, failed: 2, introduced: 1, other: 0 };
  const aRank = rank[a.outcome] ?? 0;
  const bRank = rank[b.outcome] ?? 0;
  if (aRank !== bRank) return bRank - aRank;
  return a.bill_number.localeCompare(b.bill_number, undefined, { numeric: true });
};

for (const pid in legislatorsById) {
  legislatorsById[pid].bills_led.sort(sortBills);
  legislatorsById[pid].bills_cosponsored.sort(sortBills);
}

console.log('Computing Notable Sponsorship leaderboards...');

const allLegislators = Object.values(legislatorsById);

const mostProlificLeaders = [...allLegislators]
  .filter((l) => l.lead_count_bills > 0)
  .sort((a, b) => b.lead_count_bills - a.lead_count_bills)
  .slice(0, 15)
  .map(slim);

const mostProlificCosponsors = [...allLegislators]
  .filter((l) => l.cosponsor_count_bills > 0)
  .sort((a, b) => b.cosponsor_count_bills - a.cosponsor_count_bills)
  .slice(0, 15)
  .map(slim);

const highestPassageRate = [...allLegislators]
  .filter((l) => l.lead_count_bills >= PASSAGE_RATE_VOLUME_FLOOR)
  .sort((a, b) => b.passage_rate_bills_pct - a.passage_rate_bills_pct)
  .slice(0, 15)
  .map(slim);

const highestEngrossedRate = [...allLegislators]
  .filter((l) => l.lead_count_bills >= PASSAGE_RATE_VOLUME_FLOOR)
  .sort((a, b) => b.engrossed_rate_bills_pct - a.engrossed_rate_bills_pct)
  .slice(0, 15)
  .map(slim);

const loneWolves = [...allLegislators]
  .filter((l) => l.lone_wolf_passed >= LONE_WOLF_MIN_PASSED)
  .sort((a, b) => b.lone_wolf_passed - a.lone_wolf_passed
                 || b.lone_wolf_lead_bills - a.lone_wolf_lead_bills)
  .slice(0, 15)
  .map((l) => ({
    ...slim(l),
    lone_wolf_passed: l.lone_wolf_passed,
    lone_wolf_lead_bills: l.lone_wolf_lead_bills,
  }));

const nameAttachers = [...allLegislators]
  .filter((l) => {
    if (l.cosponsor_count_bills < NAME_ATTACHER_MIN_COSPONSOR) return false;
    const ratio = l.cosponsor_count_bills / Math.max(l.lead_count_bills, 1);
    return ratio >= NAME_ATTACHER_MIN_RATIO;
  })
  .sort((a, b) => {
    const ratioA = a.cosponsor_count_bills / Math.max(a.lead_count_bills, 1);
    const ratioB = b.cosponsor_count_bills / Math.max(b.lead_count_bills, 1);
    return ratioB - ratioA;  // sort by ratio desc — most extreme attachers first
  })
  .slice(0, 15)
  .map((l) => ({
    ...slim(l),
    cosponsor_count_bills: l.cosponsor_count_bills,
    lead_count_bills: l.lead_count_bills,
    ratio: l.cosponsor_count_bills / Math.max(l.lead_count_bills, 1),
  }));

const workhorses = [...allLegislators]
  .map((l) => ({ ...l, workhorse_score: l.lead_count_bills * 3 + l.cosponsor_count_bills }))
  .sort((a, b) => b.workhorse_score - a.workhorse_score)
  .slice(0, 15)
  .map((l) => ({
    ...slim(l),
    workhorse_score: l.workhorse_score,
  }));

function slim(l) {
  return {
    id: l.id,
    name: l.name,
    party: l.party,
    chamber: l.chamber,
    district: l.district,
    lead_count_bills: l.lead_count_bills,
    cosponsor_count_bills: l.cosponsor_count_bills,
    lead_bills_passed: l.lead_bills_passed,
    lead_bills_engrossed_plus: l.lead_bills_engrossed_plus,
    passage_rate_bills_pct: l.passage_rate_bills_pct,
    engrossed_rate_bills_pct: l.engrossed_rate_bills_pct,
    avg_cosponsors_when_lead: l.avg_cosponsors_when_lead,
    cosponsor_bills_passed: l.cosponsor_bills_passed,
    cosponsor_bills_engrossed_plus: l.cosponsor_bills_engrossed_plus,
  };
}

const overviewOut = {
  state: 'GA',
  session_id: 2167,
  session_label: '2025-2026 Regular Session',
  generated_at: new Date().toISOString(),
  stats: {
    total_legislators: allLegislators.length,
    total_bills_led: allLegislators.reduce((s, l) => s + l.lead_count_bills, 0),
    total_bills_cosponsored: allLegislators.reduce((s, l) => s + l.cosponsor_count_bills, 0),
    total_resolutions_led: allLegislators.reduce((s, l) => s + l.lead_count_res, 0),
  },
  legislators: allLegislators.map((l) => {
    const { bills_led, bills_cosponsored, ...rest } = l;
    return rest;
  }),
};
writeFileSync(join(OUT_DIR, 'sponsorship_overview.json'), JSON.stringify(overviewOut));
console.log(`  sponsorship_overview.json: ${(Buffer.byteLength(JSON.stringify(overviewOut)) / 1024).toFixed(0)} KB`);

const notableOut = {
  state: 'GA',
  session_id: 2167,
  generated_at: new Date().toISOString(),
  thresholds: {
    passage_rate_volume_floor: PASSAGE_RATE_VOLUME_FLOOR,
    name_attacher_min_cosponsor: NAME_ATTACHER_MIN_COSPONSOR,
    name_attacher_min_ratio: NAME_ATTACHER_MIN_RATIO,
  },
  leaderboards: {
    most_prolific_leaders: mostProlificLeaders,
    most_prolific_cosponsors: mostProlificCosponsors,
    highest_passage_rate: highestPassageRate,
    highest_engrossed_rate: highestEngrossedRate,
    lone_wolves: loneWolves,
    name_attachers: nameAttachers,
    workhorses: workhorses,
  },
};
writeFileSync(join(OUT_DIR, 'sponsorship_notable.json'), JSON.stringify(notableOut));
console.log(`  sponsorship_notable.json: ${(Buffer.byteLength(JSON.stringify(notableOut)) / 1024).toFixed(0)} KB`);

const detailOut = {
  state: 'GA',
  session_id: 2167,
  generated_at: new Date().toISOString(),
  legislators: allLegislators.map((l) => ({
    id: l.id,
    name: l.name,
    party: l.party,
    chamber: l.chamber,
    district: l.district,
    summary: {
      lead_count_bills: l.lead_count_bills,
      cosponsor_count_bills: l.cosponsor_count_bills,
      lead_count_res: l.lead_count_res,
      cosponsor_count_res: l.cosponsor_count_res,
      joint_count: l.joint_count,
      lead_bills_passed: l.lead_bills_passed,
      lead_bills_engrossed_plus: l.lead_bills_engrossed_plus,
      lead_bills_introduced: l.lead_bills_introduced,
      lead_bills_failed: l.lead_bills_failed,
      passage_rate_bills_pct: l.passage_rate_bills_pct,
      engrossed_rate_bills_pct: l.engrossed_rate_bills_pct,
      avg_cosponsors_when_lead: l.avg_cosponsors_when_lead,
      lone_wolf_lead_bills: l.lone_wolf_lead_bills,
      lone_wolf_passed: l.lone_wolf_passed,
      cosponsor_bills_passed: l.cosponsor_bills_passed,
      cosponsor_bills_engrossed_plus: l.cosponsor_bills_engrossed_plus,
    },
    bills_led: l.bills_led,
    bills_cosponsored: l.bills_cosponsored,
  })),
};
writeFileSync(join(OUT_DIR, 'sponsorship_legislator_detail.json'), JSON.stringify(detailOut));
console.log(`  sponsorship_legislator_detail.json: ${(Buffer.byteLength(JSON.stringify(detailOut)) / 1024).toFixed(0)} KB`);

console.log('');
console.log('=== STATS ===');
console.log(`  Legislators:              ${allLegislators.length}`);
console.log(`  Total bills primary-led:  ${overviewOut.stats.total_bills_led.toLocaleString()}`);
console.log(`  Total bills cosponsored:  ${overviewOut.stats.total_bills_cosponsored.toLocaleString()}`);
console.log(`  Total resolutions led:    ${overviewOut.stats.total_resolutions_led.toLocaleString()}`);
console.log('');
console.log('=== TOP 5 MOST PROLIFIC PRIMARY SPONSORS ===');
mostProlificLeaders.slice(0, 5).forEach((l, i) => {
  console.log(`  ${i+1}. ${l.name.padEnd(22)} (${l.party[0]}, ${l.chamber.padEnd(6)}) — ${l.lead_count_bills} primary, ${l.lead_bills_passed} passed (${l.passage_rate_bills_pct}%), ${l.cosponsor_bills_passed} cosp-passed`);
});
console.log('');
console.log(`=== TOP 5 HIGHEST PASSAGE RATE (>=${PASSAGE_RATE_VOLUME_FLOOR} primary) ===`);
highestPassageRate.slice(0, 5).forEach((l, i) => {
  console.log(`  ${i+1}. ${l.name.padEnd(22)} (${l.party[0]}, ${l.chamber.padEnd(6)}) — ${l.passage_rate_bills_pct}% (${l.lead_bills_passed}/${l.lead_count_bills})`);
});
console.log('');
console.log(`=== LONE WOLVES ===`);
console.log(`  ${loneWolves.length} legislators qualified`);
console.log('');
console.log(`=== NAME-ATTACHERS ===`);
console.log(`  ${nameAttachers.length} legislators qualified`);
