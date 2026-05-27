// VotesBrowse — the workhorse functional tab.
// Search by bill number, filter by chamber/class/outcome/defection,
// click row to expand → shows who voted yes/no (loads members.json lazily).

import { useState, useMemo } from 'react';
import { Search, X, ChevronRight, ChevronDown } from 'lucide-react';
import { useStateData } from '../../lib/useStateData.js';
import { PartyDot, partyInitial, formatDate, VOTE_LABELS } from './VotesSection.jsx';

const PAGE_SIZE = 50;

const SORTS = [
  { key: 'vote_date_desc',    label: 'Most recent' },
  { key: 'closeness_asc',     label: 'Closest votes' },
  { key: 'defections_desc',   label: 'Most defections' },
  { key: 'total_desc',        label: 'Most votes cast' },
];

const CHAMBER_OPTIONS = [
  { key: 'all',    label: 'Both chambers' },
  { key: 'House',  label: 'House only' },
  { key: 'Senate', label: 'Senate only' },
];

export default function VotesBrowse({ abbr, data }) {
  const [search, setSearch] = useState('');
  const [chamber, setChamber] = useState('all');
  const [billsOnly, setBillsOnly] = useState(true);  // exclude resolutions by default
  const [excludeConsent, setExcludeConsent] = useState(true);  // exclude consent calendar by default
  const [hasDefections, setHasDefections] = useState(false);
  const [outcome, setOutcome] = useState('all'); // 'all' | 'passed' | 'failed'
  const [sortKey, setSortKey] = useState('vote_date_desc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = data.overview.votes.filter((v) => {
      if (q && !`${v.bill_number} ${v.title}`.toLowerCase().includes(q)) return false;
      if (chamber !== 'all' && v.chamber !== chamber) return false;
      if (billsOnly && v.bill_class !== 'bill') return false;
      if (excludeConsent && v.is_consent_calendar) return false;
      if (hasDefections && (v.dem_defectors + v.gop_defectors) < 2) return false;
      if (outcome === 'passed' && !v.passed) return false;
      if (outcome === 'failed' && v.passed) return false;
      return true;
    });

    // Sort
    if (sortKey === 'vote_date_desc') {
      result.sort((a, b) => b.vote_date.localeCompare(a.vote_date) || b.bill_vote_id - a.bill_vote_id);
    } else if (sortKey === 'closeness_asc') {
      result.sort((a, b) => a.closeness_score - b.closeness_score);
    } else if (sortKey === 'defections_desc') {
      result.sort((a, b) => (b.dem_defectors + b.gop_defectors) - (a.dem_defectors + a.gop_defectors));
    } else if (sortKey === 'total_desc') {
      result.sort((a, b) => b.total - a.total);
    }

    return result;
  }, [data, search, chamber, billsOnly, excludeConsent, hasDefections, outcome, sortKey]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

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
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by bill number or title…"
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

        <Select value={chamber} onChange={(v) => { setChamber(v); setPage(0); }}
                options={CHAMBER_OPTIONS} />

        <Select value={outcome} onChange={(v) => { setOutcome(v); setPage(0); }}
                options={[
                  { key: 'all',    label: 'All outcomes' },
                  { key: 'passed', label: 'Passed' },
                  { key: 'failed', label: 'Failed' },
                ]} />

        <ToggleChip active={billsOnly} onClick={() => { setBillsOnly(!billsOnly); setPage(0); }}
                    label="Bills only" />
        <ToggleChip active={excludeConsent} onClick={() => { setExcludeConsent(!excludeConsent); setPage(0); }}
                    label="Exclude consent" />
        <ToggleChip active={hasDefections} onClick={() => { setHasDefections(!hasDefections); setPage(0); }}
                    label="With defections" />

        <SortPicker value={sortKey} onChange={setSortKey} />
      </div>

      {/* Results count */}
      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
        Showing {pageRows.length.toLocaleString()} of {filtered.length.toLocaleString()} votes
      </div>

      {/* Table */}
      <div>
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider border-b"
          style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
          <div className="col-span-2">Bill / Date</div>
          <div className="col-span-5">Title</div>
          <div className="col-span-1 text-center">Ch</div>
          <div className="col-span-2 text-right">Tally</div>
          <div className="col-span-1 text-center">Defect</div>
          <div className="col-span-1 text-right">Result</div>
        </div>

        {pageRows.length === 0 ? (
          <div className="text-sm italic py-6 text-center" style={{ color: 'var(--ink-soft)' }}>
            No votes match your filters.
          </div>
        ) : (
          pageRows.map((v) => (
            <VoteRow key={v.bill_vote_id} vote={v} abbr={abbr}
                     legislatorsMap={data.legislators} />
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

// ----------------------------------------------------------------------------

function VoteRow({ vote, abbr, legislatorsMap }) {
  const [expanded, setExpanded] = useState(false);

  const titleTruncated = (vote.title || '').length > 70
    ? vote.title.slice(0, 70).trim() + '…'
    : vote.title;
  const totalDefectors = vote.dem_defectors + vote.gop_defectors;

  return (
    <div className="border-b" style={{ borderColor: 'var(--rule)' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="grid grid-cols-12 gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-[var(--hover)]"
        style={{ color: 'var(--ink)' }}
      >
        <div className="col-span-2 flex items-center gap-2">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <div>
            <div className="font-bold tabular-nums">{vote.bill_number}</div>
            <div className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
              {formatDate(vote.vote_date)}
            </div>
          </div>
        </div>
        <div className="col-span-5" title={vote.title}>
          {titleTruncated}
          {vote.is_consent_calendar && (
            <span className="text-[9px] uppercase tracking-wider ml-2 px-1.5"
              style={{
                backgroundColor: 'var(--paper-warm)',
                color: 'var(--ink-soft)',
              }}>
              consent
            </span>
          )}
        </div>
        <div className="col-span-1 text-center text-[10px]"
          style={{ color: 'var(--ink-soft)' }}>
          {vote.chamber === 'House' ? 'H' : vote.chamber === 'Senate' ? 'S' : '?'}
        </div>
        <div className="col-span-2 text-right tabular-nums text-xs">
          <span style={{ color: 'var(--coverage-good)' }}>Y {vote.yea}</span>
          {' · '}
          <span style={{ color: 'var(--accent)' }}>N {vote.nay}</span>
        </div>
        <div className="col-span-1 text-center tabular-nums">
          {totalDefectors > 0 ? (
            <span style={{
              color: totalDefectors >= 3 ? 'var(--accent)' : 'var(--ink-soft)',
              fontWeight: totalDefectors >= 3 ? 600 : 400,
            }}>
              {totalDefectors}
            </span>
          ) : (
            <span style={{ color: 'var(--ink-soft)' }}>—</span>
          )}
        </div>
        <div className="col-span-1 text-right text-[10px] uppercase tracking-wider"
          style={{ color: vote.passed ? 'var(--coverage-good)' : 'var(--accent)' }}>
          {vote.passed ? 'Passed' : 'Failed'}
        </div>
      </div>

      {expanded && <VoteDetail vote={vote} abbr={abbr} legislatorsMap={legislatorsMap} />}
    </div>
  );
}

function VoteDetail({ vote, abbr, legislatorsMap }) {
  // Lazy-load the members file ONLY when a vote is expanded
  const members = useStateData(abbr, 'votes_members');

  if (members.loading) {
    return (
      <div className="px-9 pb-4 pt-3 text-xs italic"
        style={{ backgroundColor: 'var(--paper-warm)', color: 'var(--ink-soft)' }}>
        Loading vote details…
      </div>
    );
  }
  if (members.error || !members.data) {
    return (
      <div className="px-9 pb-4 pt-3 text-xs italic"
        style={{ backgroundColor: 'var(--paper-warm)', color: 'var(--ink-soft)' }}>
        Unable to load vote details.
      </div>
    );
  }

  const voteMembers = members.data.votes_by_id[vote.bill_vote_id];
  if (!voteMembers) {
    return (
      <div className="px-9 pb-4 pt-3 text-xs italic"
        style={{ backgroundColor: 'var(--paper-warm)', color: 'var(--ink-soft)' }}>
        No member-level data for this vote.
      </div>
    );
  }

  // Build legislator quick lookup from the legislators data
  const legById = {};
  for (const l of legislatorsMap.legislators_active) {
    legById[l.id] = l;
  }
  for (const l of legislatorsMap.legislators_inactive) {
    legById[l.id] = l;
  }

  // Sort each group by party then name
  const sortMembers = (pids) => {
    return pids
      .map((pid) => legById[pid] || { id: pid, name: `(legislator ${pid})`, party: 'Unknown' })
      .sort((a, b) => {
        // Republican first (alphabetical inside party)
        if (a.party !== b.party) return a.party.localeCompare(b.party);
        return a.name.localeCompare(b.name);
      });
  };

  return (
    <div className="px-9 pb-4 pt-3 space-y-3" style={{ backgroundColor: 'var(--paper-warm)' }}>
      {/* Party breakdown summary */}
      <div className="grid grid-cols-4 gap-4 text-xs pb-3 border-b"
        style={{ borderColor: 'var(--rule)' }}>
        <PartyTally label="Dems" yea={vote.yea_dem} nay={vote.nay_dem} party="Democrat" />
        <PartyTally label="GOP" yea={vote.yea_gop} nay={vote.nay_gop} party="Republican" />
        <Stat label="Not voting" value={vote.nv} />
        <Stat label="Absent" value={vote.absent} />
      </div>

      {/* Member lists */}
      <div className="grid grid-cols-2 gap-4">
        <MemberList label={`Yea (${voteMembers.yea.length})`}
                    legs={sortMembers(voteMembers.yea)} accent="var(--coverage-good)" />
        <MemberList label={`Nay (${voteMembers.nay.length})`}
                    legs={sortMembers(voteMembers.nay)} accent="var(--accent)" />
      </div>

      {(voteMembers.nv.length > 0 || voteMembers.absent.length > 0) && (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t"
          style={{ borderColor: 'var(--rule)' }}>
          {voteMembers.nv.length > 0 && (
            <MemberList label={`Not Voting (${voteMembers.nv.length})`}
                        legs={sortMembers(voteMembers.nv)} accent="var(--ink-soft)" />
          )}
          {voteMembers.absent.length > 0 && (
            <MemberList label={`Absent (${voteMembers.absent.length})`}
                        legs={sortMembers(voteMembers.absent)} accent="var(--ink-soft)" />
          )}
        </div>
      )}
    </div>
  );
}

function MemberList({ label, legs, accent }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-1.5"
        style={{ color: accent, fontWeight: 600 }}>
        {label}
      </div>
      <div className="max-h-48 overflow-y-auto text-xs space-y-0.5">
        {legs.length === 0 ? (
          <div className="italic" style={{ color: 'var(--ink-soft)' }}>None</div>
        ) : legs.map((l) => (
          <div key={l.id} className="flex items-center gap-1.5">
            <PartyDot party={l.party} size={6} />
            <span style={{ color: 'var(--ink)' }}>{l.name}</span>
            <span className="text-[9px]" style={{ color: 'var(--ink-soft)' }}>
              ({partyInitial(l.party)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartyTally({ label, yea, nay, party }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider mb-0.5 flex items-center gap-1"
        style={{ color: 'var(--ink-soft)' }}>
        <PartyDot party={party} size={6} />
        {label}
      </div>
      <div className="tabular-nums" style={{ color: 'var(--ink)', fontWeight: 600 }}>
        Y {yea} · N {nay}
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

// ----------------------------------------------------------------------------

function ToggleChip({ active, onClick, label }) {
  return (
    <button onClick={onClick} className="text-xs px-3 py-1.5 transition-colors"
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
