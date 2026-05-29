// PartisanshipSection — 4 tab orchestrator for the Partisanship accordion section.
// Scorecard (sortable table + visual scale) / Notable (editorial picks) / Methodology

import { useState } from 'react';
import { Scale } from 'lucide-react';
import Section from '../shared/Section.jsx';
import { useStateData } from '../../lib/useStateData.js';
import PartisanshipScorecard from './PartisanshipScorecard.jsx';
import NotablePartisanship from './NotablePartisanship.jsx';
import PartisanshipMethodology from './PartisanshipMethodology.jsx';

const TABS = [
  { key: 'scorecard',   label: 'Scorecard' },
  { key: 'notable',     label: 'Notable' },
  { key: 'methodology', label: 'Methodology' },
];

export default function PartisanshipSection({ abbr }) {
  const overview = useStateData(abbr, 'partisanship_overview');
  const [activeTab, setActiveTab] = useState('scorecard');

  if (overview.loading) {
    return (
      <Section icon={Scale} title="Partisanship" subtitle="Loading…">
        <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
          Loading partisanship data…
        </div>
      </Section>
    );
  }
  if (overview.error || !overview.data) {
    return (
      <Section icon={Scale} title="Partisanship" subtitle="Not yet available">
        <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
          Partisanship data not yet generated for this state.
        </div>
      </Section>
    );
  }

  const data = { overview: overview.data };
  const { stats, baselines } = overview.data;

  return (
    <Section
      icon={Scale}
      title="Partisanship"
      subtitle={`${stats.total_legislators} legislators · ${stats.total_bills_scored.toLocaleString()} bills scored · Dem baseline ${baselines.Democrat?.toFixed(2)}, Rep baseline ${baselines.Republican?.toFixed(2)}`}
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

      {activeTab === 'scorecard'   && <PartisanshipScorecard data={data} />}
      {activeTab === 'notable'     && <NotablePartisanship data={data} />}
      {activeTab === 'methodology' && <PartisanshipMethodology data={data} />}

      <div className="mt-8 pt-4 border-t text-[10px] italic"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
        Two scores per legislator (−1 super Dem to +1 super Rep). BS measures
        sponsorship partisanship; BV measures party-relative voting behavior.
        See Methodology tab for the full calculation.
      </div>
    </Section>
  );
}

// Shared helpers
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

// Score → color mapping. Symmetric around 0.
// Dem-leaning scores trend blue; Rep-leaning scores trend red. Bipartisan = ink.
export function scoreColor(score) {
  if (score == null) return 'var(--ink-soft)';
  if (score <= -0.7) return 'var(--dem)';
  if (score < -0.3)  return 'var(--dem-light, var(--dem))';
  if (score <= 0.3)  return 'var(--ink)';
  if (score < 0.7)   return 'var(--gop-light, var(--gop))';
  return 'var(--gop)';
}

// -1 to +1 score → 0 to 1 position on visual scale
export function scoreToPosition(score) {
  if (score == null) return 0.5;
  return (score + 1) / 2;
}
