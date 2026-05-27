// VotesSection — the GA Votes feature.
// Three tabs: Browse (functional/filterable), Notable Votes (editorial),
// By Legislator (defector leaderboard + drill-down).
//
// Data loading strategy:
//   - votes_overview.json loads on mount (used by Browse + Notable tabs)
//   - votes_legislators.json loads on mount (used by By Legislator tab)
//   - votes_members.json loads ONLY when a user expands a Browse row
//     (it's the largest file — no point loading until needed)

import { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import Section from '../shared/Section.jsx';
import { useStateData } from '../../lib/useStateData.js';
import VotesBrowse from './VotesBrowse.jsx';
import NotableVotes from './NotableVotes.jsx';
import VotesByLegislator from './VotesByLegislator.jsx';

const TABS = [
  { key: 'browse',     label: 'Browse' },
  { key: 'notable',    label: 'Notable Votes' },
  { key: 'legislator', label: 'By Legislator' },
];

export default function VotesSection({ abbr }) {
  const overview = useStateData(abbr, 'votes_overview');
  const legislators = useStateData(abbr, 'votes_legislators');
  const [activeTab, setActiveTab] = useState('browse');

  const loading = overview.loading || legislators.loading;
  const error = overview.error || legislators.error;
  const data = overview.data && legislators.data
    ? { overview: overview.data, legislators: legislators.data }
    : null;

  if (loading) {
    return (
      <Section icon={CheckSquare} title="Votes" subtitle="Loading…">
        <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
          Loading vote data…
        </div>
      </Section>
    );
  }
  if (error || !data) {
    return (
      <Section icon={CheckSquare} title="Votes" subtitle="Not yet available">
        <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
          Vote data not yet generated for this state.
        </div>
      </Section>
    );
  }

  const { stats } = data.overview;

  return (
    <Section
      icon={CheckSquare}
      title="Votes"
      subtitle={`${stats.total_votes.toLocaleString()} roll calls · ${data.legislators.legislators_active.length} active legislators`}
    >
      {/* Tab nav */}
      <div className="flex items-center gap-0 border-b mb-6"
        style={{ borderColor: 'var(--rule)' }}>
        {TABS.map((t) => {
          const isActive = t.key === activeTab;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-4 py-2 text-xs uppercase tracking-wider transition-colors"
              style={{
                color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
                fontWeight: isActive ? 700 : 400,
                borderBottom: isActive ? '2px solid var(--ink)' : '2px solid transparent',
                marginBottom: '-1px',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'browse'     && <VotesBrowse abbr={abbr} data={data} />}
      {activeTab === 'notable'    && <NotableVotes data={data} />}
      {activeTab === 'legislator' && <VotesByLegislator data={data} />}

      {/* Footer note */}
<div className="mt-8 pt-4 border-t text-[10px] italic"
  style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
  Roll-call vote analysis for the {data.overview.session_label}.
  A "defection" is defined as voting opposite the majority of one's
  party on a vote where 75%+ of the party agreed. Party position is
  derived per-vote from caucus voting patterns, not from external labels.
  <br /><br />
  Note: A legislator can be a top bipartisan collaborator (see
  Legislator Pairs) while having a low defection rate. The two measure
  different behaviors — collaboration on legislation vs. breaking ranks
  on floor votes. Sonya Halpern is the clearest example: highest
  cross-party cosponsorship in GA, but 98.3% party unity on roll calls.
  Speaker Jon Burns is excluded from voting analytics.
</div>
    </Section>
  );
}

// ============================================================================
// Shared helpers — used by sub-components
// ============================================================================

export function PartyDot({ party, size = 10 }) {
  const color = party === 'Republican' ? 'var(--gop)'
              : party === 'Democrat'   ? 'var(--dem)'
              : 'var(--ind)';
  return (
    <span
      style={{
        display: 'inline-block',
        width: size, height: size, borderRadius: '50%',
        backgroundColor: color, flexShrink: 0,
      }}
    />
  );
}

export function partyInitial(party) {
  return party === 'Republican' ? 'R'
       : party === 'Democrat'   ? 'D'
       : party === 'Independent' ? 'I'
       : party?.[0] || '—';
}

// Format a date string like "March 6, 2026" → "Mar 6, 2026"
export function formatDate(dateStr) {
  if (!dateStr) return '';
  // BigQuery exports as "March 6, 2026" — abbreviate the month
  return dateStr.replace(/^(\w{3})\w+/, '$1');
}

// Vote ID to readable
export const VOTE_LABELS = { 1: 'Yea', 2: 'Nay', 3: 'Not Voting', 4: 'Absent' };
