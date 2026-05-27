#!/usr/bin/env node
// transform_ga_votes.mjs
// ----------------------------------------------------------------------------
// Reads three CSVs from ~/Downloads:
//   - ga_votes_overview.csv     (Q4 output: 2,520 rows × 33 cols)
//   - ga_votes_member_detail.csv (Q5 output: ~280K rows × 3 cols)
//   - ga_voting_record.csv       (Q6 output: 240 rows × ~20 cols)
//
// Produces three JSON files under src/data/states/ga/:
//   - votes_overview.json      (Browse tab + Notable Votes feed)
//   - votes_legislators.json   (By Legislator tab)
//   - votes_members.json       (Compressed member-vote lookup for drill-downs)
//
// The transform also computes:
//   - Per-legislator defection list (which votes did they defect on)
//   - "Later flipped" flag for each defection (did they vote opposite on the
//     same bill later?)
//   - Notable Vote categorization (closest, defection counts, etc.)
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

// Active-legislator threshold per user spec:
//   votes_cast >= 100 AND non_vote_pct < 95%
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

// BQ comma-formatted numbers → cleanup
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
    console.error('  All three CSVs must be saved to ~/Downloads with these exact names:');
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
// BUILD: Vote index (by bill_vote_id) and bill index (by bill_id)
// ---------------------------------------------------------------------------
const votesByVoteId = {};  // bill_vote_id -> vote object
const billToVotes = {};    // bill_id -> [bill_vote_id, ...] (chronological)

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
    bill_number: str(r.bill_number),
    title: str(r.title),
    bill_class: str(r.bill_class),
    bill_type_id: num(r.bill_type_id),
    status_id: num(r.status_id),
    yea: num(r.yea), nay: num(r.nay), nv: num(r.nv), absent: num(r.absent), total: num(r.total),
    passed: bool(r.passed),
    yea_dem: num(r.yea_dem), nay_dem: num(r.nay_dem), abs_dem: num(r.abs_dem),
    yea_gop: num(r.yea_gop), nay_gop: num(r.nay_gop), abs_gop: num(r.abs_gop),
    yea_oth: num(r.yea_oth), nay_oth: num(r.nay_oth),
    dem_defectors: num(r.dem_defectors),
    gop_defectors: num(r.gop_defectors),
    closeness_score: parseFloat(r.closeness_score) || 0,
    closeness_percentile: parseFloat(r.closeness_percentile) || 0,
    is_consent_calendar: bool(r.is_consent_calendar),
    notable_tier: str(r.notable_tier) || null,
    legiscan_url: str(r.legiscan_url),
    state_url: str(r.state_url),
  };
  votesByVoteId[bvid] = vote;
  if (!billToVotes[billId]) billToVotes[billId] = [];
  billToVotes[billId].push(bvid);
}

// Sort each bill's votes chronologically (by date then bill_vote_id as tiebreak)
for (const billId in billToVotes) {
  billToVotes[billId].sort((a, b) => {
    const va = votesByVoteId[a], vb = votesByVoteId[b];
    const cmpDate = va.vote_date.localeCompare(vb.vote_date);
    return cmpDate !== 0 ? cmpDate : a - b;
  });
}

// ---------------------------------------------------------------------------
// BUILD: legislator index from voting_record CSV
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
    clear_position_votes: num(r.clear_position_votes),
    party_unity_pct: parseFloat(r.party_unity_pct) || 0,
    defection_count: num(r.defection_count),
    defection_pct: parseFloat(r.defection_pct) || 0,
    votes_cast_bills: num(r.votes_cast_bills),
    clear_position_votes_bills: num(r.clear_position_votes_bills),
    party_unity_pct_bills: parseFloat(r.party_unity_pct_bills) || 0,
    defection_count_bills: num(r.defection_count_bills),
    defection_pct_bills: parseFloat(r.defection_pct_bills) || 0,
  };
}

// ---------------------------------------------------------------------------
// COMPUTE: non-vote rate per legislator (needed for "Most Absent" + active filter)
// We need to scan member detail to count non-votes per person.
// ---------------------------------------------------------------------------
console.log('Computing per-legislator vote counts...');
const memberStats = {};  // people_id -> { total, voted, nv, absent }

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

// Merge into legislators
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

  // Active flag: votes_cast >= 100 AND non_vote_pct < 95%
  const l = legislatorsById[pid];
  l.is_active = l.votes_cast >= ACTIVE_MIN_VOTES && l.non_vote_pct < ACTIVE_MAX_NONVOTE_PCT;
}

// ---------------------------------------------------------------------------
// COMPUTE: per-legislator defection drill-down list
// For each member-vote, determine if it was a defection from clear party position.
// Then enumerate the defection events per legislator.
// ---------------------------------------------------------------------------
console.log('Computing defection drill-downs...');

// First, determine each vote's clear party position (from overview data)
const partyPosition = {};  // bill_vote_id -> { dem: 0|1|2, gop: 0|1|2 }
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

// Build member-vote map for fast lookup (later-flip detection)
// people_id -> bill_id -> [{ bill_vote_id, vote_id, vote_date }, ...]
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
  });
}
// Sort each member's per-bill history chronologically
for (const pid in memberBillHistory) {
  for (const billId in memberBillHistory[pid]) {
    memberBillHistory[pid][billId].sort((a, b) =>
      a.vote_date.localeCompare(b.vote_date) || a.bvid - b.bvid
    );
  }
}

// Now enumerate defections per legislator
const defectionsByLegislator = {};  // people_id -> [defection events]

for (const r of memberRows) {
  const pid = num(r.people_id);
  const voteId = num(r.vote_id);
  const bvid = num(r.bill_vote_id);
  if (voteId !== 1 && voteId !== 2) continue;  // didn't actually vote

  const leg = legislatorsById[pid];
  if (!leg) continue;

  const vote = votesByVoteId[bvid];
  if (!vote || vote.bill_class !== 'bill') continue;  // bills only for defections

  const pp = partyPosition[bvid];
  if (!pp) continue;

  const partyPos = leg.party === 'Democrat' ? pp.dem : leg.party === 'Republican' ? pp.gop : 0;
  if (partyPos === 0) continue;  // no clear party position, can't defect
  if (voteId === partyPos) continue;  // voted with party

  // It's a defection. Build the event.
  if (!defectionsByLegislator[pid]) defectionsByLegislator[pid] = [];

  // Check for later flip: did they vote opposite on the same bill_id later?
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
    their_vote: voteId,       // 1=Yea, 2=Nay
    party_position: partyPos, // 1=Yea, 2=Nay — what party voted
    passed: vote.passed,
    later_flipped: laterFlipped,
    later_vote: laterVote,
  });
}

// Sort each legislator's defections by date (most recent first)
for (const pid in defectionsByLegislator) {
  defectionsByLegislator[pid].sort((a, b) => b.vote_date.localeCompare(a.vote_date));
}

// ---------------------------------------------------------------------------
// COMPUTE: Notable Votes — surface the editorially interesting votes
// ---------------------------------------------------------------------------
console.log('Computing Notable Votes...');

const closestVotes = Object.values(votesByVoteId)
  .filter((v) => v.bill_class === 'bill' && !v.is_consent_calendar)
  .sort((a, b) => a.closeness_score - b.closeness_score)
  .slice(0, 20);

const bigDefectionVotes = Object.values(votesByVoteId)
  .filter((v) => v.bill_class === 'bill' && (v.gop_defectors >= 3 || v.dem_defectors >= 3))
  .filter((v) => {
    // Only count as "defection" if the party had a clear position to defect from
    const pp = partyPosition[v.bill_vote_id];
    if (!pp) return false;
    if (v.gop_defectors >= 3 && pp.gop !== 0) return true;
    if (v.dem_defectors >= 3 && pp.dem !== 0) return true;
    return false;
  })
  .sort((a, b) => (b.gop_defectors + b.dem_defectors) - (a.gop_defectors + a.dem_defectors))
  .slice(0, 20);

const mildDefectionVotes = Object.values(votesByVoteId)
  .filter((v) => v.bill_class === 'bill')
  .filter((v) => {
    const pp = partyPosition[v.bill_vote_id];
    if (!pp) return false;
    const isMildGop = v.gop_defectors === 2 && pp.gop !== 0;
    const isMildDem = v.dem_defectors === 2 && pp.dem !== 0;
    return isMildGop || isMildDem;
  })
  .sort((a, b) => b.vote_date.localeCompare(a.vote_date))
  .slice(0, 30);

const notableResolutions = Object.values(votesByVoteId)
  .filter((v) => v.bill_class === 'resolution' && v.nay >= 3)
  .sort((a, b) => b.nay - a.nay)
  .slice(0, 15);

// Same-bill reversals: bills where a vote passed and a later vote failed (or vice versa)
const sameBillReversals = [];
for (const billId in billToVotes) {
  const voteIds = billToVotes[billId];
  if (voteIds.length < 2) continue;
  const passedSequence = voteIds.map((bvid) => votesByVoteId[bvid].passed);
  // Find any place where passed status flipped
  for (let i = 1; i < passedSequence.length; i++) {
    if (passedSequence[i] !== passedSequence[i - 1]) {
      sameBillReversals.push({
        bill_id: num(billId),
        votes: voteIds.map((bvid) => ({
          bvid,
          date: votesByVoteId[bvid].vote_date,
          desc: votesByVoteId[bvid].vote_desc,
          passed: votesByVoteId[bvid].passed,
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
// Sort by most recent reversal
sameBillReversals.sort((a, b) => {
  const dateA = a.votes[a.votes.length - 1].date;
  const dateB = b.votes[b.votes.length - 1].date;
  return dateB.localeCompare(dateA);
});

// ---------------------------------------------------------------------------
// OUTPUT 1: votes_overview.json — Browse + Notable
// ---------------------------------------------------------------------------
const overviewOutput = {
  state: 'GA',
  session_id: 2167,
  session_label: '2025-2026 Regular Session',
  generated_at: new Date().toISOString(),
  stats: {
    total_votes: Object.keys(votesByVoteId).length,
    bills_voted: new Set(Object.values(votesByVoteId).map((v) => v.bill_id)).size,
    consent_calendar: Object.values(votesByVoteId).filter((v) => v.is_consent_calendar).length,
    notable_major: Object.values(votesByVoteId).filter((v) => v.notable_tier === 'major').length,
    notable_mild: Object.values(votesByVoteId).filter((v) => v.notable_tier === 'mild').length,
  },
  votes: Object.values(votesByVoteId).sort((a, b) =>
    b.vote_date.localeCompare(a.vote_date) || b.bill_vote_id - a.bill_vote_id
  ),
  notable: {
    closest: closestVotes,
    big_defections: bigDefectionVotes,
    mild_defections: mildDefectionVotes,
    notable_resolutions: notableResolutions,
    same_bill_reversals: sameBillReversals.slice(0, 30),
  },
};
writeFileSync(join(OUT_DIR, 'votes_overview.json'), JSON.stringify(overviewOutput));
console.log(`  votes_overview.json: ${(Buffer.byteLength(JSON.stringify(overviewOutput)) / 1024).toFixed(0)} KB`);

// ---------------------------------------------------------------------------
// OUTPUT 2: votes_legislators.json — By Legislator tab + leaderboards
// ---------------------------------------------------------------------------
// Attach defections to legislators
for (const pid in legislatorsById) {
  legislatorsById[pid].defections = defectionsByLegislator[pid] || [];
}

const activeLegislators = Object.values(legislatorsById).filter((l) => l.is_active);
const inactiveLegislators = Object.values(legislatorsById).filter((l) => !l.is_active);

// Leaderboards (computed on active only)
const topDefectors = [...activeLegislators]
  .sort((a, b) => b.defection_pct_bills - a.defection_pct_bills)
  .slice(0, 20)
  .map((l) => ({
    id: l.id, name: l.name, party: l.party, chamber: l.chamber,
    defection_pct_bills: l.defection_pct_bills,
    defection_count_bills: l.defection_count_bills,
    party_unity_pct_bills: l.party_unity_pct_bills,
  }));

const mostLoyal = [...activeLegislators]
  .filter((l) => l.defection_count_bills > 0)  // must have voted on something
  .sort((a, b) => b.party_unity_pct_bills - a.party_unity_pct_bills)
  .slice(0, 20)
  .map((l) => ({
    id: l.id, name: l.name, party: l.party, chamber: l.chamber,
    party_unity_pct_bills: l.party_unity_pct_bills,
    defection_count_bills: l.defection_count_bills,
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
// OUTPUT 3: votes_members.json — compressed per-vote member breakdown
// Format: { [bill_vote_id]: { yea: [pid, pid, ...], nay: [...], nv: [...], absent: [...] } }
// This is the file used when a user expands a vote in the Browse tab.
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
console.log(`  Total votes:                ${Object.keys(votesByVoteId).length.toLocaleString()}`);
console.log(`  Active legislators:         ${activeLegislators.length}`);
console.log(`  Inactive / former:          ${inactiveLegislators.length}`);
console.log('');
console.log('=== TOP 5 DEFECTORS (by %) ===');
topDefectors.slice(0, 5).forEach((d, i) => {
  console.log(`  ${i+1}. ${d.name} (${d.party[0]}, ${d.chamber}) — ${d.defection_pct_bills}% defection (${d.defection_count_bills} bills)`);
});
console.log('');
console.log('=== TOP 5 MOST ABSENT (active only) ===');
mostAbsent.slice(0, 5).forEach((m, i) => {
  console.log(`  ${i+1}. ${m.name} (${m.party[0]}, ${m.chamber}) — ${m.non_vote_pct}% non-voting`);
});
console.log('');
console.log('=== INACTIVE / FILTERED ===');
inactiveLegislators.forEach((l) => {
  console.log(`  - ${l.name} (${l.party[0]}, ${l.chamber}) — ${l.votes_cast} cast, ${l.non_vote_pct}% non-vote (${l.reason})`);
});
console.log('');
console.log('=== NOTABLE VOTES SAMPLE ===');
console.log(`  Closest:          ${closestVotes.length} votes`);
console.log(`  Big defections:   ${bigDefectionVotes.length} votes`);
console.log(`  Mild defections:  ${mildDefectionVotes.length} votes`);
console.log(`  Notable resolns:  ${notableResolutions.length} votes`);
console.log(`  Same-bill reversals: ${sameBillReversals.length} bills`);

// Defection drill-down sample
const haPid = Object.values(legislatorsById).find((l) => l.name === 'Sonya Halpern')?.id;
if (haPid) {
  const haDefects = defectionsByLegislator[haPid] || [];
  console.log('');
  console.log(`=== SONYA HALPERN'S DEFECTIONS (sample): ${haDefects.length} total ===`);
  haDefects.slice(0, 3).forEach((d) => {
    const verdict = d.later_flipped ? 'LATER FLIPPED' : 'No later flip';
    console.log(`  ${d.bill_number} (${d.vote_date}): voted ${d.their_vote === 1 ? 'Yea' : 'Nay'} vs party ${d.party_position === 1 ? 'Yea' : 'Nay'} — ${verdict}`);
  });
}