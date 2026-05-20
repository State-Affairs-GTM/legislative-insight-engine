// PairsBrowse — workhorse functional tab.
// v2: drill-down shows bill_number + title (truncated) instead of raw bill_id.

import { useState, useMemo } from 'react';
import { Search, X, ChevronRight, ChevronDown } from 'lucide-react';
import { PartyDot, PairName, partyInitial } from './LegislatorPairsSection.jsx';

const PAGE_SIZE = 50;
const TITLE_MAX_CHARS = 90;

const SORTS = [
  { key: 'bills_shared',     label: 'Bills shared' },
  { key: 'bills_passed',     label: 'Bills passed' },
  { key: 'real_authoring',   label: 'Real authoring' },
  { key: 'total_shared',     label: 'All sponsorships' },
];

export default function PairsBrowse({ data }) {
  const [search, setSearch] = useState('');
  const [crossPartyOnly, setCrossPartyOnly] = useState(false);
  const [realAuthoringOnly, setRealAuthoringOnly] = useState(false);
  const [partyFilter, setPartyFilter] = useState('all');
  const [sortKey, setSortKey] = useState('bills_shared');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = data.pairs.filter((p) => {
      const a = data.legislators[p.leg_a_id];
      const b = data.legislators[p.leg_b_id];
      if (!a || !b) return false;
      if (q && !`${a.name} ${b.name}`.toLowerCase().includes(q)) return false;
      if (crossPartyOnly && !p.cross_party) return false;
      if (realAuthoringOnly && (p.bills_a_primary + p.bills_b_primary) === 0) return false;
      if (partyFilter !== 'all') {
        const ap = partyInitial(a.party), bp = partyInitial(b.party);
        const combo = [ap, bp].sort().join('-');
        if (combo !== partyFilter) return false;
      }
      return true;
    });
    result = result.sort((x, y) => {
      const score = (p) => sortKey === 'real_authoring'
        ? p.bills_a_primary + p.bills_b_primary
        : p[sortKey] ?? 0;
      return score(y) - score(x);
    });
    return result;
  }, [data, search, crossPartyOnly, realAuthoringOnly, partyFilter, sortKey]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

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
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by legislator name…"
            className="w-full pl-8 pr-8 py-2 text-sm border"
            style={{
              borderColor: 'var(--rule)', backgroundColor: 'var(--paper)',
              color: 'var(--ink)', fontFamily: 'inherit',
            }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(0); }}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--ink-soft)', cursor: 'pointer',
              }}>
              <X size={14} />
            </button>
          )}
        </div>
        <PartyFilter value={partyFilter} onChange={(v) => { setPartyFilter(v); setPage(0); }} />
        <ToggleChip active={crossPartyOnly}
          onClick={() => { setCrossPartyOnly(!crossPartyOnly); setPage(0); }}
          label="Cross-party only" />
        <ToggleChip active={realAuthoringOnly}
          onClick={() => { setRealAuthoringOnly(!realAuthoringOnly); setPage(0); }}
          label="Real authoring only" />
        <SortPicker value={sortKey} onChange={setSortKey} />
      </div>

      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
        Showing {pageRows.length.toLocaleString()} of {filtered.length.toLocaleString()} pairs
        {(crossPartyOnly || realAuthoringOnly || partyFilter !== 'all' || search) && (
          <button
            onClick={() => {
              setSearch(''); setCrossPartyOnly(false); setRealAuthoringOnly(false);
              setPartyFilter('all'); setPage(0);
            }}
            className="ml-3 underline"
            style={{ color: 'var(--accent)', cursor: 'pointer' }}>
            Clear filters
          </button>
        )}
      </div>

      <div>
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider border-b"
          style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
          <div className="col-span-5">Pair</div>
          <div className="col-span-1 text-right">Bills</div>
          <div className="col-span-1 text-right">Passed</div>
          <div className="col-span-2 text-right">A→B primary</div>
          <div className="col-span-2 text-right">B→A primary</div>
          <div className="col-span-1 text-right">Resolns</div>
        </div>

        {pageRows.length === 0 ? (
          <div className="text-sm italic py-6 text-center" style={{ color: 'var(--ink-soft)' }}>
            No pairs match your filters.
          </div>
        ) : (
          pageRows.map((p) => (
            <PairRow key={`${p.leg_a_id}-${p.leg_b_id}`} pair={p} legislators={data.legislators} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs"
          style={{ color: 'var(--ink-soft)' }}>
          <button disabled={page === 0} onClick={() => setPage(page - 1)}
            style={{
              opacity: page === 0 ? 0.3 : 1, cursor: page === 0 ? 'default' : 'pointer',
              padding: '4px 10px', border: '1px solid var(--rule)',
            }}>
            ← Previous
          </button>
          <span>Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
            style={{
              opacity: page >= totalPages - 1 ? 0.3 : 1,
              cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              padding: '4px 10px', border: '1px solid var(--rule)',
            }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function PairRow({ pair, legislators }) {
  const [expanded, setExpanded] = useState(false);
  const a = legislators[pair.leg_a_id];
  const b = legislators[pair.leg_b_id];
  return (
    <div className="border-b" style={{ borderColor: 'var(--rule)' }}>
      <div onClick={() => setExpanded(!expanded)}
        className="grid grid-cols-12 gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-[var(--hover)]"
        style={{ color: 'var(--ink)' }}>
        <div className="col-span-5 flex items-center gap-2">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <PairName leg={a} />
          <span style={{ color: 'var(--ink-soft)' }}>↔</span>
          <PairName leg={b} />
          {pair.cross_party && (
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 ml-1"
              style={{
                backgroundColor: 'var(--paper-warm)',
                color: 'var(--accent)', fontWeight: 600,
              }}>
              cross-party
            </span>
          )}
        </div>
        <div className="col-span-1 text-right tabular-nums">{pair.bills_shared}</div>
        <div className="col-span-1 text-right tabular-nums" style={{ color: 'var(--coverage-good)' }}>
          {pair.bills_passed}
        </div>
        <div className="col-span-2 text-right tabular-nums">{pair.bills_a_primary}</div>
        <div className="col-span-2 text-right tabular-nums">{pair.bills_b_primary}</div>
        <div className="col-span-1 text-right tabular-nums" style={{ color: 'var(--ink-soft)' }}>
          {pair.resolutions_shared}
        </div>
      </div>
      {expanded && <PairDetail pair={pair} a={a} b={b} />}
    </div>
  );
}

function PairDetail({ pair, a, b }) {
  const [showResolutions, setShowResolutions] = useState(false);
  const billsToShow = useMemo(() => {
    const all = pair.bills || [];
    // Sort: bills (non-resolutions) first, then by passed status, then by bill_number
    return all
      .filter((bill) => showResolutions ? true : bill.bill_class === 'bill')
      .sort((x, y) => {
        if (x.bill_class !== y.bill_class) {
          return x.bill_class === 'bill' ? -1 : 1;
        }
        if (x.passed !== y.passed) return x.passed ? -1 : 1;
        return (x.bill_number || '').localeCompare(y.bill_number || '');
      });
  }, [pair.bills, showResolutions]);

  return (
    <div className="px-9 pb-4 pt-1 space-y-3" style={{ backgroundColor: 'var(--paper-warm)' }}>
      <div className="grid grid-cols-3 gap-4 text-xs pt-3">
        <Stat label="One led, other backed" value={pair.bills_a_primary + pair.bills_b_primary} />
        <Stat label="Both cosponsored" value={pair.bills_both_co} />
        <Stat label="Total resolutions" value={pair.resolutions_shared} />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>
          Shared {showResolutions ? 'legislation' : 'bills'} · {billsToShow.length}
        </div>
        {pair.resolutions_shared > 0 && (
          <label className="text-[10px] flex items-center gap-1.5 cursor-pointer"
            style={{ color: 'var(--ink-soft)' }}>
            <input type="checkbox" checked={showResolutions}
              onChange={(e) => setShowResolutions(e.target.checked)} />
            Include resolutions
          </label>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto border" style={{ borderColor: 'var(--rule)' }}>
        {billsToShow.length === 0 ? (
          <div className="text-xs italic py-3 px-3" style={{ color: 'var(--ink-soft)' }}>
            No shared bills (this pair only collaborates on resolutions).
          </div>
        ) : (
          billsToShow.map((bill, i) => (
            <BillRow key={`${bill.bill_id}-${i}`} bill={bill}
              aName={a?.name} bName={b?.name} />
          ))
        )}
      </div>
    </div>
  );
}

function BillRow({ bill, aName, bName }) {
  // Build role note
  let roleNote;
  if (bill.a_role === 'primary' && bill.b_role === 'cosponsor') {
    roleNote = `${aName} led · ${bName} cosponsored`;
  } else if (bill.a_role === 'cosponsor' && bill.b_role === 'primary') {
    roleNote = `${bName} led · ${aName} cosponsored`;
  } else if (bill.a_role === 'primary' && bill.b_role === 'primary') {
    roleNote = `Both primary`;
  } else {
    roleNote = `Both cosponsored`;
  }

  // Truncate title for display, full title in tooltip
  const fullTitle = bill.title || '(no title)';
  const truncatedTitle = fullTitle.length > TITLE_MAX_CHARS
    ? fullTitle.slice(0, TITLE_MAX_CHARS).trim() + '…'
    : fullTitle;

  return (
    <div className="px-3 py-2 text-xs border-b"
      style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--paper)' }}>
      {/* Top row: bill number, type badge, status */}
      <div className="flex items-center gap-3 mb-1">
        <span className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
          {bill.bill_number || `#${bill.bill_id}`}
        </span>
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5"
          style={{
            backgroundColor: bill.bill_class === 'bill' ? 'var(--neutral-bg)' : 'var(--paper-warm)',
            color: 'var(--ink-soft)',
          }}>
          {bill.bill_class}
        </span>
        <span className="flex-grow" />
        <span className="text-[9px] uppercase tracking-wider"
          style={{ color: bill.passed ? 'var(--coverage-good)' : 'var(--ink-soft)' }}>
          {bill.passed ? 'Passed' : 'Died'}
        </span>
      </div>

      {/* Title — truncated, with hover tooltip showing full */}
      <div style={{ color: 'var(--ink)', lineHeight: 1.4, marginBottom: 3 }}
        title={fullTitle}>
        {truncatedTitle}
      </div>

      {/* Role note */}
      <div className="text-[10px] italic" style={{ color: 'var(--ink-soft)' }}>
        {roleNote}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider mb-0.5"
        style={{ color: 'var(--ink-soft)' }}>{label}</div>
      <div className="text-base tabular-nums" style={{ color: 'var(--ink)', fontWeight: 600 }}>
        {value?.toLocaleString() ?? 0}
      </div>
    </div>
  );
}

function ToggleChip({ active, onClick, label }) {
  return (
    <button onClick={onClick}
      className="text-xs px-3 py-1.5 transition-colors"
      style={{
        border: `1px solid ${active ? 'var(--ink)' : 'var(--rule)'}`,
        backgroundColor: active ? 'var(--ink)' : 'var(--paper)',
        color: active ? 'var(--paper)' : 'var(--ink-soft)',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
      }}>
      {label}
    </button>
  );
}

function PartyFilter({ value, onChange }) {
  const opts = [
    { key: 'all', label: 'All parties' },
    { key: 'D-R', label: 'D ↔ R' },
    { key: 'D-D', label: 'D ↔ D' },
    { key: 'R-R', label: 'R ↔ R' },
  ];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="text-xs px-2 py-1.5"
      style={{
        border: '1px solid var(--rule)',
        backgroundColor: 'var(--paper)',
        color: 'var(--ink)', fontFamily: 'inherit',
      }}>
      {opts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}

function SortPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
      <span>Sort:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="text-xs px-2 py-1.5"
        style={{
          border: '1px solid var(--rule)',
          backgroundColor: 'var(--paper)',
          color: 'var(--ink)', fontFamily: 'inherit',
        }}>
        {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
    </div>
  );
}
