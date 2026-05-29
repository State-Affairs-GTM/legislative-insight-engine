// PartisanshipScorecard — sortable/filterable table showing BS and BV for every legislator.
// Includes visual -1 to +1 scale plot per row.

import { useState, useMemo } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { PartyDot, partyInitial, scoreColor, scoreToPosition } from './PartisanshipSection.jsx';

const COLUMNS = [
  { key: 'name',             label: 'Legislator', width: 'col-span-3', align: 'left',  sortType: 'string' },
  { key: 'chamber',          label: 'Ch.',        width: 'col-span-1', align: 'center', sortType: 'string' },
  { key: 'bs_score',         label: 'BS',         width: 'col-span-1', align: 'right', sortType: 'number', tooltip: 'Bill Sponsorship: partisan flavor of bills they author/cosponsor' },
  { key: 'bv_score',         label: 'BV',         width: 'col-span-1', align: 'right', sortType: 'number', tooltip: 'Bill Voting: party-relative voting behavior (baseline + defection adjustment)' },
  { key: 'scale',            label: 'Scale',      width: 'col-span-4', align: 'left',  sortType: null }, // visual
  { key: 'bv_defection_pct', label: 'Defect %',   width: 'col-span-1', align: 'right', sortType: 'number' },
  { key: 'bv_minus_bs_gap',  label: 'BV−BS',      width: 'col-span-1', align: 'right', sortType: 'number', tooltip: 'Gap: positive = votes more Rep than they sponsor; negative = votes more Dem' },
];

export default function PartisanshipScorecard({ data }) {
  const [search, setSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState('all');
  const [chamberFilter, setChamberFilter] = useState('all');
  const [sortKey, setSortKey] = useState('bv_score');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.overview.legislators.filter((l) => {
      if (q && !l.name.toLowerCase().includes(q)) return false;
      if (partyFilter !== 'all' && l.party !== partyFilter) return false;
      if (chamberFilter !== 'all' && l.chamber !== chamberFilter) return false;
      return true;
    });
  }, [data, search, partyFilter, chamberFilter]);

  const sorted = useMemo(() => {
    const result = [...filtered];
    const dir = sortDir === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      if (sortKey === 'name' || sortKey === 'chamber') {
        return dir * String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
      }
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      // Nulls sort to bottom regardless of direction
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return dir * (aVal - bVal);
    });
    return result;
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key) => {
    const col = COLUMNS.find((c) => c.key === key);
    if (!col || col.sortType == null) return;
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir(col.sortType === 'number' ? 'desc' : 'asc');
    }
  };

  const { baselines } = data.overview;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-grow min-w-[200px]">
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--ink-soft)',
          }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search legislators…"
            className="w-full pl-8 pr-8 py-2 text-sm border"
            style={{
              borderColor: 'var(--rule)', backgroundColor: 'var(--paper)',
              color: 'var(--ink)', fontFamily: 'inherit',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--ink-soft)', cursor: 'pointer',
              }}>
              <X size={14} />
            </button>
          )}
        </div>
        <Select value={partyFilter} onChange={setPartyFilter} options={[
          { key: 'all', label: 'All parties' },
          { key: 'Democrat', label: 'Democrats' },
          { key: 'Republican', label: 'Republicans' },
        ]} />
        <Select value={chamberFilter} onChange={setChamberFilter} options={[
          { key: 'all', label: 'Both chambers' },
          { key: 'House', label: 'House' },
          { key: 'Senate', label: 'Senate' },
        ]} />
      </div>

      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
        Showing {sorted.length.toLocaleString()} of {data.overview.legislators.length} legislators ·
        <span className="ml-1 italic">click BS or BV column to sort</span>
      </div>

      {/* Scale legend */}
      <div className="px-3 py-2 text-[10px] flex items-center gap-3"
        style={{ color: 'var(--ink-soft)', borderTop: '1px solid var(--rule)' }}>
        <span>Scale:</span>
        <span style={{ color: 'var(--dem)' }}>← Dem (−1)</span>
        <div className="flex-grow h-px" style={{ background: 'linear-gradient(to right, var(--dem), var(--ink-soft), var(--gop))' }}></div>
        <span style={{ color: 'var(--gop)' }}>Rep (+1) →</span>
        <span className="ml-2">|  baselines: Dem {baselines.Democrat?.toFixed(2)}  ·  Rep {baselines.Republican?.toFixed(2)}</span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 900 }}>
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider border-b"
            style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
            {COLUMNS.map((col) => (
              <div key={col.key} className={`${col.width} ${alignClass(col.align)}`}>
                {col.sortType ? (
                  <button onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-0.5 uppercase tracking-wider hover:opacity-80"
                    style={{
                      color: sortKey === col.key ? 'var(--ink)' : 'var(--ink-soft)',
                      fontWeight: sortKey === col.key ? 700 : 400,
                      cursor: 'pointer',
                    }}
                    title={col.tooltip}>
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />
                    )}
                  </button>
                ) : (
                  <span title={col.tooltip}>{col.label}</span>
                )}
              </div>
            ))}
          </div>

          {sorted.length === 0 ? (
            <div className="text-sm italic py-6 text-center" style={{ color: 'var(--ink-soft)' }}>
              No legislators match your filters.
            </div>
          ) : (
            sorted.map((l) => <ScorecardRow key={l.id} leg={l} baselines={baselines} />)
          )}
        </div>
      </div>
    </div>
  );
}

function ScorecardRow({ leg, baselines }) {
  return (
    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-b"
      style={{ color: 'var(--ink)', borderColor: 'var(--rule)' }}>
      <div className="col-span-3 flex items-center gap-2 min-w-0">
        <PartyDot party={leg.party} size={8} />
        <span className="truncate" style={{ fontWeight: 600 }} title={leg.name}>
          {leg.name}
        </span>
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--ink-soft)' }}>
          ({partyInitial(leg.party)})
        </span>
      </div>
      <div className="col-span-1 text-center text-xs" style={{ color: 'var(--ink-soft)' }}>
        {leg.chamber}
      </div>
      <div className="col-span-1 text-right tabular-nums"
        style={{ color: scoreColor(leg.bs_score), fontWeight: 600 }}
        title={`BS = ${leg.bs_score?.toFixed(4) ?? 'N/A'}`}>
        {leg.bs_score == null ? '—' : leg.bs_score.toFixed(2)}
      </div>
      <div className="col-span-1 text-right tabular-nums"
        style={{ color: scoreColor(leg.bv_score), fontWeight: 600 }}
        title={`BV = ${leg.bv_score?.toFixed(4) ?? 'N/A'} (${leg.bv_defections}/${leg.bv_partisan_votes} defections)`}>
        {leg.bv_score == null ? '—' : leg.bv_score.toFixed(2)}
      </div>
      <div className="col-span-4">
        <ScalePlot bs={leg.bs_score} bv={leg.bv_score} baselines={baselines} />
      </div>
      <div className="col-span-1 text-right tabular-nums text-xs"
        style={{ color: 'var(--ink-soft)' }}>
        {leg.has_valid_bv ? `${leg.bv_defection_pct}%` : '—'}
      </div>
      <div className="col-span-1 text-right tabular-nums text-xs"
        style={{ color: leg.bv_minus_bs_gap != null && Math.abs(leg.bv_minus_bs_gap) > 0.2 ? 'var(--accent)' : 'var(--ink-soft)' }}>
        {leg.bv_minus_bs_gap == null ? '—' : (leg.bv_minus_bs_gap > 0 ? '+' : '') + leg.bv_minus_bs_gap.toFixed(2)}
      </div>
    </div>
  );
}

// Visual -1 to +1 scale showing both BS (hollow dot) and BV (filled dot) positions
function ScalePlot({ bs, bv, baselines }) {
  const height = 18;
  const dotR = 4;

  // Position calculations (0 to 1 along the scale)
  const bsPos = bs != null ? scoreToPosition(bs) : null;
  const bvPos = bv != null ? scoreToPosition(bv) : null;
  const demBasePos = baselines?.Democrat != null ? scoreToPosition(baselines.Democrat) : null;
  const repBasePos = baselines?.Republican != null ? scoreToPosition(baselines.Republican) : null;

  return (
    <svg width="100%" height={height} viewBox="0 0 200 18" preserveAspectRatio="none"
      style={{ display: 'block' }}>
      {/* Background line */}
      <line x1="0" y1="9" x2="200" y2="9" stroke="var(--rule)" strokeWidth="1" />
      {/* Center mark (0) */}
      <line x1="100" y1="5" x2="100" y2="13" stroke="var(--ink-soft)" strokeWidth="0.5" />
      {/* Baseline ticks */}
      {demBasePos != null && (
        <line x1={demBasePos * 200} y1="6" x2={demBasePos * 200} y2="12"
          stroke="var(--dem)" strokeWidth="1" strokeDasharray="2,1" opacity="0.5" />
      )}
      {repBasePos != null && (
        <line x1={repBasePos * 200} y1="6" x2={repBasePos * 200} y2="12"
          stroke="var(--gop)" strokeWidth="1" strokeDasharray="2,1" opacity="0.5" />
      )}
      {/* BS dot (hollow) */}
      {bsPos != null && (
        <circle cx={bsPos * 200} cy="9" r={dotR}
          fill="var(--paper)" stroke={scoreColor(bs)} strokeWidth="1.5">
          <title>BS = {bs.toFixed(2)}</title>
        </circle>
      )}
      {/* BV dot (filled) */}
      {bvPos != null && (
        <circle cx={bvPos * 200} cy="9" r={dotR}
          fill={scoreColor(bv)} stroke={scoreColor(bv)} strokeWidth="1.5">
          <title>BV = {bv.toFixed(2)}</title>
        </circle>
      )}
    </svg>
  );
}

function alignClass(align) {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="text-xs px-2 py-1.5"
      style={{
        border: '1px solid var(--rule)',
        backgroundColor: 'var(--paper)',
        color: 'var(--ink)', fontFamily: 'inherit',
      }}>
      {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}
