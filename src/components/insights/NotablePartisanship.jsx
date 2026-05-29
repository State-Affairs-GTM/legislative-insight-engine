// NotablePartisanship — editorial picks with sub-sections.
// Pre-computed leaderboards from the transform.

import { useState } from 'react';
import { PartyDot, partyInitial, scoreColor } from './PartisanshipSection.jsx';

const SECTIONS = [
  { key: 'crossover_reps',  label: 'Pulled-Center Republicans',
    desc: 'Republicans whose voting (BV) is significantly less Republican than the GOP baseline. They defect against their own party often.' },
  { key: 'crossover_dems',  label: 'Pulled-Center Democrats',
    desc: 'Democrats whose voting (BV) is significantly less Democratic than the Dem baseline. They defect against their own party often.' },
  { key: 'significant_gaps', label: 'Sponsorship-Voting Gaps',
    desc: 'Legislators whose sponsorship behavior (BS) differs meaningfully from their voting behavior (BV). They sponsor one way but vote another.' },
  { key: 'most_partisan_bs', label: 'Most Partisan by Sponsorship',
    desc: 'Legislators with the most extreme BS scores — they author and cosponsor bills with very partisan coalitions.' },
  { key: 'least_partisan_bs', label: 'Least Partisan by Sponsorship',
    desc: 'Legislators with BS closest to 0 — they sponsor bills with notably bipartisan support.' },
  { key: 'most_disciplined', label: 'Most Disciplined',
    desc: 'Legislators with the lowest defection rates on partisan votes (under 5%). Pure caucus loyalists.' },
  { key: 'most_partisan_bills', label: 'Most Partisan Bills',
    desc: 'Bills with the most extreme partisanship scores. The bills that define each party in this session.' },
];

export default function NotablePartisanship({ data }) {
  const [section, setSection] = useState('crossover_reps');
  const { notable } = data.overview;

  const counts = {
    crossover_reps:      notable.crossover_reps?.length || 0,
    crossover_dems:      notable.crossover_dems?.length || 0,
    significant_gaps:    notable.significant_gaps?.length || 0,
    most_partisan_bs:    (notable.most_partisan_bs_dems?.length || 0) + (notable.most_partisan_bs_reps?.length || 0),
    least_partisan_bs:   (notable.least_partisan_bs_dems?.length || 0) + (notable.least_partisan_bs_reps?.length || 0),
    most_disciplined:    (notable.most_disciplined_dems?.length || 0) + (notable.most_disciplined_reps?.length || 0),
    most_partisan_bills: (notable.most_partisan_rep_bills?.length || 0) + (notable.most_partisan_dem_bills?.length || 0),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => {
          const isActive = s.key === section;
          const count = counts[s.key];
          if (count === 0) return null;
          return (
            <button key={s.key} onClick={() => setSection(s.key)}
              className="text-xs px-3 py-2 transition-colors"
              style={{
                border: `1px solid ${isActive ? 'var(--ink)' : 'var(--rule)'}`,
                backgroundColor: isActive ? 'var(--ink)' : 'var(--paper)',
                color: isActive ? 'var(--paper)' : 'var(--ink-soft)',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
              }}>
              {s.label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="text-xs italic" style={{ color: 'var(--ink-soft)' }}>
        {SECTIONS.find((s) => s.key === section)?.desc}
      </div>

      {section === 'crossover_reps'  && <LegislatorList items={notable.crossover_reps} baselines={data.overview.baselines} highlightCol="bv_score" />}
      {section === 'crossover_dems'  && <LegislatorList items={notable.crossover_dems} baselines={data.overview.baselines} highlightCol="bv_score" />}
      {section === 'significant_gaps' && <LegislatorList items={notable.significant_gaps} baselines={data.overview.baselines} highlightCol="bv_minus_bs_gap" />}
      {section === 'most_partisan_bs' && <TwoPartyList demItems={notable.most_partisan_bs_dems} repItems={notable.most_partisan_bs_reps} baselines={data.overview.baselines} highlightCol="bs_score" />}
      {section === 'least_partisan_bs' && <TwoPartyList demItems={notable.least_partisan_bs_dems} repItems={notable.least_partisan_bs_reps} baselines={data.overview.baselines} highlightCol="bs_score" />}
      {section === 'most_disciplined' && <TwoPartyList demItems={notable.most_disciplined_dems} repItems={notable.most_disciplined_reps} baselines={data.overview.baselines} highlightCol="bv_defection_pct" />}
      {section === 'most_partisan_bills' && <BillsList demBills={notable.most_partisan_dem_bills} repBills={notable.most_partisan_rep_bills} />}
    </div>
  );
}

function LegislatorList({ items, baselines, highlightCol }) {
  if (!items?.length) return <Empty />;
  return (
    <div>
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider border-b"
        style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
        <div className="col-span-1 text-right">#</div>
        <div className="col-span-4">Legislator</div>
        <div className="col-span-1 text-center">Chamber</div>
        <div className="col-span-1 text-right">BS</div>
        <div className="col-span-1 text-right">BV</div>
        <div className="col-span-1 text-right">Defect %</div>
        <div className="col-span-1 text-right">Defects</div>
        <div className="col-span-2 text-right">BV − BS Gap</div>
      </div>
      {items.map((leg, i) => (
        <div key={leg.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-b"
          style={{ color: 'var(--ink)', borderColor: 'var(--rule)' }}>
          <div className="col-span-1 text-right tabular-nums" style={{ color: 'var(--ink-soft)' }}>
            {i + 1}.
          </div>
          <div className="col-span-4 flex items-center gap-2">
            <PartyDot party={leg.party} size={8} />
            <span style={{ fontWeight: 600 }}>{leg.name}</span>
            <span className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
              ({partyInitial(leg.party)})
            </span>
          </div>
          <div className="col-span-1 text-center text-xs" style={{ color: 'var(--ink-soft)' }}>
            {leg.chamber}
          </div>
          <div className="col-span-1 text-right tabular-nums"
            style={{ color: scoreColor(leg.bs_score), fontWeight: highlightCol === 'bs_score' ? 700 : 600 }}>
            {leg.bs_score?.toFixed(2) ?? '—'}
          </div>
          <div className="col-span-1 text-right tabular-nums"
            style={{ color: scoreColor(leg.bv_score), fontWeight: highlightCol === 'bv_score' ? 700 : 600 }}>
            {leg.bv_score?.toFixed(2) ?? '—'}
          </div>
          <div className="col-span-1 text-right tabular-nums text-xs"
            style={{
              color: highlightCol === 'bv_defection_pct' ? 'var(--ink)' : 'var(--ink-soft)',
              fontWeight: highlightCol === 'bv_defection_pct' ? 700 : 400,
            }}>
            {leg.bv_defection_pct?.toFixed(1)}%
          </div>
          <div className="col-span-1 text-right tabular-nums text-xs" style={{ color: 'var(--ink-soft)' }}>
            {leg.bv_defections}/{leg.bv_partisan_votes}
          </div>
          <div className="col-span-2 text-right tabular-nums"
            style={{
              color: highlightCol === 'bv_minus_bs_gap' ? 'var(--accent)' : 'var(--ink-soft)',
              fontWeight: highlightCol === 'bv_minus_bs_gap' ? 700 : 400,
            }}>
            {leg.bv_minus_bs_gap == null ? '—' :
              (leg.bv_minus_bs_gap > 0 ? '+' : '') + leg.bv_minus_bs_gap.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TwoPartyList({ demItems, repItems, baselines, highlightCol }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-2"
          style={{ color: 'var(--dem)' }}>
          <PartyDot party="Democrat" size={8} />
          Democrats
        </div>
        <SimpleLegislatorList items={demItems} highlightCol={highlightCol} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-2"
          style={{ color: 'var(--gop)' }}>
          <PartyDot party="Republican" size={8} />
          Republicans
        </div>
        <SimpleLegislatorList items={repItems} highlightCol={highlightCol} />
      </div>
    </div>
  );
}

function SimpleLegislatorList({ items, highlightCol }) {
  if (!items?.length) return <Empty />;
  return (
    <div>
      {items.map((leg, i) => (
        <div key={leg.id} className="grid grid-cols-6 gap-2 px-2 py-1.5 text-xs border-b"
          style={{ color: 'var(--ink)', borderColor: 'var(--rule)' }}>
          <div className="col-span-1 text-right tabular-nums" style={{ color: 'var(--ink-soft)' }}>
            {i + 1}.
          </div>
          <div className="col-span-3 flex items-center gap-1.5 truncate">
            <span style={{ fontWeight: 600 }} title={leg.name}>{leg.name}</span>
            <span style={{ color: 'var(--ink-soft)' }}>{leg.chamber[0]}</span>
          </div>
          <div className="col-span-1 text-right tabular-nums"
            style={{ color: scoreColor(leg.bs_score), fontWeight: highlightCol === 'bs_score' ? 700 : 600 }}>
            BS {leg.bs_score?.toFixed(2)}
          </div>
          <div className="col-span-1 text-right tabular-nums"
            style={{
              color: highlightCol === 'bv_defection_pct' ? 'var(--ink)' : scoreColor(leg.bv_score),
              fontWeight: 600,
            }}>
            {highlightCol === 'bv_defection_pct'
              ? `${leg.bv_defection_pct?.toFixed(1)}%`
              : `BV ${leg.bv_score?.toFixed(2)}`}
          </div>
        </div>
      ))}
    </div>
  );
}

function BillsList({ demBills, repBills }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-2"
          style={{ color: 'var(--dem)' }}>
          Most Dem-leaning bills
        </div>
        <BillSubList bills={demBills} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-2"
          style={{ color: 'var(--gop)' }}>
          Most Rep-leaning bills
        </div>
        <BillSubList bills={repBills} />
      </div>
    </div>
  );
}

function BillSubList({ bills }) {
  if (!bills?.length) return <Empty />;
  return (
    <div>
      {bills.map((b) => (
        <div key={b.bill_id} className="px-2 py-1.5 text-xs border-b"
          style={{ color: 'var(--ink)', borderColor: 'var(--rule)' }}>
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-bold tabular-nums">{b.bill_number}</span>
            <span style={{
              color: scoreColor(b.bill_partisanship),
              fontWeight: 600,
              fontSize: '10px',
            }}>
              {b.bill_partisanship > 0 ? '+' : ''}{b.bill_partisanship?.toFixed(2)}
            </span>
            <span className="text-[9px]" style={{ color: 'var(--ink-soft)' }}>
              ({b.primary_party === 'Republican' ? 'R' : 'D'} primary · {b.gop_cosponsors}R/{b.dem_cosponsors}D cosp)
            </span>
          </div>
          <div className="text-[11px]" style={{ color: 'var(--ink-soft)' }} title={b.title}>
            {(b.title || '').slice(0, 90)}{(b.title || '').length > 90 ? '…' : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="text-sm italic py-6 text-center" style={{ color: 'var(--ink-soft)' }}>
      No legislators in this category.
    </div>
  );
}
