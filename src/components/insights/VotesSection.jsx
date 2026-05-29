// VotesSection v3 — adds a Methodology tab as 4th top-level subtab.
// Methodology is visible from anywhere in the Votes section.

import { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import Section from '../shared/Section.jsx';
import { useStateData } from '../../lib/useStateData.js';
import VotesBrowse from './VotesBrowse.jsx';
import NotableVotes from './NotableVotes.jsx';
import VotesByLegislator from './VotesByLegislator.jsx';
import VotesMethodology from './VotesMethodology.jsx';

const TABS = [
  { key: 'browse',      label: 'Browse' },
  { key: 'notable',     label: 'Notable Votes' },
  { key: 'legislator',  label: 'By Legislator' },
  { key: 'methodology', label: 'Methodology' },
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

      {activeTab === 'browse'      && <VotesBrowse abbr={abbr} data={data} />}
      {activeTab === 'notable'     && <NotableVotes data={data} />}
      {activeTab === 'legislator'  && <VotesByLegislator data={data} />}
      {activeTab === 'methodology' && <VotesMethodology data={data} />}

      {/* Footer kept minimal — full methodology now lives in its own tab */}
      <div className="mt-8 pt-4 border-t text-[10px] italic"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
        Roll-call analysis for the {data.overview.session_label}. See the
        Methodology tab for category definitions, defection scoring rules,
        and Georgia-specific notes.
      </div>
    </Section>
  );
}

// ============================================================================
// Shared helpers
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

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return dateStr.replace(/^(\w{3})\w+/, '$1');
}

export const VOTE_LABELS = { 1: 'Yea', 2: 'Nay', 3: 'Not Voting', 4: 'Absent' };

export const CATEGORY_META = {
  substantive:              { label: 'Substantive',      short: 'Sub',  color: 'var(--ink)' },
  concurrence:              { label: 'Concurrence',      short: 'Conc', color: 'var(--ink)' },
  amendment:                { label: 'Amendment',        short: 'Amend', color: 'var(--warn)' },
  procedural:               { label: 'Procedural',       short: 'Proc', color: 'var(--ink-soft)' },
  consent_calendar:         { label: 'Consent Calendar', short: 'Consent', color: 'var(--ink-soft)' },
  constitutional_amendment: { label: 'Const. Amend.',    short: 'CA',   color: 'var(--accent)' },
  other:                    { label: 'Other',            short: '—',    color: 'var(--ink-soft)' },
};

export function CategoryBadge({ category, compact = false }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.other;
  return (
    <span
      className="inline-block px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
      style={{
        backgroundColor: 'var(--paper-warm)',
        color: meta.color,
        border: `1px solid ${meta.color}`,
        opacity: 0.85,
        fontWeight: 600,
      }}
    >
      {compact ? meta.short : meta.label}
    </span>
  );
}

export const HEADLINE_CATEGORIES = new Set(['substantive', 'concurrence', 'constitutional_amendment']);

export function formatPassageResult(vote) {
  if (vote.is_constitutional_amendment) {
    if (vote.effectively_passed) {
      return { label: 'Passed (2/3)', color: 'var(--coverage-good)' };
    } else if (vote.passed_raw) {
      const pct = vote.yea + vote.nay > 0
        ? ((vote.yea / (vote.yea + vote.nay)) * 100).toFixed(0)
        : 0;
      return { label: `Failed (${pct}% < 67%)`, color: 'var(--accent)' };
    } else {
      return { label: 'Failed', color: 'var(--accent)' };
    }
  }
  const passed = vote.effectively_passed ?? vote.passed;
  return passed
    ? { label: 'Passed', color: 'var(--coverage-good)' }
    : { label: 'Failed', color: 'var(--accent)' };
}
