#!/usr/bin/env node
// transform_ga_partisanship.mjs
// ----------------------------------------------------------------------------
// Reads two CSVs from ~/Downloads:
//   - ga_bill_partisanship.csv      (Q9: ~2,241 bills with bill_partisanship scores)
//   - ga_legislator_partisanship.csv (Q10 v3.1: ~242 legislators with BS and BV)
//
// Produces two JSON files in src/data/states/ga/:
//   - partisanship_overview.json (scorecard + notable lists)
//   - partisanship_bills.json    (per-bill scores, for legislator drill-down)
//
// Run from repo root:
//   node scripts/transform_ga_partisanship.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DOWNLOADS = join(homedir(), 'Downloads');
const BILL_CSV       = join(DOWNLOADS, 'ga_bill_partisanship.csv');
const LEGISLATOR_CSV = join(DOWNLOADS, 'ga_legislator_partisanship.csv');
const OUT_DIR        = join(process.cwd(), 'src/data/states/ga');

const PARTISAN_BILL_THRESHOLD = 0.3;
const SIGNIFICANT_GAP_THRESHOLD = 0.2;
const MIN_VOTES_FOR_BV = 50;

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
  if (v == null || v === '' || v === 'null') return null;
  const cleaned = String(v).replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};
const str = (v) => v == null ? '' : String(v).trim();

for (const path of [BILL_CSV, LEGISLATOR_CSV]) {
  if (!existsSync(path)) {
    console.error(`✗ Missing input: ${path}`);
    process.exit(1);
  }
}
mkdirSync(OUT_DIR, { recursive: true });

console.log('Reading CSVs...');
const billData = parseCSV(readFileSync(BILL_CSV, 'utf8'));
const legData  = parseCSV(readFileSync(LEGISLATOR_CSV, 'utf8'));
console.log(`  ${billData.length.toLocaleString()} bills`);
console.log(`  ${legData.length} legislators`);

// ---------------------------------------------------------------------------
// Build bill index
// ---------------------------------------------------------------------------
const billsById = {};
for (const r of billData) {
  const billId = num(r.bill_id);
  if (billId == null) continue;
  billsById[billId] = {
    bill_id: billId,
    bill_number: str(r.bill_number),
    title: str(r.title),
    status_id: num(r.status_id),
    primary_party: str(r.primary_party),
    gop_cosponsors: num(r.gop_cosponsors) || 0,
    dem_cosponsors: num(r.dem_cosponsors) || 0,
    total_cosponsors: num(r.total_cosponsors) || 0,
    dem_yea: num(r.dem_yea) || 0,
    dem_nay: num(r.dem_nay) || 0,
    gop_yea: num(r.gop_yea) || 0,
    gop_nay: num(r.gop_nay) || 0,
    pre_score: num(r.pre_score),
    post_score: num(r.post_score),
    bill_partisanship: num(r.bill_partisanship),
    partisanship_magnitude: num(r.partisanship_magnitude),
    has_contested_vote: r.has_contested_vote === 'true',
  };
}

// Bill distribution buckets
const billBuckets = {
  strong_dem: 0, lean_dem: 0, bipartisan: 0, lean_rep: 0, strong_rep: 0
};
for (const b of Object.values(billsById)) {
  const s = b.bill_partisanship;
  if (s == null) continue;
  if (s <= -0.7) billBuckets.strong_dem++;
  else if (s <= -0.3) billBuckets.lean_dem++;
  else if (s < 0.3) billBuckets.bipartisan++;
  else if (s < 0.7) billBuckets.lean_rep++;
  else billBuckets.strong_rep++;
}

// ---------------------------------------------------------------------------
// Build legislator index
// ---------------------------------------------------------------------------
const legislators = [];
for (const r of legData) {
  const pid = num(r.people_id);
  const bsScore = num(r.bs_score);
  const bvScore = num(r.bv_score);
  const partisanVotes = num(r.bv_partisan_votes) || 0;
  const defections = num(r.bv_defections) || 0;

  const leg = {
    id: pid,
    name: str(r.legislator_name),
    party: str(r.party),
    chamber: str(r.chamber),
    district: str(r.district),
    bs_score: bsScore,
    bs_bill_count: num(r.bs_bill_count) || 0,
    bs_total_weight: num(r.bs_total_weight) || 0,
    bv_score: bvScore,
    bv_partisan_votes: partisanVotes,
    bv_defections: defections,
    bv_defection_pct: partisanVotes > 0 ? Math.round(defections / partisanVotes * 1000) / 10 : 0,
    bv_party_baseline: num(r.bv_party_baseline),
    bv_minus_bs_gap: num(r.bv_minus_bs_gap),
    has_valid_bv: partisanVotes >= MIN_VOTES_FOR_BV,
  };
  legislators.push(leg);
}

// Sort legislators alphabetically by default
legislators.sort((a, b) => a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Notable: Crossover Dems and Reps (anyone meaningfully pulled from baseline)
// ---------------------------------------------------------------------------
const baselines = {
  Democrat: num(legData[0]?.bv_party_baseline) || -0.76,
  Republican: legislators.find((l) => l.party === 'Republican')?.bv_party_baseline || 0.78,
};
// Pull baselines from actual data more carefully
for (const l of legislators) {
  if (l.bv_party_baseline != null) {
    baselines[l.party] = l.bv_party_baseline;
  }
}

// "Pulled toward center" — Dems whose BV is significantly above Dem baseline
//                        OR Reps whose BV is significantly below GOP baseline
const dems = legislators.filter((l) => l.party === 'Democrat' && l.has_valid_bv && l.bv_score != null);
const reps = legislators.filter((l) => l.party === 'Republican' && l.has_valid_bv && l.bv_score != null);

// Pulled-toward-center Dems (less Democrat-acting than expected by BV)
const crossoverDems = [...dems]
  .filter((l) => l.bv_score - baselines.Democrat >= 0.05)
  .sort((a, b) => b.bv_score - a.bv_score)
  .slice(0, 20);

// Pulled-toward-center Reps (less Republican-acting than expected by BV)
const crossoverReps = [...reps]
  .filter((l) => baselines.Republican - l.bv_score >= 0.05)
  .sort((a, b) => a.bv_score - b.bv_score)
  .slice(0, 20);

// Most disciplined (smallest deviation from baseline) — interesting in a "lockstep" way
const mostDisciplinedDems = [...dems]
  .filter((l) => l.bv_defection_pct < 5)
  .sort((a, b) => b.bv_partisan_votes - a.bv_partisan_votes)
  .slice(0, 10);
const mostDisciplinedReps = [...reps]
  .filter((l) => l.bv_defection_pct < 5)
  .sort((a, b) => b.bv_partisan_votes - a.bv_partisan_votes)
  .slice(0, 10);

// BS-BV gap: sponsors and votes mismatch
// Positive gap (bv > bs) = votes more partisan than they sponsor, or sponsors moderate but votes party-line
// Negative gap (bv < bs) = sponsors partisan but votes more moderate, or sponsors moderate but votes party-line opposite
const significantGaps = legislators
  .filter((l) => l.bs_score != null && l.bv_score != null
              && l.has_valid_bv
              && Math.abs(l.bv_minus_bs_gap) >= SIGNIFICANT_GAP_THRESHOLD)
  .sort((a, b) => Math.abs(b.bv_minus_bs_gap) - Math.abs(a.bv_minus_bs_gap))
  .slice(0, 20);

// BS extremes
const mostPartisanBSDems = [...dems]
  .filter((l) => l.bs_score != null)
  .sort((a, b) => a.bs_score - b.bs_score)
  .slice(0, 10);
const mostPartisanBSReps = [...reps]
  .filter((l) => l.bs_score != null)
  .sort((a, b) => b.bs_score - a.bs_score)
  .slice(0, 10);

// Least partisan BS (sponsors crossover bills)
const leastPartisanBSDems = [...dems]
  .filter((l) => l.bs_score != null)
  .sort((a, b) => b.bs_score - a.bs_score)
  .slice(0, 10);
const leastPartisanBSReps = [...reps]
  .filter((l) => l.bs_score != null)
  .sort((a, b) => a.bs_score - b.bs_score)
  .slice(0, 10);

// ---------------------------------------------------------------------------
// Sort bills by partisanship for "most partisan bills" display
// ---------------------------------------------------------------------------
const allBills = Object.values(billsById).filter((b) => b.bill_partisanship != null);
const sortedBills = [...allBills].sort((a, b) => b.bill_partisanship - a.bill_partisanship);

const mostPartisanRepBills = sortedBills.slice(0, 20);
const mostPartisanDemBills = sortedBills.slice(-20).reverse();
const mostBipartisanBills = [...allBills]
  .filter((b) => Math.abs(b.bill_partisanship) < 0.3)
  .sort((a, b) => Math.abs(a.bill_partisanship) - Math.abs(b.bill_partisanship))
  .slice(0, 20);

// ---------------------------------------------------------------------------
// Output files
// ---------------------------------------------------------------------------
const overviewOut = {
  state: 'GA',
  session_id: 2167,
  session_label: '2025-2026 Regular Session',
  generated_at: new Date().toISOString(),
  baselines,
  stats: {
    total_legislators: legislators.length,
    total_bills_scored: allBills.length,
    bill_distribution: billBuckets,
    bill_distribution_pct: Object.fromEntries(
      Object.entries(billBuckets).map(([k, v]) =>
        [k, Math.round(v / allBills.length * 1000) / 10])
    ),
    avg_bs_dem: dems.length > 0 ? round4(dems.reduce((s, l) => s + (l.bs_score || 0), 0) / dems.length) : null,
    avg_bs_rep: reps.length > 0 ? round4(reps.reduce((s, l) => s + (l.bs_score || 0), 0) / reps.length) : null,
    avg_bv_dem: dems.length > 0 ? round4(dems.reduce((s, l) => s + (l.bv_score || 0), 0) / dems.length) : null,
    avg_bv_rep: reps.length > 0 ? round4(reps.reduce((s, l) => s + (l.bv_score || 0), 0) / reps.length) : null,
  },
  legislators,  // for the scorecard table
  notable: {
    crossover_dems: crossoverDems,
    crossover_reps: crossoverReps,
    most_disciplined_dems: mostDisciplinedDems,
    most_disciplined_reps: mostDisciplinedReps,
    significant_gaps: significantGaps,
    most_partisan_bs_dems: mostPartisanBSDems,
    most_partisan_bs_reps: mostPartisanBSReps,
    least_partisan_bs_dems: leastPartisanBSDems,
    least_partisan_bs_reps: leastPartisanBSReps,
    most_partisan_rep_bills: mostPartisanRepBills,
    most_partisan_dem_bills: mostPartisanDemBills,
    most_bipartisan_bills: mostBipartisanBills,
  },
  thresholds: {
    partisan_bill_threshold: PARTISAN_BILL_THRESHOLD,
    significant_gap_threshold: SIGNIFICANT_GAP_THRESHOLD,
    min_votes_for_bv: MIN_VOTES_FOR_BV,
    primary_weight: 0.65,
    pre_weight: 0.60,
  },
};

writeFileSync(join(OUT_DIR, 'partisanship_overview.json'), JSON.stringify(overviewOut));
console.log(`  partisanship_overview.json: ${(Buffer.byteLength(JSON.stringify(overviewOut)) / 1024).toFixed(0)} KB`);

// Per-bill scores (for drill-down)
const billsOut = {
  state: 'GA',
  session_id: 2167,
  generated_at: new Date().toISOString(),
  bills: allBills,
};
writeFileSync(join(OUT_DIR, 'partisanship_bills.json'), JSON.stringify(billsOut));
console.log(`  partisanship_bills.json: ${(Buffer.byteLength(JSON.stringify(billsOut)) / 1024).toFixed(0)} KB`);

function round4(n) { return Math.round(n * 10000) / 10000; }

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('');
console.log('=== STATS ===');
console.log(`  Legislators:                ${legislators.length}`);
console.log(`  Bills scored:               ${allBills.length}`);
console.log(`  Party baselines:            Dem ${baselines.Democrat?.toFixed(2)}  Rep ${baselines.Republican?.toFixed(2)}`);
console.log('');
console.log('=== BILL DISTRIBUTION ===');
const total = allBills.length;
console.log(`  Strong Dem (-1 to -0.7):     ${billBuckets.strong_dem} (${(billBuckets.strong_dem/total*100).toFixed(1)}%)`);
console.log(`  Lean Dem (-0.7 to -0.3):     ${billBuckets.lean_dem} (${(billBuckets.lean_dem/total*100).toFixed(1)}%)`);
console.log(`  Bipartisan (-0.3 to +0.3):   ${billBuckets.bipartisan} (${(billBuckets.bipartisan/total*100).toFixed(1)}%)`);
console.log(`  Lean Rep (+0.3 to +0.7):     ${billBuckets.lean_rep} (${(billBuckets.lean_rep/total*100).toFixed(1)}%)`);
console.log(`  Strong Rep (+0.7 to +1):     ${billBuckets.strong_rep} (${(billBuckets.strong_rep/total*100).toFixed(1)}%)`);
console.log('');
console.log('=== CROSSOVER PATTERNS ===');
console.log(`  Dems pulled above baseline:  ${crossoverDems.length}`);
console.log(`  Reps pulled below baseline:  ${crossoverReps.length}`);
console.log(`  Significant BS-BV gaps:      ${significantGaps.length}`);
console.log('');
console.log('=== TOP 5 PULLED-TOWARD-CENTER REPUBLICANS (least Republican-acting by BV) ===');
crossoverReps.slice(0, 5).forEach((l) => {
  console.log(`  ${l.name.padEnd(22)} BV=${(l.bv_score).toFixed(2).padStart(6)}  BS=${(l.bs_score).toFixed(2).padStart(6)}  defects=${l.bv_defections}/${l.bv_partisan_votes} (${l.bv_defection_pct}%)`);
});
console.log('');
console.log('=== TOP 5 PULLED-TOWARD-CENTER DEMOCRATS (least Democrat-acting by BV) ===');
crossoverDems.slice(0, 5).forEach((l) => {
  console.log(`  ${l.name.padEnd(22)} BV=${(l.bv_score).toFixed(2).padStart(6)}  BS=${(l.bs_score).toFixed(2).padStart(6)}  defects=${l.bv_defections}/${l.bv_partisan_votes} (${l.bv_defection_pct}%)`);
});
console.log('');
console.log('=== TOP 5 SIGNIFICANT BS-BV GAPS (sponsorship vs voting mismatch) ===');
significantGaps.slice(0, 5).forEach((l) => {
  console.log(`  ${l.name.padEnd(22)} ${l.party[0]}/${l.chamber[0]}  BV=${(l.bv_score).toFixed(2).padStart(6)}  BS=${(l.bs_score).toFixed(2).padStart(6)}  gap=${(l.bv_minus_bs_gap).toFixed(2)}`);
});
