#!/usr/bin/env node
// transform_ga_pairs.mjs v2 — handles bill_number + title in bills_json.
// No logic changes; the bills_json from BQ now carries bill_number and title
// and JSON.parse picks them up automatically.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DOWNLOADS = join(homedir(), 'Downloads');
const PAIRS_CSV = join(DOWNLOADS, 'ga_legislator_pairs.csv');
const OUTPUT_PATH = join(process.cwd(), 'src/data/states/ga/legislator_pairs.json');

if (!existsSync(PAIRS_CSV)) {
  console.error(`✗ Missing input: ${PAIRS_CSV}`);
  console.error('  Re-run 03_ga_legislator_pairs.sql in Metabase and save the CSV here.');
  process.exit(1);
}

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
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
      else if (c === '\r') { /* ignore */ }
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
  if (v == null || v === '') return 0;
  const cleaned = String(v).replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};
const bool = (v) => v === 'true' || v === 'TRUE' || v === true;

console.log(`Reading ${PAIRS_CSV}...`);
const text = readFileSync(PAIRS_CSV, 'utf8');
const rawRows = parseCSV(text);
console.log(`  ${rawRows.length.toLocaleString()} rows parsed`);

const sampleRow = rawRows[0] || {};
const hasNewSchema = 'total_shared' in sampleRow && 'bills_shared' in sampleRow;
if (!hasNewSchema) {
  console.error('✗ CSV appears to be from an OLD legislator pairs query.');
  console.error('  Re-run 03_ga_legislator_pairs.sql v4 in Metabase.');
  process.exit(1);
}

const legislators = {};
const pairs = [];
let sampleBillsLogged = false;

for (const r of rawRows) {
  const leg_a_id = num(r.leg_a_id);
  const leg_b_id = num(r.leg_b_id);
  if (!leg_a_id || !leg_b_id) continue;

  if (!legislators[leg_a_id]) {
    legislators[leg_a_id] = {
      id: leg_a_id,
      name: (r.leg_a_name || '').trim(),
      party: (r.leg_a_party || '').trim(),
    };
  }
  if (!legislators[leg_b_id]) {
    legislators[leg_b_id] = {
      id: leg_b_id,
      name: (r.leg_b_name || '').trim(),
      party: (r.leg_b_party || '').trim(),
    };
  }

  let bills = [];
  if (r.bills_json && r.bills_json.trim()) {
    try {
      bills = JSON.parse(r.bills_json);
      // Sanity log: confirm the new fields are present in the first parsed pair
      if (!sampleBillsLogged && bills.length > 0) {
        const sample = bills[0];
        const hasNumber = 'bill_number' in sample;
        const hasTitle = 'title' in sample;
        console.log(`  Sample bill: bill_number=${hasNumber ? 'YES' : 'NO'}, title=${hasTitle ? 'YES' : 'NO'}`);
        if (!hasNumber || !hasTitle) {
          console.warn('  ! bills_json is missing bill_number or title — re-run SQL v4 in Metabase');
        }
        sampleBillsLogged = true;
      }
    } catch (e) {
      console.warn(`! Pair ${leg_a_id}-${leg_b_id}: bills_json parse failed`);
    }
  }

  pairs.push({
    leg_a_id, leg_b_id,
    cross_party: bool(r.cross_party),
    total_shared: num(r.total_shared),
    total_passed: num(r.total_passed),
    total_a_primary: num(r.total_a_primary),
    total_b_primary: num(r.total_b_primary),
    total_both_co: num(r.total_both_co),
    bills_shared: num(r.bills_shared),
    bills_passed: num(r.bills_passed),
    bills_a_primary: num(r.bills_a_primary),
    bills_b_primary: num(r.bills_b_primary),
    bills_both_co: num(r.bills_both_co),
    resolutions_shared: num(r.resolutions_shared),
    bills,
  });
}

console.log(`  ${Object.keys(legislators).length} unique legislators`);
console.log(`  ${pairs.length.toLocaleString()} pairs`);

const BRIDGE_THRESHOLD = 10;
const bridgeStats = {};

for (const p of pairs) {
  if (!p.cross_party) continue;
  if (p.bills_shared < BRIDGE_THRESHOLD) continue;

  for (const [self, partner] of [[p.leg_a_id, p.leg_b_id], [p.leg_b_id, p.leg_a_id]]) {
    if (!bridgeStats[self]) {
      bridgeStats[self] = {
        id: self,
        cross_party_partners: 0,
        bills_with_partners: 0,
        partners: [],
      };
    }
    bridgeStats[self].cross_party_partners += 1;
    bridgeStats[self].bills_with_partners += p.bills_shared;
    bridgeStats[self].partners.push({
      partner_id: partner,
      partner_name: legislators[partner]?.name,
      partner_party: legislators[partner]?.party,
      bills_shared: p.bills_shared,
    });
  }
}

const allBridges = Object.values(bridgeStats).map((b) => ({
  ...b,
  name: legislators[b.id]?.name,
  party: legislators[b.id]?.party,
}));

const dems = allBridges
  .filter((b) => b.party === 'Democrat')
  .sort((a, b) => b.cross_party_partners - a.cross_party_partners ||
                  b.bills_with_partners - a.bills_with_partners)
  .slice(0, 10);

const reps = allBridges
  .filter((b) => b.party === 'Republican')
  .sort((a, b) => b.cross_party_partners - a.cross_party_partners ||
                  b.bills_with_partners - a.bills_with_partners)
  .slice(0, 10);

const featured = pairs
  .filter((p) => p.cross_party && (p.bills_a_primary + p.bills_b_primary) >= 3)
  .sort((a, b) => (b.bills_a_primary + b.bills_b_primary)
                  - (a.bills_a_primary + a.bills_b_primary)
                  || b.bills_shared - a.bills_shared)
  .slice(0, 5)
  .map((p) => ({
    leg_a_id: p.leg_a_id,
    leg_b_id: p.leg_b_id,
    leg_a_name: legislators[p.leg_a_id]?.name,
    leg_b_name: legislators[p.leg_b_id]?.name,
    leg_a_party: legislators[p.leg_a_id]?.party,
    leg_b_party: legislators[p.leg_b_id]?.party,
    bills_shared: p.bills_shared,
    bills_a_primary: p.bills_a_primary,
    bills_b_primary: p.bills_b_primary,
    bills_passed: p.bills_passed,
  }));

const stats = {
  total_pairs: pairs.length,
  cross_party_pairs: pairs.filter((p) => p.cross_party).length,
  pairs_with_real_authoring: pairs.filter((p) => p.bills_a_primary + p.bills_b_primary > 0).length,
  cross_party_with_real_authoring: pairs.filter((p) =>
    p.cross_party && p.bills_a_primary + p.bills_b_primary > 0).length,
};

for (const p of pairs) {
  p.lopsided_score = Math.abs(p.bills_a_primary - p.bills_b_primary);
}
const topLopsided = [...pairs]
  .filter((p) => (p.bills_a_primary + p.bills_b_primary) >= 5)
  .sort((a, b) => b.lopsided_score - a.lopsided_score)
  .slice(0, 20)
  .map((p) => ({
    leg_a_id: p.leg_a_id, leg_b_id: p.leg_b_id,
    bills_a_primary: p.bills_a_primary, bills_b_primary: p.bills_b_primary,
    bills_shared: p.bills_shared, lopsided_score: p.lopsided_score,
  }));

const output = {
  state: 'GA',
  session_id: 2167,
  session_label: '2025-2026 Regular Session',
  generated_at: new Date().toISOString(),
  legislators,
  pairs,
  bridges: {
    most_bipartisan_democrats: dems,
    most_bipartisan_republicans: reps,
    featured_pairs: featured,
  },
  lopsided_top_20: topLopsided,
  stats,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(output));
console.log(`✓ Wrote ${OUTPUT_PATH}`);
console.log(`  File size: ${(Buffer.byteLength(JSON.stringify(output)) / 1024).toFixed(1)} KB`);
console.log('');
console.log('=== STATS ===');
console.log(`  Total pairs:                       ${stats.total_pairs.toLocaleString()}`);
console.log(`  Cross-party pairs:                 ${stats.cross_party_pairs.toLocaleString()}`);
console.log(`  Pairs with real authoring:         ${stats.pairs_with_real_authoring.toLocaleString()}`);
console.log(`  Cross-party w/ real authoring:     ${stats.cross_party_with_real_authoring.toLocaleString()}`);
console.log('');
console.log('=== TOP BIPARTISAN DEMOCRATS ===');
dems.slice(0, 5).forEach((b, i) => {
  console.log(`  ${i + 1}. ${b.name} — ${b.cross_party_partners} cross-party partners, ${b.bills_with_partners} total bills`);
});
console.log('');
console.log('=== TOP BIPARTISAN REPUBLICANS ===');
reps.slice(0, 5).forEach((b, i) => {
  console.log(`  ${i + 1}. ${b.name} — ${b.cross_party_partners} cross-party partners, ${b.bills_with_partners} total bills`);
});
console.log('');
console.log('=== FEATURED CROSS-PARTY PAIRS (real authoring only) ===');
featured.forEach((f, i) => {
  console.log(`  ${i + 1}. ${f.leg_a_name} (${f.leg_a_party[0]}) ↔ ${f.leg_b_name} (${f.leg_b_party[0]}) — ${f.bills_shared} bills, ${f.bills_a_primary + f.bills_b_primary} authored`);
});
