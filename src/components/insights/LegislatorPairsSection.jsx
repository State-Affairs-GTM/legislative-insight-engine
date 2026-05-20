// LegislatorPairsSection — the GA Legislator Pairs feature.
// Three tabs: Browse (functional/filterable), Bipartisan Bridges (editorial),
// Lopsided Pairs (insight). Reads from legislator_pairs.json.

import { useState, useMemo } from 'react';
import { Users2, Search, Filter, X, ChevronDown, ChevronRight } from 'lucide-react';
import Section from '../shared/Section.jsx';
import { useStateData } from '../../lib/useStateData.js';
import BipartisanBridges from './BipartisanBridges.jsx';
import PairsBrowse from './PairsBrowse.jsx';
import LopsidedPairs from './LopsidedPairs.jsx';

const TABS = [
  { key: 'browse',     label: 'Browse' },
  { key: 'bridges',    label: 'Bipartisan Bridges' },
  { key: 'lopsided',   label: 'Lopsided Pairs' },
];

export default function LegislatorPairsSection({ abbr }) {
  const { data, loading, error } = useStateData(abbr, 'legislator_pairs');
  const [activeTab, setActiveTab] = useState('browse');

  if (loading) {
    return (
      <Section icon={Users2} title="Legislator Pairs" subtitle="Loading…">
        <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
          Loading pair data…
        </div>
      </Section>
    );
  }
  if (error || !data) {
    return (
      <Section icon={Users2} title="Legislator Pairs" subtitle="Not yet available">
        <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
          Pair data not yet generated for this state.
        </div>
      </Section>
    );
  }

  return (
    <Section
      icon={Users2}
      title="Legislator Pairs"
      subtitle={`${data.stats.total_pairs.toLocaleString()} pairs · ${data.stats.cross_party_pairs.toLocaleString()} cross-party`}
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

      {activeTab === 'browse'   && <PairsBrowse   data={data} />}
      {activeTab === 'bridges'  && <BipartisanBridges data={data} />}
      {activeTab === 'lopsided' && <LopsidedPairs data={data} />}

      {/* Footer note */}
      <div className="mt-8 pt-4 border-t text-[10px] italic" 
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
        "Bills" counts substantive legislation only; ceremonial resolutions
        excluded by default. A pair must share at least 3 bills total to appear.
        See State Nuances for GA-specific sponsorship rules.
      </div>
    </Section>
  );
}

// ============================================================================
// Shared helpers used by sub-components
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

export function PairName({ leg, withParty = true }) {
  if (!leg) return <span style={{ color: 'var(--ink-soft)' }}>—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {withParty && <PartyDot party={leg.party} size={8} />}
      <span style={{ color: 'var(--ink)' }}>{leg.name}</span>
    </span>
  );
}

// Friendly party initial: D / R / I
export function partyInitial(party) {
  return party === 'Republican' ? 'R'
       : party === 'Democrat'   ? 'D'
       : party === 'Independent' ? 'I'
       : party?.[0] || '—';
}
