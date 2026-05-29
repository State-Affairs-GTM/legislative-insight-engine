// SponsorshipSection v2 — 3 tabs (merged grid + drill-down into one)
// Tabs: Primary Sponsors (sortable grid w/ inline expand) / Notable / Methodology

import { useState } from 'react';
import { PenLine } from 'lucide-react';
import Section from '../shared/Section.jsx';
import { useStateData } from '../../lib/useStateData.js';
import SponsorshipGrid from './SponsorshipGrid.jsx';
import NotableSponsorship from './NotableSponsorship.jsx';
import SponsorshipMethodology from './SponsorshipMethodology.jsx';

const TABS = [
  { key: 'sponsors',    label: 'Primary Sponsors' },
  { key: 'notable',     label: 'Notable' },
  { key: 'methodology', label: 'Methodology' },
];

export default function SponsorshipSection({ abbr }) {
  const overview = useStateData(abbr, 'sponsorship_overview');
  const notable = useStateData(abbr, 'sponsorship_notable');
  const [activeTab, setActiveTab] = useState('sponsors');

  // Detail data is loaded lazily inside SponsorshipGrid when first row is expanded
  const loading = overview.loading || notable.loading;
  const error = overview.error || notable.error;
  const data = overview.data && notable.data
    ? { overview: overview.data, notable: notable.data }
    : null;

  if (loading) {
    return (
      <Section icon={PenLine} title="Sponsorship" subtitle="Loading…">
        <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
          Loading sponsorship data…
        </div>
      </Section>
    );
  }
  if (error || !data) {
    return (
      <Section icon={PenLine} title="Sponsorship" subtitle="Not yet available">
        <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
          Sponsorship data not yet generated for this state.
        </div>
      </Section>
    );
  }

  const { stats } = data.overview;

  return (
    <Section
      icon={PenLine}
      title="Sponsorship"
      subtitle={`${stats.total_legislators} legislators · ${stats.total_bills_led.toLocaleString()} bills primary-sponsored · ${stats.total_bills_cosponsored.toLocaleString()} cosponsorships`}
    >
      <div className="flex items-center gap-0 border-b mb-6"
        style={{ borderColor: 'var(--rule)' }}>
        {TABS.map((t) => {
          const isActive = t.key === activeTab;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="px-4 py-2 text-xs uppercase tracking-wider transition-colors"
              style={{
                color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
                fontWeight: isActive ? 700 : 400,
                borderBottom: isActive ? '2px solid var(--ink)' : '2px solid transparent',
                marginBottom: '-1px',
                cursor: 'pointer',
              }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'sponsors'    && <SponsorshipGrid abbr={abbr} data={data} />}
      {activeTab === 'notable'     && <NotableSponsorship data={data} />}
      {activeTab === 'methodology' && <SponsorshipMethodology data={data} />}

      <div className="mt-8 pt-4 border-t text-[10px] italic"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
        Authoring analysis for the {data.overview.session_label}. See the
        Methodology tab for definitions of primary sponsor vs cosponsor, passage rate
        calculation, and Georgia-specific notes (GA uses single-primary-sponsor convention;
        most states allow multiple).
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
    <span style={{
      display: 'inline-block',
      width: size, height: size, borderRadius: '50%',
      backgroundColor: color, flexShrink: 0,
    }} />
  );
}

export function partyInitial(party) {
  return party === 'Republican' ? 'R'
       : party === 'Democrat'   ? 'D'
       : party === 'Independent' ? 'I'
       : party?.[0] || '—';
}

export const OUTCOME_META = {
  passed:     { label: 'Passed',     color: 'var(--coverage-good)' },
  enrolled:   { label: 'Enrolled',   color: 'var(--coverage-good)' },
  engrossed:  { label: 'Engrossed',  color: 'var(--warn)' },
  vetoed:     { label: 'Vetoed',     color: 'var(--accent)' },
  failed:     { label: 'Failed',     color: 'var(--ink-soft)' },
  introduced: { label: 'Introduced', color: 'var(--ink-soft)' },
  other:      { label: 'Other',      color: 'var(--ink-soft)' },
};

export function OutcomeBadge({ outcome }) {
  const meta = OUTCOME_META[outcome] || OUTCOME_META.other;
  return (
    <span className="inline-block px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
      style={{
        backgroundColor: 'var(--paper-warm)',
        color: meta.color,
        border: `1px solid ${meta.color}`,
        opacity: 0.85,
        fontWeight: 600,
      }}>
      {meta.label}
    </span>
  );
}
