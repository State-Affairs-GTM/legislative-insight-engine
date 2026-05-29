// VotesByLegislator v2 — headline defection rate (substantive + concurrence)
// with per-category breakdown shown in drill-down. Each defection row tagged with its category.

import { useState, useMemo } from 'react';
import { Search, X, ChevronRight, ChevronDown } from 'lucide-react';
import {
  PartyDot, partyInitial, formatDate, VOTE_LABELS, CategoryBadge, formatPassageResult,
} from './VotesSection.jsx';

const SECTIONS = [
  { key: 'defectors',   label: 'Most Defectors',
    desc: 'Legislators who break with their party most often on substantive votes (passage + concurrence on bills). Real policy dissent.' },
  { key: 'loyal',       label: 'Most Loyal',
    desc: 'Highest party unity on substantive votes. Lockstep voters.' },
  { key: 'absent',      label: 'Most Absent',
    desc: 'Active legislators with the highest non-voting rate (NV + Absent across all roll calls).' },
  { key: 'all',         label: 'Browse All',
    desc: 'Search and filter all active legislators with their full voting records.' },
];

export default function VotesByLegislator({ data }) {
  const [section, setSection] = useState('defectors');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => {
          const isActive = s.key === section;
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
            </button>
          );
        })}
      </div>

      <div className="text-xs italic" style={{ color: 'var(--ink-soft)' }}>
        {SECTIONS.find((s) => s.key === section)?.desc}
      </div>

      {section === 'defectors' && (
        <LeaderboardList items={data.legislators.leaderboards.top_defectors}
                         allLegs={data.legislators.legislators_active}
                         primaryMetric="defection_pct_headline"
                         primaryLabel="Defect % (subst.)"
                         secondaryMetric="defections_headline"
                         secondaryLabel="# subst. defections"
                         tertiaryMetric="defection_pct_all"
                         tertiaryLabel="All defect %" />
      )}
      {section === 'loyal' && (
        <LeaderboardList items={data.legislators.leaderboards.most_loyal}
                         allLegs={data.legislators.legislators_active}
                         primaryMetric="unity_pct_headline"
                         primaryLabel="Unity % (subst.)"
                         secondaryMetric="defections_headline"
                         secondaryLabel="# defections" />
      )}
      {section === 'absent' && (
        <LeaderboardList items={data.legislators.leaderboards.most_absent}
                         allLegs={data.legislators.legislators_active}
                         primaryMetric="non_vote_pct"
                         primaryLabel="Non-vote %"
                         secondaryMetric="votes_cast"
                         secondaryLabel="votes cast" />
      )}
      {section === 'all' && (
        <BrowseAll legislators={data.legislators.legislators_active} />
      )}
    </div>
  );
}

function LeaderboardList({ items, allLegs, primaryMetric, primaryLabel, secondaryMetric, secondaryLabel, tertiaryMetric, tertiaryLabel }) {
  const legById = useMemo(() => {
    const m = {};
    for (const l of allLegs) m[l.id] = l;
    return m;
  }, [allLegs]);

  if (!items || items.length === 0) {
    return (
      <div className="text-sm italic py-6 text-center" style={{ color: 'var(--ink-soft)' }}>
        No legislators in this view.
      </div>
    );
  }

  const hasTertiary = !!tertiaryMetric;

  return (
    <div>
      <div className={`grid gap-2 px-3 py-2 text-[10px] uppercase tracking-wider border-b ${hasTertiary ? 'grid-cols-12' : 'grid-cols-12'}`}
        style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
        <div className="col-span-1 text-right">#</div>
        <div className={hasTertiary ? "col-span-4" : "col-span-5"}>Legislator</div>
        <div className="col-span-2 text-center">Chamber</div>
        <div className={hasTertiary ? "col-span-2 text-right" : "col-span-2 text-right"}>{primaryLabel}</div>
        <div className={hasTertiary ? "col-span-1 text-right" : "col-span-2 text-right"}>{secondaryLabel}</div>
        {hasTertiary && <div className="col-span-2 text-right">{tertiaryLabel}</div>}
      </div>

      {items.map((item, i) => {
        const fullLeg = legById[item.id];
        return (
          <LeaderboardRow key={item.id} rank={i + 1} item={item} fullLeg={fullLeg}
                          primaryMetric={primaryMetric} secondaryMetric={secondaryMetric}
                          tertiaryMetric={tertiaryMetric} hasTertiary={hasTertiary} />
        );
      })}
    </div>
  );
}

function LeaderboardRow({ rank, item, fullLeg, primaryMetric, secondaryMetric, tertiaryMetric, hasTertiary }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = fullLeg && fullLeg.defections && fullLeg.defections.length > 0;

  return (
    <div className="border-b" style={{ borderColor: 'var(--rule)' }}>
      <div
        onClick={() => canExpand && setExpanded(!expanded)}
        className={`grid grid-cols-12 gap-2 px-3 py-2.5 text-sm ${canExpand ? 'cursor-pointer hover:bg-[var(--hover)]' : ''}`}
        style={{ color: 'var(--ink)' }}
      >
        <div className="col-span-1 text-right tabular-nums" style={{ color: 'var(--ink-soft)' }}>
          {rank}.
        </div>
        <div className={hasTertiary ? "col-span-4 flex items-center gap-2" : "col-span-5 flex items-center gap-2"}>
          {canExpand && (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
          {!canExpand && <span style={{ width: 14 }} />}
          <PartyDot party={item.party} size={8} />
          <span style={{ fontWeight: 600 }}>{item.name}</span>
          <span className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
            ({partyInitial(item.party)})
          </span>
        </div>
        <div className="col-span-2 text-center text-xs" style={{ color: 'var(--ink-soft)' }}>
          {item.chamber}
        </div>
        <div className={hasTertiary ? "col-span-2 text-right tabular-nums" : "col-span-2 text-right tabular-nums"}
          style={{ fontWeight: 600 }}>
          {formatMetric(primaryMetric, item[primaryMetric])}
        </div>
        <div className={hasTertiary ? "col-span-1 text-right tabular-nums" : "col-span-2 text-right tabular-nums"}
          style={{ color: 'var(--ink-soft)' }}>
          {formatMetric(secondaryMetric, item[secondaryMetric])}
        </div>
        {hasTertiary && (
          <div className="col-span-2 text-right tabular-nums text-xs"
            style={{ color: 'var(--ink-soft)' }}>
            {formatMetric(tertiaryMetric, item[tertiaryMetric])}
          </div>
        )}
      </div>

      {expanded && fullLeg && <LegislatorDrillDown leg={fullLeg} />}
    </div>
  );
}

function formatMetric(key, value) {
  if (value == null) return '—';
  if (key.endsWith('_pct') || key.endsWith('_pct_headline') || key.endsWith('_pct_all') || key === 'non_vote_pct') {
    return `${value}%`;
  }
  return value.toLocaleString();
}

function LegislatorDrillDown({ leg }) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const SHOW_INITIAL = 10;

  // Filter defections by selected category
  const filteredDefections = useMemo(() => {
    if (categoryFilter === 'all') return leg.defections;
    if (categoryFilter === 'substantive_only') {
      return leg.defections.filter((d) => d.vote_category === 'substantive' || d.vote_category === 'concurrence');
    }
    return leg.defections.filter((d) => d.vote_category === categoryFilter);
  }, [leg.defections, categoryFilter]);

  const visibleDefections = showAll ? filteredDefections : filteredDefections.slice(0, SHOW_INITIAL);

  // Build category breakdown counts
  const breakdown = useMemo(() => {
    const counts = { substantive: 0, concurrence: 0, amendment: 0, procedural: 0, constitutional_amendment: 0, other: 0 };
    for (const d of leg.defections) {
      counts[d.vote_category] = (counts[d.vote_category] || 0) + 1;
    }
    return counts;
  }, [leg.defections]);

  return (
    <div className="px-9 pb-4 pt-3 space-y-3" style={{ backgroundColor: 'var(--paper-warm)' }}>
      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4 text-xs pb-3 border-b"
        style={{ borderColor: 'var(--rule)' }}>
        <Stat label="Votes cast" value={leg.votes_cast.toLocaleString()} />
        <Stat label="Unity % (substantive)" value={`${leg.unity_pct_headline}%`} />
        <Stat label="Defections (substantive)" value={leg.defections_headline.toLocaleString()} accent />
        <Stat label="Non-vote rate" value={`${leg.non_vote_pct}%`} />
      </div>

      {/* Breakdown by category */}
      <div className="text-[10px] uppercase tracking-wider"
        style={{ color: 'var(--ink-soft)' }}>
        Defections by category · {leg.defections.length} total
      </div>
      <div className="flex flex-wrap gap-1.5 items-center text-xs">
        <FilterChip label={`All (${leg.defections.length})`} active={categoryFilter === 'all'}
                    onClick={() => { setCategoryFilter('all'); setShowAll(false); }} />
        <FilterChip label={`Substantive (${breakdown.substantive + breakdown.concurrence})`}
                    active={categoryFilter === 'substantive_only'}
                    onClick={() => { setCategoryFilter('substantive_only'); setShowAll(false); }} />
        {breakdown.amendment > 0 && (
          <FilterChip label={`Amendment (${breakdown.amendment})`}
                      active={categoryFilter === 'amendment'}
                      onClick={() => { setCategoryFilter('amendment'); setShowAll(false); }} />
        )}
        {breakdown.procedural > 0 && (
          <FilterChip label={`Procedural (${breakdown.procedural})`}
                      active={categoryFilter === 'procedural'}
                      onClick={() => { setCategoryFilter('procedural'); setShowAll(false); }} />
        )}
        {breakdown.constitutional_amendment > 0 && (
          <FilterChip label={`Const. Amend. (${breakdown.constitutional_amendment})`}
                      active={categoryFilter === 'constitutional_amendment'}
                      onClick={() => { setCategoryFilter('constitutional_amendment'); setShowAll(false); }} />
        )}
      </div>

      {/* Defection rows */}
      <div>
        {filteredDefections.length === 0 ? (
          <div className="text-xs italic" style={{ color: 'var(--ink-soft)' }}>
            No defections in this category.
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {visibleDefections.map((d, i) => (
              <DefectionRow key={`${d.bvid}-${i}`} defection={d} />
            ))}
            {filteredDefections.length > SHOW_INITIAL && !showAll && (
              <button onClick={() => setShowAll(true)}
                className="text-xs underline mt-2"
                style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                Show all {filteredDefections.length} defections
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className="text-[11px] px-2 py-1 transition-colors"
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

function DefectionRow({ defection }) {
  const titleTruncated = (defection.title || '').length > 80
    ? defection.title.slice(0, 80).trim() + '…'
    : defection.title;

  return (
    <div className="px-3 py-2 border" style={{
      borderColor: 'var(--rule)', backgroundColor: 'var(--paper)',
    }}>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
          {defection.bill_number}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
          {formatDate(defection.vote_date)}
        </span>
        <span className="text-[9px] uppercase tracking-wider"
          style={{ color: 'var(--ink-soft)' }}>
          {defection.chamber}
        </span>
        <CategoryBadge category={defection.vote_category} compact />
        <span className="flex-grow" />
        <span className="text-[10px]" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          Voted {VOTE_LABELS[defection.their_vote]}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
          (party: {VOTE_LABELS[defection.party_position]})
        </span>
        <span className="text-[9px] uppercase tracking-wider"
          style={{ color: defection.passed ? 'var(--coverage-good)' : 'var(--ink-soft)' }}>
          {defection.passed ? 'Passed' : 'Failed'}
        </span>
      </div>
      <div className="text-xs" style={{ color: 'var(--ink)' }} title={defection.title}>
        {titleTruncated}
      </div>
      {defection.later_flipped && defection.later_vote && (
        <div className="text-[10px] mt-1 italic"
          style={{ color: 'var(--accent)' }}>
          ↻ Later voted {VOTE_LABELS[defection.later_vote.vote_id]} on {formatDate(defection.later_vote.vote_date)}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider mb-0.5"
        style={{ color: 'var(--ink-soft)' }}>{label}</div>
      <div className="text-base tabular-nums" style={{
        color: accent ? 'var(--accent)' : 'var(--ink)', fontWeight: 600,
      }}>
        {value}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------

function BrowseAll({ legislators }) {
  const [search, setSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState('all');
  const [chamberFilter, setChamberFilter] = useState('all');
  const [sortKey, setSortKey] = useState('defection_pct_headline_desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = legislators.filter((l) => {
      if (q && !l.name.toLowerCase().includes(q)) return false;
      if (partyFilter !== 'all' && l.party !== partyFilter) return false;
      if (chamberFilter !== 'all' && l.chamber !== chamberFilter) return false;
      return true;
    });

    if (sortKey === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === 'defection_pct_headline_desc') {
      result.sort((a, b) => b.defection_pct_headline - a.defection_pct_headline);
    } else if (sortKey === 'unity_desc') {
      result.sort((a, b) => b.unity_pct_headline - a.unity_pct_headline);
    } else if (sortKey === 'absent_desc') {
      result.sort((a, b) => b.non_vote_pct - a.non_vote_pct);
    }

    return result;
  }, [legislators, search, partyFilter, chamberFilter, sortKey]);

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

        <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)}
          className="text-xs px-2 py-1.5"
          style={{
            border: '1px solid var(--rule)', backgroundColor: 'var(--paper)',
            color: 'var(--ink)', fontFamily: 'inherit',
          }}>
          <option value="all">All parties</option>
          <option value="Democrat">Democrats</option>
          <option value="Republican">Republicans</option>
        </select>

        <select value={chamberFilter} onChange={(e) => setChamberFilter(e.target.value)}
          className="text-xs px-2 py-1.5"
          style={{
            border: '1px solid var(--rule)', backgroundColor: 'var(--paper)',
            color: 'var(--ink)', fontFamily: 'inherit',
          }}>
          <option value="all">Both chambers</option>
          <option value="House">House</option>
          <option value="Senate">Senate</option>
        </select>

        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}
          className="text-xs px-2 py-1.5"
          style={{
            border: '1px solid var(--rule)', backgroundColor: 'var(--paper)',
            color: 'var(--ink)', fontFamily: 'inherit',
          }}>
          <option value="defection_pct_headline_desc">Most defections first (substantive)</option>
          <option value="unity_desc">Highest party unity (substantive)</option>
          <option value="absent_desc">Most absent</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
        Showing {filtered.length} of {legislators.length} legislators
      </div>

      <div>
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider border-b"
          style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
          <div className="col-span-4">Legislator</div>
          <div className="col-span-2 text-center">Chamber</div>
          <div className="col-span-1 text-right">Cast</div>
          <div className="col-span-2 text-right">Unity% (subst.)</div>
          <div className="col-span-1 text-right">Defect</div>
          <div className="col-span-2 text-right">Non-vote %</div>
        </div>

        {filtered.map((l) => <BrowseAllRow key={l.id} leg={l} />)}
      </div>
    </div>
  );
}

function BrowseAllRow({ leg }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = leg.defections && leg.defections.length > 0;

  return (
    <div className="border-b" style={{ borderColor: 'var(--rule)' }}>
      <div
        onClick={() => canExpand && setExpanded(!expanded)}
        className={`grid grid-cols-12 gap-2 px-3 py-2 text-sm ${canExpand ? 'cursor-pointer hover:bg-[var(--hover)]' : ''}`}
        style={{ color: 'var(--ink)' }}
      >
        <div className="col-span-4 flex items-center gap-2">
          {canExpand && (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
          {!canExpand && <span style={{ width: 14 }} />}
          <PartyDot party={leg.party} size={8} />
          <span>{leg.name}</span>
        </div>
        <div className="col-span-2 text-center text-xs" style={{ color: 'var(--ink-soft)' }}>
          {leg.chamber}
        </div>
        <div className="col-span-1 text-right tabular-nums text-xs"
          style={{ color: 'var(--ink-soft)' }}>
          {leg.votes_cast.toLocaleString()}
        </div>
        <div className="col-span-2 text-right tabular-nums">
          {leg.unity_pct_headline}%
        </div>
        <div className="col-span-1 text-right tabular-nums">
          {leg.defections_headline}
        </div>
        <div className="col-span-2 text-right tabular-nums"
          style={{ color: leg.non_vote_pct >= 20 ? 'var(--accent)' : 'var(--ink-soft)' }}>
          {leg.non_vote_pct}%
        </div>
      </div>

      {expanded && <LegislatorDrillDown leg={leg} />}
    </div>
  );
}
