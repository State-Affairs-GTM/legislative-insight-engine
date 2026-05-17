#!/usr/bin/env node
/**
 * extract.mjs — BigQuery → JSON extraction pipeline
 *
 * Usage:
 *   node scripts/extract.mjs                 # default: GA 2025-2026
 *   node scripts/extract.mjs --state=GA --session=2025-2026
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account
 * key with BQ read access on pendo-test-456821.state_affairs_prod.
 *
 * Writes JSON files into src/data/states/{abbr}/
 */

import { BigQuery } from '@google-cloud/bigquery';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROJECT = 'pendo-test-456821';
const DATASET = `${PROJECT}.state_affairs_prod`;

// ---------- args ----------
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.replace(/^--/, '').split('='))
);
const STATE_ABBR = (args.state || 'GA').toUpperCase();
const SESSION_PATTERN = args.session || '2025-2026 Regular Session';

console.log(`▶ Extracting ${STATE_ABBR} — session matching "${SESSION_PATTERN}"`);

const bq = new BigQuery({ projectId: PROJECT });

// ---------- helpers ----------
async function query(sql, params = {}) {
  const [rows] = await bq.query({ query: sql, params, location: 'US' });
  return rows;
}

function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 1000) / 10;
}

async function writeJson(outPath, data) {
  const full = path.join(ROOT, 'src/data/states', STATE_ABBR.toLowerCase(), outPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, JSON.stringify(data, null, 2));
  console.log(`  ✓ ${path.relative(ROOT, full)}`);
}

// ---------- 1: identify the state and session ----------
async function resolveScope() {
  const stateRows = await query(`
    SELECT state_id, state_abbr, state_name
    FROM \`${DATASET}.state\`
    WHERE state_abbr = @abbr
      AND _fivetran_deleted IS NOT TRUE
  `, { abbr: STATE_ABBR });
  if (!stateRows.length) throw new Error(`State ${STATE_ABBR} not found`);
  const { state_id, state_name } = stateRows[0];

  const sessionRows = await query(`
    SELECT session_id, session_name, year_start, year_end, session_start_date, session_adjournment_date,
           cross_over_deadline, second_year_crossover_deadline, sine_die, prefile,
           house_intro_deadline, senate_intro_deadline
    FROM \`${DATASET}.session\`
    WHERE state_id = @state_id
      AND session_name LIKE @pattern
      AND _fivetran_deleted IS NOT TRUE
    ORDER BY year_start DESC
  `, { state_id, pattern: `%${SESSION_PATTERN}%` });
  if (!sessionRows.length) throw new Error(`No session matching "${SESSION_PATTERN}" for ${STATE_ABBR}`);

  const session_ids = sessionRows.map((r) => r.session_id);
  console.log(`  ✓ State ${STATE_ABBR} (state_id=${state_id}), ${sessionRows.length} session(s) matched`);

  return { state_id, state_name, session_ids, sessions: sessionRows };
}

// ---------- 2: headline counts + funnel ----------
async function extractSummary({ state_id, state_name, session_ids, sessions }) {
  // Bills + status counts
  const billCounts = await query(`
    WITH scoped AS (
      SELECT b.*
      FROM \`${DATASET}.bill\` b
      WHERE b.session_id IN UNNEST(@session_ids)
        AND b._fivetran_deleted IS NOT TRUE
    )
    SELECT
      COUNT(*) AS total_bills,
      COUNTIF(is_active = TRUE)  AS still_active,
      COUNTIF(is_failed = TRUE)  AS failed,
      COUNTIF(is_vetoed = TRUE)  AS vetoed,
      COUNTIF(summary IS NOT NULL) AS with_summary,
      COUNTIF(description IS NOT NULL) AS with_description
    FROM scoped
  `, { session_ids });
  const counts = billCounts[0];

  // Bills that became law (best heuristic: history reached step 11 with "Signed by Governor")
  const lawCount = await query(`
    WITH scoped AS (
      SELECT b.bill_id
      FROM \`${DATASET}.bill\` b
      WHERE b.session_id IN UNNEST(@session_ids)
        AND b._fivetran_deleted IS NOT TRUE
    )
    SELECT COUNT(DISTINCT bh.bill_id) AS became_law
    FROM \`${DATASET}.bill_history\` bh
    WHERE bh.bill_id IN (SELECT bill_id FROM scoped)
      AND LOWER(bh.history_action) LIKE '%signed by governor%'
      AND bh._fivetran_deleted IS NOT TRUE
  `, { session_ids });
  const became_law = lawCount[0].became_law;

  // Unique sponsors
  const sponsorCount = await query(`
    SELECT COUNT(DISTINCT bs.people_id) AS unique_sponsors
    FROM \`${DATASET}.bill_sponsor\` bs
    JOIN \`${DATASET}.bill\` b ON bs.bill_id = b.bill_id
    WHERE b.session_id IN UNNEST(@session_ids)
      AND bs._fivetran_deleted IS NOT TRUE
      AND b._fivetran_deleted IS NOT TRUE
  `, { session_ids });
  const unique_sponsors = sponsorCount[0].unique_sponsors;

  // Vote counts + consent share
  const voteCounts = await query(`
    WITH scoped AS (
      SELECT bv.id, bv.roll_call_desc
      FROM \`${DATASET}.bill_vote\` bv
      JOIN \`${DATASET}.bill\` b ON bv.bill_id = b.bill_id
      WHERE b.session_id IN UNNEST(@session_ids)
        AND bv._fivetran_deleted IS NOT TRUE
        AND b._fivetran_deleted IS NOT TRUE
    )
    SELECT
      COUNT(*) AS recorded_votes,
      COUNTIF(
        LOWER(roll_call_desc) LIKE '%consent calendar%'
        OR LOWER(roll_call_desc) LIKE '%local calendar%'
        OR LOWER(roll_call_desc) LIKE '%motion to engross%'
        OR LOWER(roll_call_desc) LIKE '%motion to table remaining%'
        OR LOWER(roll_call_desc) LIKE '%uncontested%'
      ) AS consent_votes
    FROM scoped
  `, { session_ids });
  const recorded_votes = voteCounts[0].recorded_votes;
  const consent_pct = pct(voteCounts[0].consent_votes, recorded_votes);

  // Funnel: bills + resolutions × chamber × stage
  // We use is_failed/is_active and history_step max as bucket signals.
  const funnel = await buildFunnel({ session_ids });

  // Session label
  const session_label = sessions[0].session_name;
  const session_status = inferSessionStatus(sessions[0]);

  // Coverage notes derived from real numbers
  const coverage_notes = [];
  if (counts.with_summary / counts.total_bills > 0.85) {
    coverage_notes.push({
      level: 'good',
      text: `Bill summaries available on ${pct(counts.with_summary, counts.total_bills)}% of bills.`,
    });
  } else {
    coverage_notes.push({
      level: 'partial',
      text: `Bill summaries available on ${pct(counts.with_summary, counts.total_bills)}% of bills; fallback to description/title for the rest.`,
    });
  }
  if (consent_pct > 0) {
    coverage_notes.push({
      level: 'partial',
      text: `Consent-calendar votes (${consent_pct}% of all roll calls) are excluded from bill-level partisanship scoring.`,
    });
  }

  const summary = {
    abbr: STATE_ABBR,
    name: state_name,
    assembly_name: inferAssemblyName(state_name, sessions),
    session_label,
    session_status,
    state_id_internal: state_id,
    biennium: `${sessions[0].year_start}-${sessions[0].year_end}`,
    total_bills: counts.total_bills,
    became_law,
    vetoed: counts.vetoed,
    still_active: counts.still_active,
    unique_sponsors,
    recorded_votes,
    consent_pct,
    coverage_overall: counts.with_summary / counts.total_bills > 0.85 ? 'good' : 'partial',
    coverage_overall_label: counts.with_summary / counts.total_bills > 0.85 ? 'Strong' : 'Mixed',
    funnel,
    coverage_notes,
    _meta: {
      generated_at: new Date().toISOString(),
      generated_by: 'scripts/extract.mjs',
      data_source: `BigQuery ${DATASET}`,
    },
  };

  await writeJson('summary.json', summary);
}

async function buildFunnel({ session_ids }) {
  // For each bill, find: bill_type (Bill/Resolution/Joint Res), origin chamber, max history_step reached.
  // Bucket into 4 stages: introduced, stuck, engrossed, passed.

  const rows = await query(`
    WITH scoped AS (
      SELECT b.bill_id, b.bill_type_id, b.body_id, b.is_failed, b.is_active, b.is_vetoed
      FROM \`${DATASET}.bill\` b
      WHERE b.session_id IN UNNEST(@session_ids)
        AND b._fivetran_deleted IS NOT TRUE
    ),
    max_steps AS (
      SELECT bh.bill_id,
             MAX(IFNULL(bh.history_step, 0)) AS max_step,
             MAX(IF(LOWER(bh.history_action) LIKE '%signed by governor%', 1, 0)) AS became_law
      FROM \`${DATASET}.bill_history\` bh
      WHERE bh.bill_id IN (SELECT bill_id FROM scoped)
        AND bh._fivetran_deleted IS NOT TRUE
      GROUP BY bh.bill_id
    ),
    joined AS (
      SELECT s.bill_id, s.bill_type_id, s.body_id, s.is_failed, s.is_active,
             COALESCE(ms.max_step, 0) AS max_step, COALESCE(ms.became_law, 0) AS became_law
      FROM scoped s
      LEFT JOIN max_steps ms USING (bill_id)
    )
    SELECT
      bt.bill_type_name,
      body.body_id,
      body.body_name,
      CASE
        WHEN became_law = 1                         THEN 'passed'
        WHEN max_step >= 10                         THEN 'engrossed' -- through 2nd chamber concurrence stages
        WHEN max_step >= 6                          THEN 'engrossed' -- passed 1st chamber
        WHEN max_step >= 1                          THEN 'stuck'
        ELSE 'stuck'
      END AS stage,
      COUNT(*) AS n
    FROM joined j
    JOIN \`${DATASET}.type\` bt ON bt.bill_type_id = j.bill_type_id
    JOIN \`${DATASET}.body\` body ON body.body_id = j.body_id
    GROUP BY bt.bill_type_name, body.body_id, body.body_name, stage
  `, { session_ids });

  // Aggregate into funnel structure
  const tracks = {};
  const introducedByTrack = {}; // track key -> { type -> count }

  for (const row of rows) {
    const chamberKey = row.body_name?.includes('Senate') ? 'Senate' : 'House';
    const typeKey = classifyBillType(row.bill_type_name);
    const key = `${chamberKey}|${typeKey}`;

    tracks[chamberKey] = tracks[chamberKey] || {};
    tracks[chamberKey][typeKey] = tracks[chamberKey][typeKey] || {
      type: typeKey,
      counts: { introduced: 0, stuck: 0, engrossed: 0, passed: 0 },
    };
    // Every row contributes to introduced (it was filed) and to its specific stage
    tracks[chamberKey][typeKey].counts.introduced += row.n;
    tracks[chamberKey][typeKey].counts[row.stage] = (tracks[chamberKey][typeKey].counts[row.stage] || 0) + row.n;
  }

  // Subtract: stuck/engrossed/passed double-count introduced. Fix by computing introduced separately.
  // Simpler approach: stage IS the bucket, introduced is the sum.
  for (const ch of Object.keys(tracks)) {
    for (const tp of Object.keys(tracks[ch])) {
      const c = tracks[ch][tp].counts;
      c.introduced = c.stuck + c.engrossed + c.passed;
    }
  }

  // Order rows: Bills, Resolutions, Joint Res.
  const orderedTypes = ['Bills', 'Resolutions', 'Joint Res.'];
  const trackList = ['House', 'Senate'].map((chamber) => ({
    chamber,
    rows: orderedTypes
      .map((t) => tracks[chamber]?.[t])
      .filter(Boolean),
  })).filter((t) => t.rows.length > 0);

  return {
    stages: [
      { key: 'introduced', label: 'Introduced' },
      { key: 'stuck',      label: 'Stuck in 1st', subtitle: 'filed but no chamber passage' },
      { key: 'engrossed',  label: 'Engrossed',    subtitle: 'passed 1, still in 2nd' },
      { key: 'passed',     label: 'Became Law' },
    ],
    tracks: trackList,
  };
}

function classifyBillType(name) {
  if (!name) return 'Bills';
  const n = name.toLowerCase();
  if (n.includes('joint resolution') || n === 'jr') return 'Joint Res.';
  if (n.includes('resolution')) return 'Resolutions';
  return 'Bills';
}

function inferAssemblyName(stateName, sessions) {
  // Quick lookup; refine per-state later
  const map = {
    Georgia: '158th General Assembly',
  };
  return map[stateName] || `${stateName} Legislature`;
}

function inferSessionStatus(session) {
  const now = new Date();
  const start = session.session_start_date ? new Date(session.session_start_date.value || session.session_start_date) : null;
  const end = session.session_adjournment_date ? new Date(session.session_adjournment_date.value || session.session_adjournment_date) : null;
  if (start && now < start) return 'pre-session';
  if (end && now > end && session.sine_die) return 'sine-die';
  if (end && now > end) return 'recess';
  return 'in-session';
}

// ---------- main ----------
async function main() {
  const scope = await resolveScope();
  await extractSummary(scope);
  // TODO: extractBills, extractLegislators, extractVotes, extractHistory,
  // extractCommittees, extractBestBuddies, extractGutReplace, extractHistorical
  console.log('✓ Extraction complete');
}

main().catch((err) => {
  console.error('✗ Extraction failed:', err);
  process.exit(1);
});
