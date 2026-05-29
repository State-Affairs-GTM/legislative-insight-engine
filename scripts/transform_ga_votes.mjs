#!/usr/bin/env node
// transform_ga_votes.mjs  (v2 — post-Beau-Evans-feedback)
// ----------------------------------------------------------------------------
// Reads three CSVs from ~/Downloads:
//   - ga_votes_overview.csv      (Q4 v2: now includes vote_category, effectively_passed, is_constitutional_amendment)
//   - ga_votes_member_detail.csv (Q5: ~280K rows, unchanged)
//   - ga_voting_record.csv       (Q6 v3: dual headline + per-category defection metrics)
//
// Produces three JSON files in src/data/states/ga/:
//   - votes_overview.json     (Browse + Notable tabs)
//   - votes_legislators.json  (By Legislator tab + leaderboards)
//   - votes_members.json      (Per-vote member lookups for drill-down)
//
// CHANGES FROM V1:
//   - Every vote now has a `vote_category` field
//   - Notable Votes filters use effectively_passed and exclude amendment/procedural
//   - Each defection in a legislator's drill-down is tagged with its vote_category
//   - New Notable Votes sub-category: 'constitutional_amendments_failed_supermajority'
//   - Closeness scoring computed over substantive votes only (procedural closeness was noise)
//
// Run from repo root:
//   node scripts/transform_ga_votes.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DOWNLOADS = join(homedir(), 'Downloads');
const OVERVIEW_CSV  = join(DOWNLOADS, 'ga_votes_overview.csv');
const MEMBERS_CSV   = join(DOWNLOADS, 'ga_votes_member_detail.csv');
const RECORD_CSV    = join(DOWNLOADS, 'ga_voting_record.csv');
const OUT_DIR       = join(process.cwd(), 'src/data/states/ga');

const ACTIVE_MIN_VOTES = 100;
const ACTIVE_MAX_NONVOTE_PCT = 95;

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields, escaped quotes, BOM)
// ---------------------------------------------------------------------------
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
const bool = (v) => v === 'true' || v === 'TRUE' || v === true;
const str = (v) => v == null ? '' : String(v).trim();

// ---------------------------------------------------------------------------
// VERIFY INPUTS
// ---------------------------------------------------------------------------
for (const path of [OVERVIEW_CSV, MEMBERS_CSV, RECORD_CSV]) {
  if (!existsSync(path)) {
    console.error(`✗ Missing input: ${path}`);
    console.error('  All three CSVs must be in ~/Downloads with these exact names:');
    console.error('    ga_votes_overview.csv');
    console.error('    ga_votes_member_detail.csv');
    console.error('    ga_voting_record.csv');
    process.exit(1);
  }
}
mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// PARSE INPUTS
// ---------------------------------------------------------------------------
console.log('Reading CSVs...');
const overviewRows = parseCSV(readFileSync(OVERVIEW_CSV, 'utf8'));
const memberRows   = parseCSV(readFileSync(MEMBERS_CSV, 'utf8'));
const recordRows   = parseCSV(readFileSync(RECORD_CSV, 'utf8'));
console.log(`  ${overviewRows.length.toLocaleString()} votes`);
console.log(`  ${memberRows.length.toLocaleString()} member-vote rows`);
console.log(`  ${recordRows.length.toLocaleString()} legislator records`);

// ---------------------------------------------------------------------------
// BUILD: vote index + bill→votes timeline
// ---------------------------------------------------------------------------
const votesByVoteId = {};
const billToVotes = {};

for (const r of overviewRows) {
  const bvid = num(r.bill_vote_id);
  const billId = num(r.bill_id);
  const vote = {
    bill_vote_id: bvid,
    bill_id: billId,
    roll_call_id: num(r.roll_call_id),
    chamber: num(r.chamber_id) === 29 ? 'House' : num(r.chamber_id) === 30 ? 'Senate' : 'Other',
    vote_date: str(r.vote_date),
    vote_desc: str(r.vote_desc),
    vote_category: str(r.vote_category) || 'other',
    bill_number: str(r.bill_number),
    title: str(r.title),
    bill_class: str(r.bill_class),
    bill_type_id: num(r.bill_type_id),
    status_id: num(r.status_id),
    is_constitutional_amendment: bool(r.is_constitutional_amendment),
    yea: num(r.yea), nay: num(r.nay), nv: num(r.nv), absent: num(r.absent), total: num(r.total),
    passed_raw: bool(r.passed_raw),
    effectively_passed: bool(r.effectively_passed),
    required_threshold: parseFloat(r.required_threshold) || 0.5,
    yea_dem: num(r.yea_dem), nay_dem: num(r.nay_dem), abs_dem: num(r.abs_dem),
    yea_gop: num(r.yea_gop), nay_gop: num(r.nay_gop), abs_gop: num(r.abs_gop),
    yea_oth: num(r.yea_oth), nay_oth: num(r.nay_oth),
    dem_defectors: num(r.dem_defectors),
    gop_defectors: num(r.gop_defectors),
    closeness_score: parseFloat(r.closeness_score) || 0,
    closeness_percentile: r.closeness_percentile === '' || r.closeness_percentile == null
      ? null
      : parseFloat(r.closeness_percentile),
    is_consent_calendar: bool(r.is_consent_calendar),
    notable_tier: str(r.notable_tier) || null,
    legiscan_url: str(r.legiscan_url),
    state_url: str(r.state_url),
  };
  // Convenience alias — UIs will use `passed` referring to effectively_passed
  vote.passed = vote.effectively_passed;
  votesByVoteId[bvid] = vote;
  if (!billToVotes[billId]) billToVotes[billId] = [];
  billToVotes[billId].push(bvid);
}

// Sort each bill's votes chronologically
for (const billId in billToVotes) {
  billToVotes[billId].sort((a, b) => {
    const va = votesByVoteId[a], vb = votesByVoteId[b];
    const cmpDate = va.vote_date.localeCompare(vb.vote_date);
    return cmpDate !== 0 ? cmpDate : a - b;
  });
}

// ---------------------------------------------------------------------------
// BUILD: legislator index from voting_record CSV (v3 with category metrics)
// ---------------------------------------------------------------------------
const legislatorsById = {};
for (const r of recordRows) {
  const pid = num(r.people_id);
  legislatorsById[pid] = {
    id: pid,
    name: str(r.legislator_name),
    party: str(r.party),
    chamber: str(r.chamber),
    district: str(r.district),

    votes_cast: num(r.votes_cast),
    votes_missed: num(r.votes_missed),

    // Headline metrics (substantive + concurrence on bills)
    votes_cast_headline: num(r.votes_cast_headline),
    clear_position_votes_headline: num(r.clear_position_votes_headline),
    defections_headline: num(r.defections_headline),
    unity_pct_headline: parseFloat(r.unity_pct_headline) || 0,
    defection_pct_headline: parseFloat(r.defection_pct_headline) || 0,

    // Per-category breakdowns
    defections_substantive: num(r.defections_substantive),
    clear_position_substantive: num(r.clear_position_substantive),
    defections_concurrence: num(r.defections_concurrence),
    clear_position_concurrence: num(r.clear_position_concurrence),
    defections_amendment: num(r.defections_amendment),
    clear_position_amendment: num(r.clear_position_amendment),
    defections_procedural: num(r.defections_procedural),
    clear_position_procedural: num(r.clear_position_procedural),

    // Legacy all-categories (for "broader view" comparison)
    defections_all: num(r.defections_all),
    clear_position_all: num(r.clear_position_all),
    defection_pct_all: parseFloat(r.defection_pct_all) || 0,
  };
}

// ---------------------------------------------------------------------------
// COMPUTE: non-vote rate from member detail (for "Most Absent" + active filter)
// ---------------------------------------------------------------------------
console.log('Computing per-legislator vote counts...');
const memberStats = {};
for (const r of memberRows) {
  const pid = num(r.people_id);
  const voteId = num(r.vote_id);
  if (!memberStats[pid]) {
    memberStats[pid] = { total: 0, voted: 0, nv: 0, absent: 0 };
  }
  memberStats[pid].total++;
  if (voteId === 1 || voteId === 2) memberStats[pid].voted++;
  else if (voteId === 3) memberStats[pid].nv++;
  else if (voteId === 4) memberStats[pid].absent++;
}

for (const pid in legislatorsById) {
  const stats = memberStats[pid];
  if (stats) {
    legislatorsById[pid].total_roll_calls_present = stats.total;
    legislatorsById[pid].non_votes = stats.nv + stats.absent;
    legislatorsById[pid].not_voting = stats.nv;
    legislatorsById[pid].absent_count = stats.absent;
    legislatorsById[pid].non_vote_pct = stats.total > 0
      ? Math.round((stats.nv + stats.absent) / stats.total * 1000) / 10
      : 0;
  } else {
    legislatorsById[pid].non_votes = 0;
    legislatorsById[pid].non_vote_pct = 0;
  }
  const l = legislatorsById[pid];
  l.is_active = l.votes_cast >= ACTIVE_MIN_VOTES && l.non_vote_pct < ACTIVE_MAX_NONVOTE_PCT;
}

// ---------------------------------------------------------------------------
// COMPUTE: defection drill-down with vote_category tags
// ---------------------------------------------------------------------------
console.log('Computing defection drill-downs...');

const partyPosition = {};
const THRESHOLD = 0.75;
for (const r of overviewRows) {
  const bvid = num(r.bill_vote_id);
  const yd = num(r.yea_dem), nd = num(r.nay_dem);
  const yr = num(r.yea_gop), nr = num(r.nay_gop);
  let demPos = 0, gopPos = 0;
  if (yd + nd > 0) {
    if (yd / (yd + nd) >= THRESHOLD) demPos = 1;
    else if (nd / (yd + nd) >= THRESHOLD) demPos = 2;
  }
  if (yr + nr > 0) {
    if (yr / (yr + nr) >= THRESHOLD) gopPos = 1;
    else if (nr / (yr + nr) >= THRESHOLD) gopPos = 2;
  }
  partyPosition[bvid] = { dem: demPos, gop: gopPos };
}

// Member-bill history for later-flip detection
const memberBillHistory = {};
for (const r of memberRows) {
  const pid = num(r.people_id);
  const bvid = num(r.bill_vote_id);
  const vote = votesByVoteId[bvid];
  if (!vote) continue;
  if (!memberBillHistory[pid]) memberBillHistory[pid] = {};
  if (!memberBillHistory[pid][vote.bill_id]) memberBillHistory[pid][vote.bill_id] = [];
  memberBillHistory[pid][vote.bill_id].push({
    bvid, vote_id: num(r.vote_id), vote_date: vote.vote_date,
    vote_category: vote.vote_category,
  });
}
for (const pid in memberBillHistory) {
  for (const billId in memberBillHistory[pid]) {
    memberBillHistory[pid][billId].sort((a, b) =>
      a.vote_date.localeCompare(b.vote_date) || a.bvid - b.bvid
    );
  }
}

// Enumerate defections (all categories — UI segments)
const defectionsByLegislator = {};
for (const r of memberRows) {
  const pid = num(r.people_id);
  const voteId = num(r.vote_id);
  const bvid = num(r.bill_vote_id);
  if (voteId !== 1 && voteId !== 2) continue;

  const leg = legislatorsById[pid];
  if (!leg) continue;
  const vote = votesByVoteId[bvid];
  if (!vote) continue;

  // Include defections on bills AND resolutions; UI filters
  // Exclude consent_calendar entirely (those are noise)
  if (vote.vote_category === 'consent_calendar') continue;

  const pp = partyPosition[bvid];
  if (!pp) continue;
  const partyPos = leg.party === 'Democrat' ? pp.dem : leg.party === 'Republican' ? pp.gop : 0;
  if (partyPos === 0) continue;
  if (voteId === partyPos) continue;

  if (!defectionsByLegislator[pid]) defectionsByLegislator[pid] = [];

  // Look for later vote-flip on same bill
  let laterFlipped = false;
  let laterVote = null;
  const history = memberBillHistory[pid]?.[vote.bill_id] || [];
  const thisIdx = history.findIndex((h) => h.bvid === bvid);
  if (thisIdx >= 0) {
    for (let i = thisIdx + 1; i < history.length; i++) {
      if (history[i].vote_id !== voteId && (history[i].vote_id === 1 || history[i].vote_id === 2)) {
        laterFlipped = true;
        laterVote = {
          bvid: history[i].bvid,
          vote_id: history[i].vote_id,
          vote_date: history[i].vote_date,
          vote_category: history[i].vote_category,
        };
        break;
      }
    }
  }

  defectionsByLegislator[pid].push({
    bvid,
    bill_id: vote.bill_id,
    bill_number: vote.bill_number,
    title: vote.title,
    chamber: vote.chamber,
    vote_date: vote.vote_date,
    vote_desc: vote.vote_desc,
    vote_category: vote.vote_category,    // NEW — UI can show category badge
    bill_class: vote.bill_class,
    is_constitutional_amendment: vote.is_constitutional_amendment,
    their_vote: voteId,
    party_position: partyPos,
    passed: vote.effectively_passed,      // Uses corrected passage logic
    later_flipped: laterFlipped,
    later_vote: laterVote,
  });
}

// Sort each legislator's defections by date desc
for (const pid in defectionsByLegislator) {
  defectionsByLegislator[pid].sort((a, b) => b.vote_date.localeCompare(a.vote_date));
}

// ---------------------------------------------------------------------------
// COMPUTE: Notable Votes (filtered by category — substantive only for headline categories)
// ---------------------------------------------------------------------------
console.log('Computing Notable Votes...');

const substantiveKinds = new Set(['substantive', 'concurrence', 'constitutional_amendment']);

const closestVotes = Object.values(votesByVoteId)
  .filter((v) => substantiveKinds.has(v.vote_category) && v.bill_class === 'bill')
  .sort((a, b) => a.closeness_score - b.closeness_score)
  .slice(0, 20);

const bigDefectionVotes = Object.values(votesByVoteId)
  .filter((v) => substantiveKinds.has(v.vote_category)
              && v.bill_class === 'bill'
              && (v.gop_defectors >= 3 || v.dem_defectors >= 3))
  .filter((v) => {
    const pp = partyPosition[v.bill_vote_id];
    if (!pp) return false;
    if (v.gop_defectors >= 3 && pp.gop !== 0) return true;
    if (v.dem_defectors >= 3 && pp.dem !== 0) return true;
    return false;
  })
  .sort((a, b) => (b.gop_defectors + b.dem_defectors) - (a.gop_defectors + a.dem_defectors))
  .slice(0, 20);

const mildDefectionVotes = Object.values(votesByVoteId)
  .filter((v) => substantiveKinds.has(v.vote_category) && v.bill_class === 'bill')
  .filter((v) => {
    const pp = partyPosition[v.bill_vote_id];
    if (!pp) return false;
    const isMildGop = v.gop_defectors === 2 && pp.gop !== 0;
    const isMildDem = v.dem_defectors === 2 && pp.dem !== 0;
    return isMildGop || isMildDem;
  })
  .sort((a, b) => b.vote_date.localeCompare(a.vote_date))
  .slice(0, 30);

// Notable Resolutions: substantive resolution votes with dissent OR constitutional amendments
const notableResolutions = Object.values(votesByVoteId)
  .filter((v) => v.bill_class === 'resolution'
              && substantiveKinds.has(v.vote_category)
              && v.nay >= 3)
  .sort((a, b) => b.nay - a.nay)
  .slice(0, 15);

// NEW: Constitutional amendments that "passed" simple majority but failed supermajority
const failedConstAmendments = Object.values(votesByVoteId)
  .filter((v) => v.is_constitutional_amendment
              && v.passed_raw === true
              && v.effectively_passed === false)
  .sort((a, b) => b.vote_date.localeCompare(a.vote_date))
  .slice(0, 20);

// NEW: Amendment defections — when 3+ members of one party broke on a floor amendment
const amendmentDefections = Object.values(votesByVoteId)
  .filter((v) => v.vote_category === 'amendment'
              && (v.gop_defectors >= 3 || v.dem_defectors >= 3))
  .sort((a, b) => (b.gop_defectors + b.dem_defectors) - (a.gop_defectors + a.dem_defectors))
  .slice(0, 15);

// Same-bill reversals (uses effectively_passed for cleaner signal)
const sameBillReversals = [];
for (const billId in billToVotes) {
  const voteIds = billToVotes[billId];
  if (voteIds.length < 2) continue;
  // Only consider substantive vote outcomes for reversal detection
  const substantiveVoteIds = voteIds.filter((id) =>
    substantiveKinds.has(votesByVoteId[id].vote_category)
  );
  if (substantiveVoteIds.length < 2) continue;
  const passedSequence = substantiveVoteIds.map((bvid) => votesByVoteId[bvid].effectively_passed);
  for (let i = 1; i < passedSequence.length; i++) {
    if (passedSequence[i] !== passedSequence[i - 1]) {
      sameBillReversals.push({
        bill_id: num(billId),
        votes: substantiveVoteIds.map((bvid) => ({
          bvid,
          date: votesByVoteId[bvid].vote_date,
          desc: votesByVoteId[bvid].vote_desc,
          category: votesByVoteId[bvid].vote_category,
          passed: votesByVoteId[bvid].effectively_passed,
          yea: votesByVoteId[bvid].yea,
          nay: votesByVoteId[bvid].nay,
        })),
        bill_number: votesByVoteId[voteIds[0]].bill_number,
        title: votesByVoteId[voteIds[0]].title,
      });
      break;
    }
  }
}
sameBillReversals.sort((a, b) => {
  const dateA = a.votes[a.votes.length - 1].date;
  const dateB = b.votes[b.votes.length - 1].date;
  return dateB.localeCompare(dateA);
});

// ---------------------------------------------------------------------------
// OUTPUT 1: votes_overview.json
// ---------------------------------------------------------------------------
const categoryStats = {};
for (const v of Object.values(votesByVoteId)) {
  categoryStats[v.vote_category] = (categoryStats[v.vote_category] || 0) + 1;
}

const overviewOutput = {
  state: 'GA',
  session_id: 2167,
  session_label: '2025-2026 Regular Session',
  generated_at: new Date().toISOString(),
  stats: {
    total_votes: Object.keys(votesByVoteId).length,
    bills_voted: new Set(Object.values(votesByVoteId).map((v) => v.bill_id)).size,
    by_category: categoryStats,
    consent_calendar: categoryStats.consent_calendar || 0,
    notable_major: Object.values(votesByVoteId).filter((v) => v.notable_tier === 'major').length,
    notable_mild: Object.values(votesByVoteId).filter((v) => v.notable_tier === 'mild').length,
    constitutional_amendments_failed: failedConstAmendments.length,
  },
  votes: Object.values(votesByVoteId).sort((a, b) =>
    b.vote_date.localeCompare(a.vote_date) || b.bill_vote_id - a.bill_vote_id
  ),
  notable: {
    closest: closestVotes,
    big_defections: bigDefectionVotes,
    mild_defections: mildDefectionVotes,
    notable_resolutions: notableResolutions,
    failed_const_amendments: failedConstAmendments,
    amendment_defections: amendmentDefections,
    same_bill_reversals: sameBillReversals.slice(0, 30),
  },
};
writeFileSync(join(OUT_DIR, 'votes_overview.json'), JSON.stringify(overviewOutput));
console.log(`  votes_overview.json: ${(Buffer.byteLength(JSON.stringify(overviewOutput)) / 1024).toFixed(0)} KB`);

// ---------------------------------------------------------------------------
// OUTPUT 2: votes_legislators.json
// ---------------------------------------------------------------------------
for (const pid in legislatorsById) {
  legislatorsById[pid].defections = defectionsByLegislator[pid] || [];
}

const activeLegislators = Object.values(legislatorsById).filter((l) => l.is_active);
const inactiveLegislators = Object.values(legislatorsById).filter((l) => !l.is_active);

const topDefectors = [...activeLegislators]
  .filter((l) => l.clear_position_votes_headline > 0)
  .sort((a, b) => b.defection_pct_headline - a.defection_pct_headline)
  .slice(0, 20)
  .map((l) => ({
    id: l.id, name: l.name, party: l.party, chamber: l.chamber,
    defection_pct_headline: l.defection_pct_headline,
    defections_headline: l.defections_headline,
    unity_pct_headline: l.unity_pct_headline,
    defection_pct_all: l.defection_pct_all,
    defections_all: l.defections_all,
  }));

const mostLoyal = [...activeLegislators]
  .filter((l) => l.clear_position_votes_headline > 100)
  .sort((a, b) => b.unity_pct_headline - a.unity_pct_headline)
  .slice(0, 20)
  .map((l) => ({
    id: l.id, name: l.name, party: l.party, chamber: l.chamber,
    unity_pct_headline: l.unity_pct_headline,
    defections_headline: l.defections_headline,
  }));

const mostAbsent = [...activeLegislators]
  .sort((a, b) => b.non_vote_pct - a.non_vote_pct)
  .slice(0, 20)
  .map((l) => ({
    id: l.id, name: l.name, party: l.party, chamber: l.chamber,
    non_vote_pct: l.non_vote_pct,
    not_voting: l.not_voting,
    absent_count: l.absent_count,
    votes_cast: l.votes_cast,
  }));

const legislatorsOutput = {
  state: 'GA',
  session_id: 2167,
  generated_at: new Date().toISOString(),
  legislators_active: activeLegislators,
  legislators_inactive: inactiveLegislators.map((l) => ({
    id: l.id, name: l.name, party: l.party, chamber: l.chamber,
    votes_cast: l.votes_cast, non_vote_pct: l.non_vote_pct,
    reason: l.votes_cast === 0 ? 'no_votes' :
            l.non_vote_pct >= 95 ? 'speaker_or_inactive' : 'low_activity',
  })),
  leaderboards: {
    top_defectors: topDefectors,
    most_loyal: mostLoyal,
    most_absent: mostAbsent,
  },
};
writeFileSync(join(OUT_DIR, 'votes_legislators.json'), JSON.stringify(legislatorsOutput));
console.log(`  votes_legislators.json: ${(Buffer.byteLength(JSON.stringify(legislatorsOutput)) / 1024).toFixed(0)} KB`);

// ---------------------------------------------------------------------------
// OUTPUT 3: votes_members.json (unchanged structure)
// ---------------------------------------------------------------------------
console.log('Building compressed member-vote map...');
const compressed = {};
for (const r of memberRows) {
  const bvid = num(r.bill_vote_id);
  const pid = num(r.people_id);
  const voteId = num(r.vote_id);
  if (!compressed[bvid]) {
    compressed[bvid] = { yea: [], nay: [], nv: [], absent: [] };
  }
  if (voteId === 1) compressed[bvid].yea.push(pid);
  else if (voteId === 2) compressed[bvid].nay.push(pid);
  else if (voteId === 3) compressed[bvid].nv.push(pid);
  else if (voteId === 4) compressed[bvid].absent.push(pid);
}
const membersOutput = {
  state: 'GA',
  session_id: 2167,
  generated_at: new Date().toISOString(),
  votes_by_id: compressed,
};
writeFileSync(join(OUT_DIR, 'votes_members.json'), JSON.stringify(membersOutput));
console.log(`  votes_members.json: ${(Buffer.byteLength(JSON.stringify(membersOutput)) / 1024).toFixed(0)} KB`);

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('');
console.log('=== STATS ===');
console.log(`  Total votes:                 ${Object.keys(votesByVoteId).length.toLocaleString()}`);
console.log(`  Active legislators:          ${activeLegislators.length}`);
console.log('');
console.log('=== VOTES BY CATEGORY ===');
for (const [cat, count] of Object.entries(categoryStats).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat.padEnd(28)} ${count.toLocaleString()}`);
}
console.log('');
console.log('=== TOP 5 DEFECTORS (headline = substantive + concurrence) ===');
topDefectors.slice(0, 5).forEach((d, i) => {
  console.log(`  ${i+1}. ${d.name} (${d.party[0]}, ${d.chamber}) — ${d.defection_pct_headline}% (${d.defections_headline} defections on substantive)  |  ${d.defection_pct_all}% all categories`);
});
console.log('');
console.log('=== NOTABLE VOTES SAMPLE ===');
console.log(`  Closest (substantive):           ${closestVotes.length}`);
console.log(`  Big defections (substantive):    ${bigDefectionVotes.length}`);
console.log(`  Mild defections (substantive):   ${mildDefectionVotes.length}`);
console.log(`  Notable resolutions:             ${notableResolutions.length}`);
console.log(`  Failed const amendments:         ${failedConstAmendments.length}`);
console.log(`  Amendment defections:            ${amendmentDefections.length}`);
console.log(`  Same-bill reversals:             ${sameBillReversals.length}`);

if (failedConstAmendments.length > 0) {
  console.log('');
  console.log('=== FAILED CONSTITUTIONAL AMENDMENTS (passed simple majority, failed 2/3) ===');
  failedConstAmendments.slice(0, 5).forEach((v) => {
    const pct = (v.yea / Math.max(v.yea + v.nay, 1) * 100).toFixed(1);
    console.log(`  ${v.bill_number} (${v.vote_date}): Y${v.yea}-N${v.nay} (${pct}% < 66.7% needed)  |  ${v.title.slice(0, 60)}`);
  });
}

const haPid = Object.values(legislatorsById).find((l) => l.name === 'Sonya Halpern')?.id;
if (haPid) {
  const haDefects = defectionsByLegislator[haPid] || [];
  const byCategory = {};
  haDefects.forEach((d) => { byCategory[d.vote_category] = (byCategory[d.vote_category] || 0) + 1; });
  console.log('');
  console.log(`=== HALPERN DEFECTIONS BREAKDOWN: ${haDefects.length} total ===`);
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
    console.log(`  ${cat.padEnd(28)} ${n}`);
  });
}
