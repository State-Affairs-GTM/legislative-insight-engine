// SponsorshipGrid v2 — merged Primary Sponsors tab.
// Sortable/filterable grid with inline expandable rows for per-legislator drill-down.
// Lazy-loads the detail JSON only when first row is expanded.
//
// V2 CHANGES from v1:
//   - Renamed "Led" → "Primary"
//   - Removed "Failed" column (implied by total - other outcomes)
//   - Added "Cosp. Passed" column (with caveat tooltip)
//   - Removed "Introduced" from default columns (kept available)
//   - Rows expand inline to show drill-down (stat tiles + bill lists)
//   - Detail JSON loaded lazily on first row expansion

import { useState, useMemo, useEffect } from 'react';
import { Search, X, ChevronUp, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useStateData } from '../../lib/useStateData.js';
import { PartyDot, partyInitial, OutcomeBadge, OUTCOME_META } from './SponsorshipSection.jsx';

const SHOW_INITIAL_BILLS = 15;

// Column definitions for the grid view
const COLUMNS_BILLS = [
  { key: 'name',                       label: 'Legislator',       width: 'col-span-3', align: 'left',  sortType: 'string' },
  { key: 'chamber',                    label: 'Ch.',              width: 'col-span-1', align: 'center', sortType: 'string' },
  { key: 'lead_count_bills',           label: 'Primary',          width: 'col-span-1', align: 'right', sortType: 'number', primary: true },
  { key: 'cosponsor_count_bills',      label: 'Cosp.',            width: 'col-span-1', align: 'right', sortType: 'number' },
  { key: 'lead_bills_passed',          label: 'Passed',           width: 'col-span-1', align: 'right', sortType: 'number' },
  { key: 'lead_bills_engrossed_plus',  label: 'Engrossed+',       width: 'col-span-1', align: 'right', sortType: 'number' },
  { key: 'cosponsor_bills_passed',     label: 'Cosp. Passed',     width: 'col-span-2', align: 'right', sortType: 'number', tooltip: 'Bills they cosponsored that became law. Reflects choice of primary sponsors, not personal authoring success.' },
  { key: 'passage_rate_bills_pct',     label: 'Pass Rate',        width: 'col-span-2', align: 'right', sortType: 'number', suffix: '%' },
];

const COLUMNS_RES = [
  { key: 'name',                       label: 'Legislator',       width: 'col-span-3', align: 'left',  sortType: 'string' },
  { key: 'chamber',                    label: 'Ch.',              width: 'col-span-1', align: 'center', sortType: 'string' },
  { key: 'lead_count_res',             label: 'Primary',          width: 'col-span-2', align: 'right', sortType: 'number', primary: true },
  { key: 'cosponsor_count_res',        label: 'Cosp.',            width: 'col-span-2', align: 'right', sortType: 'number' },
  { key: 'lead_res_passed',            label: 'Passed',           width: 'col-span-2', align: 'right', sortType: 'number' },
  { key: 'passage_rate_res_pct',       label: 'Pass Rate',        width: 'col-span-2', align: 'right', sortType: 'number', suffix: '%' },
];

export default function SponsorshipGrid({ abbr, data }) {
  const [search, setSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState('all');
  const [chamberFilter, setChamberFilter] = useState('all');
  const [billClass, setBillClass] = useState('bills');
  const [sortKey, setSortKey] = useState('lead_count_bills');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);

  // Lazy-load detail JSON only when needed (when first row gets expanded)
  const [shouldLoadDetail, setShouldLoadDetail] = useState(false);
  const detail = useStateData(abbr, shouldLoadDetail ? 'sponsorship_legislator_detail' : null);

  const columns = billClass === 'bills' ? COLUMNS_BILLS : COLUMNS_RES;

  // Re-key the sort key when switching bill class to a valid column
  useEffect(() => {
    if (billClass === 'resolutions' && (sortKey === 'lead_count_bills' || sortKey === 'cosponsor_count_bills' || sortKey === 'lead_bills_passed' || sortKey === 'lead_bills_engrossed_plus' || sortKey === 'cosponsor_bills_passed' || sortKey === 'passage_rate_bills_pct')) {
      // Map to resolution equivalent
      const mapping = {
        'lead_count_bills': 'lead_count_res',
        'cosponsor_count_bills': 'cosponsor_count_res',
        'lead_bills_passed': 'lead_res_passed',
        'lead_bills_engrossed_plus': 'lead_res_engrossed_plus',
        'passage_rate_bills_pct': 'passage_rate_res_pct',
      };
      setSortKey(mapping[sortKey] || 'lead_count_res');
    } else if (billClass === 'bills' && (sortKey === 'lead_count_res' || sortKey === 'cosponsor_count_res' || sortKey === 'lead_res_passed' || sortKey === 'passage_rate_res_pct')) {
      const mapping = {
        'lead_count_res': 'lead_count_bills',
        'cosponsor_count_res': 'cosponsor_count_bills',
        'lead_res_passed': 'lead_bills_passed',
        'passage_rate_res_pct': 'passage_rate_bills_pct',
      };
      setSortKey(mapping[sortKey] || 'lead_count_bills');
    }
  }, [billClass]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.overview.legislators.filter((l) => {
      if (q && !l.name.toLowerCase().includes(q)) return false;
      if (partyFilter !== 'all' && l.party !== partyFilter) return false;
      if (chamberFilter !== 'all' && l.chamber !== chamberFilter) return false;
      // Hide legislators with zero activity in current class
      const leadKey = billClass === 'bills' ? 'lead_count_bills' : 'lead_count_res';
      const cospKey = billClass === 'bills' ? 'cosponsor_count_bills' : 'cosponsor_count_res';
      if ((l[leadKey] || 0) === 0 && (l[cospKey] || 0) === 0) return false;
      return true;
    });
  }, [data, search, partyFilter, chamberFilter, billClass]);

  const sorted = useMemo(() => {
    const result = [...filtered];
    const dir = sortDir === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      if (sortKey === 'name' || sortKey === 'chamber') {
        return dir * String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
      }
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      return dir * (aVal - bVal);
    });
    return result;
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      const col = columns.find((c) => c.key === key);
      setSortDir(col?.sortType === 'number' ? 'desc' : 'asc');
    }
  };

  const handleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!shouldLoadDetail) setShouldLoadDetail(true);
    }
  };

  // Build detail lookup once detail data is available
  const detailById = useMemo(() => {
    if (!detail?.data) return {};
    const m = {};
    for (const l of detail.data.legislators) m[l.id] = l;
    return m;
  }, [detail?.data]);

  return (
    <div className="space-y-4">
      {/* Filters */}
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

        <Select value={partyFilter} onChange={setPartyFilter}
                options={[
                  { key: 'all', label: 'All parties' },
                  { key: 'Democrat', label: 'Democrats' },
                  { key: 'Republican', label: 'Republicans' },
                ]} />
        <Select value={chamberFilter} onChange={setChamberFilter}
                options={[
                  { key: 'all', label: 'Both chambers' },
                  { key: 'House', label: 'House' },
                  { key: 'Senate', label: 'Senate' },
                ]} />
        <ClassToggle value={billClass} onChange={setBillClass} />
      </div>

      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
        Showing {sorted.length.toLocaleString()} of {data.overview.legislators.length} legislators ·
        <span className="ml-1 italic">click column headers to sort, click any row to expand</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 900 }}>
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider border-b"
            style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
            {columns.map((col) => (
              <div key={col.key} className={`${col.width} ${alignClass(col.align)}`}>
                <button onClick={() => handleSort(col.key)}
                  className="inline-flex items-center gap-0.5 uppercase tracking-wider hover:opacity-80"
                  style={{
                    color: sortKey === col.key ? 'var(--ink)' : 'var(--ink-soft)',
                    fontWeight: sortKey === col.key ? 700 : 400,
                    cursor: 'pointer',
                  }}
                  title={col.tooltip}
                >
                  {col.label}
                  {col.tooltip && <Info size={9} style={{ opacity: 0.6 }} />}
                  {sortKey === col.key && (
                    sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Rows */}
          {sorted.length === 0 ? (
            <div className="text-sm italic py-6 text-center"
              style={{ color: 'var(--ink-soft)' }}>
              No legislators match your filters.
            </div>
          ) : (
            sorted.map((l) => (
              <GridRow key={l.id}
                       legislator={l}
                       columns={columns}
                       billClass={billClass}
                       isExpanded={expandedId === l.id}
                       onExpand={() => handleExpand(l.id)}
                       detail={detailById[l.id]}
                       detailLoading={detail?.loading && expandedId === l.id} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function GridRow({ legislator, columns, billClass, isExpanded, onExpand, detail, detailLoading }) {
  const l = legislator;

  return (
    <div className="border-b" style={{ borderColor: 'var(--rule)' }}>
      <div onClick={onExpand}
        className="grid grid-cols-12 gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--hover)]"
        style={{ color: 'var(--ink)' }}>
        {columns.map((col) => {
          const val = l[col.key];

          if (col.key === 'name') {
            return (
              <div key={col.key} className={`${col.width} flex items-center gap-2 min-w-0`}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <PartyDot party={l.party} size={8} />
                <span className="truncate" style={{ fontWeight: 600 }} title={l.name}>
                  {l.name}
                </span>
                <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--ink-soft)' }}>
                  ({partyInitial(l.party)})
                </span>
              </div>
            );
          }

          if (col.key === 'chamber') {
            return (
              <div key={col.key} className={`${col.width} text-center text-xs`} style={{ color: 'var(--ink-soft)' }}>
                {l.chamber}
              </div>
            );
          }

          // Numeric cells
          const rate = l.passage_rate_bills_pct || l.passage_rate_res_pct || 0;
          const isRate = col.key.includes('rate') || col.key.includes('pct');
          const rateColor = !isRate ? null
                          : rate >= 50 ? 'var(--coverage-good)'
                          : rate >= 20 ? 'var(--warn)'
                          : 'var(--ink-soft)';

          const display = (val === null || val === undefined) ? '—'
                        : (isRate && (l[billClass === 'bills' ? 'lead_count_bills' : 'lead_count_res'] || 0) === 0) ? '—'
                        : col.suffix ? `${val}${col.suffix}`
                        : val.toLocaleString();

          return (
            <div key={col.key} className={`${col.width} text-right tabular-nums`}
              style={{
                color: rateColor || (col.primary ? 'var(--ink)' : 'var(--ink-soft)'),
                fontWeight: col.primary || isRate ? 600 : 400,
              }}>
              {display}
            </div>
          );
        })}
      </div>

      {isExpanded && (
        <div className="px-9 pb-4 pt-3 space-y-4" style={{ backgroundColor: 'var(--paper-warm)' }}>
          {detailLoading ? (
            <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
              Loading bill details…
            </div>
          ) : !detail ? (
            <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
              Unable to load bill details for this legislator.
            </div>
          ) : (
            <LegislatorDetail leg={detail} />
          )}
        </div>
      )}
    </div>
  );
}

function LegislatorDetail({ leg }) {
  const [activeList, setActiveList] = useState('led');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const bills = activeList === 'led' ? leg.bills_led : leg.bills_cosponsored;

  const filtered = useMemo(() => {
    if (outcomeFilter === 'all') return bills;
    return bills.filter((b) => b.outcome === outcomeFilter);
  }, [bills, outcomeFilter]);

  const visible = showAll ? filtered : filtered.slice(0, SHOW_INITIAL_BILLS);

  const outcomeCounts = useMemo(() => {
    const counts = {};
    for (const b of bills) counts[b.outcome] = (counts[b.outcome] || 0) + 1;
    return counts;
  }, [bills]);

  const s = leg.summary;

  return (
    <div className="space-y-3">
      {/* Stat tiles */}
      <div className="grid grid-cols-4 gap-3">
        <StatTile label="Bills primary" value={s.lead_count_bills} primary />
        <StatTile label="Bills cosp." value={s.cosponsor_count_bills} />
        <StatTile label="Bills passed (primary)" value={s.lead_bills_passed} accent="var(--coverage-good)" />
        <StatTile label="Passage rate"
                  value={s.lead_count_bills > 0 ? `${s.passage_rate_bills_pct}%` : '—'} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatTile label="Engrossed+ (primary)" value={s.lead_bills_engrossed_plus} sub />
        <StatTile label="Cosp. passed" value={s.cosponsor_bills_passed} sub
                  tooltip="Bills they cosponsored that became law" />
        <StatTile label="Avg cosp. when primary" value={s.avg_cosponsors_when_lead?.toFixed(1) ?? '—'} sub />
        <StatTile label="Solo (0 cosp.) primary" value={s.lone_wolf_lead_bills} sub />
      </div>

      {(s.lead_count_res > 0 || s.cosponsor_count_res > 0) && (
        <div className="pt-3 border-t" style={{ borderColor: 'var(--rule)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-2"
            style={{ color: 'var(--ink-soft)' }}>
            Resolutions (separate from bills)
          </div>
          <div className="grid grid-cols-4 gap-3">
            <StatTile label="Resolutions primary" value={s.lead_count_res} sub />
            <StatTile label="Resolutions cosp." value={s.cosponsor_count_res} sub />
            <StatTile label="Joint sponsorships" value={s.joint_count} sub />
          </div>
        </div>
      )}

      {/* Bill list toggle */}
      <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2"
        style={{ borderColor: 'var(--rule)' }}>
        <div className="inline-flex border" style={{ borderColor: 'var(--rule)' }}>
          {[
            { key: 'led',         label: `Primary (${leg.bills_led.length})` },
            { key: 'cosponsored', label: `Cosp. (${leg.bills_cosponsored.length})` },
          ].map((o) => {
            const active = activeList === o.key;
            return (
              <button key={o.key}
                onClick={() => { setActiveList(o.key); setOutcomeFilter('all'); setShowAll(false); }}
                className="text-xs px-3 py-1.5 transition-colors"
                style={{
                  backgroundColor: active ? 'var(--ink)' : 'var(--paper)',
                  color: active ? 'var(--paper)' : 'var(--ink-soft)',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                }}>
                {o.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => { setOutcomeFilter('all'); setShowAll(false); }}
            className="text-[10px] uppercase tracking-wider px-2 py-1"
            style={{
              border: `1px solid ${outcomeFilter === 'all' ? 'var(--ink)' : 'var(--rule)'}`,
              backgroundColor: outcomeFilter === 'all' ? 'var(--ink)' : 'var(--paper)',
              color: outcomeFilter === 'all' ? 'var(--paper)' : 'var(--ink-soft)',
              cursor: 'pointer',
              fontWeight: outcomeFilter === 'all' ? 600 : 400,
            }}>
            All ({bills.length})
          </button>
          {Object.entries(OUTCOME_META).map(([key, meta]) => {
            const count = outcomeCounts[key] || 0;
            if (count === 0) return null;
            const active = outcomeFilter === key;
            return (
              <button key={key}
                onClick={() => { setOutcomeFilter(key); setShowAll(false); }}
                className="text-[10px] uppercase tracking-wider px-2 py-1"
                style={{
                  border: `1px solid ${active ? meta.color : 'var(--rule)'}`,
                  backgroundColor: active ? meta.color : 'var(--paper)',
                  color: active ? 'var(--paper)' : meta.color,
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                }}>
                {meta.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Bill list */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <div className="text-sm italic py-4 text-center" style={{ color: 'var(--ink-soft)' }}>
            No bills match this filter.
          </div>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto space-y-1">
              {visible.map((b) => <BillRow key={b.bill_id} bill={b} activeList={activeList} />)}
            </div>
            {filtered.length > SHOW_INITIAL_BILLS && !showAll && (
              <button onClick={() => setShowAll(true)}
                className="text-xs underline mt-2"
                style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                Show all {filtered.length} bills
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BillRow({ bill, activeList }) {
  const titleTruncated = (bill.title || '').length > 90
    ? bill.title.slice(0, 90).trim() + '…'
    : bill.title;

  return (
    <div className="px-3 py-1.5 border text-sm"
      style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--paper)' }}>
      <div className="flex items-baseline gap-3 mb-0.5">
        <span className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
          {bill.bill_number}
        </span>
        {bill.bill_class === 'resolution' && (
          <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Res.</span>
        )}
        {bill.is_constitutional_amendment && (
          <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--accent)' }}>CA</span>
        )}
        {activeList === 'led' && bill.cosponsor_count > 0 && (
          <span className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
            · {bill.cosponsor_count} cosp.
          </span>
        )}
        {activeList === 'cosponsored' && (
          <span className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
            · cosp. #{bill.sponsor_order}
          </span>
        )}
        <span className="flex-grow" />
        <OutcomeBadge outcome={bill.outcome} />
      </div>
      <div className="text-xs" style={{ color: 'var(--ink)' }} title={bill.title}>
        {titleTruncated}
      </div>
    </div>
  );
}

function StatTile({ label, value, primary = false, sub = false, accent, tooltip }) {
  return (
    <div className="p-2 border" style={{
      borderColor: 'var(--rule)',
      backgroundColor: primary ? 'var(--paper)' : 'var(--paper)',
    }} title={tooltip}>
      <div className="text-[9px] uppercase tracking-wider mb-1 flex items-center gap-1"
        style={{ color: 'var(--ink-soft)' }}>
        {label}
        {tooltip && <Info size={9} style={{ opacity: 0.5 }} />}
      </div>
      <div className={`tabular-nums ${sub ? 'text-sm' : 'text-lg'}`}
        style={{
          color: accent || 'var(--ink)',
          fontWeight: primary ? 700 : 600,
        }}>
        {value}
      </div>
    </div>
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

function ClassToggle({ value, onChange }) {
  return (
    <div className="inline-flex border" style={{ borderColor: 'var(--rule)' }}>
      {[
        { key: 'bills',       label: 'Bills' },
        { key: 'resolutions', label: 'Resolutions' },
      ].map((o) => {
        const active = value === o.key;
        return (
          <button key={o.key} onClick={() => onChange(o.key)}
            className="text-xs px-3 py-1.5 transition-colors"
            style={{
              backgroundColor: active ? 'var(--ink)' : 'var(--paper)',
              color: active ? 'var(--paper)' : 'var(--ink-soft)',
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
