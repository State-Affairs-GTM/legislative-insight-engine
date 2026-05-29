// NotableVotes v2 — adds two new sub-sections:
//   * Failed Constitutional Amendments (passed simple majority, failed 2/3)
//   * Amendment Defections (3+ defectors on a floor amendment)

import { useState } from 'react';
import {
  PartyDot, partyInitial, formatDate, CategoryBadge, formatPassageResult,
} from './VotesSection.jsx';

const SECTIONS = [
  { key: 'closest',          label: 'Closest Votes',
    desc: 'Substantive bills decided by the slimmest margins.' },
  { key: 'big_defections',   label: 'Major Defections',
    desc: '3+ legislators broke with their party on a clear party-position bill (substantive votes).' },
  { key: 'mild_defections',  label: 'Mild Defections',
    desc: 'Exactly 2 legislators broke with their party on a substantive vote.' },
  { key: 'amendment_defections', label: 'Amendment Defections',
    desc: '3+ legislators broke with their party on a floor amendment. Different signal than substantive defections.' },
  { key: 'failed_const',     label: 'Failed Const. Amendments',
    desc: 'Constitutional amendments that got a simple majority but failed the required 2/3 supermajority. (E.g. HR 1114.)' },
  { key: 'reversals',        label: 'Same-Bill Reversals',
    desc: "Bills that flipped between Pass and Fail across substantive votes — usually amendment cycles." },
  { key: 'resolutions',      label: 'Notable Resolutions',
    desc: 'Resolutions where 3+ legislators voted Nay on the substantive adoption vote.' },
];

export default function NotableVotes({ data }) {
  const [section, setSection] = useState('closest');
  const { notable } = data.overview;

  // Hide a section if it's empty
  const sectionCounts = {
    closest:             notable.closest?.length || 0,
    big_defections:      notable.big_defections?.length || 0,
    mild_defections:     notable.mild_defections?.length || 0,
    amendment_defections: notable.amendment_defections?.length || 0,
    failed_const:        notable.failed_const_amendments?.length || 0,
    reversals:           notable.same_bill_reversals?.length || 0,
    resolutions:         notable.notable_resolutions?.length || 0,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => {
          const isActive = s.key === section;
          const count = sectionCounts[s.key];
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

      {section === 'closest'              && <List votes={notable.closest} fmt={(v) => `Margin: ${Math.abs(v.yea - v.nay)} votes`} />}
      {section === 'big_defections'       && <DefectionList votes={notable.big_defections} />}
      {section === 'mild_defections'      && <DefectionList votes={notable.mild_defections} />}
      {section === 'amendment_defections' && <DefectionList votes={notable.amendment_defections} />}
      {section === 'failed_const'         && <FailedConstList votes={notable.failed_const_amendments} />}
      {section === 'reversals'            && <ReversalsList reversals={notable.same_bill_reversals} />}
      {section === 'resolutions'          && <List votes={notable.notable_resolutions} fmt={(v) => `${v.nay} Nay votes on resolution`} />}
    </div>
  );
}

function List({ votes, fmt }) {
  if (!votes || votes.length === 0) return <Empty />;
  return (
    <div className="space-y-2">
      {votes.map((v) => <VoteCard key={v.bill_vote_id} vote={v} highlight={fmt(v)} />)}
    </div>
  );
}

function DefectionList({ votes }) {
  if (!votes || votes.length === 0) return <Empty />;
  return (
    <div className="space-y-2">
      {votes.map((v) => {
        const note = [];
        if (v.gop_defectors > 0) note.push(`${v.gop_defectors} GOP defected`);
        if (v.dem_defectors > 0) note.push(`${v.dem_defectors} Dem defected`);
        return (
          <VoteCard key={v.bill_vote_id} vote={v} highlight={note.join(' · ')} />
        );
      })}
    </div>
  );
}

function FailedConstList({ votes }) {
  if (!votes || votes.length === 0) return <Empty />;
  return (
    <div className="space-y-2">
      {votes.map((v) => {
        const total = v.yea + v.nay;
        const pct = total > 0 ? ((v.yea / total) * 100).toFixed(1) : '0';
        const needed = Math.ceil(total * 2 / 3);
        const shortBy = needed - v.yea;
        return (
          <VoteCard
            key={v.bill_vote_id}
            vote={v}
            highlight={`${pct}% Yea · needed 66.7% (short by ${shortBy} votes)`}
          />
        );
      })}
    </div>
  );
}

function ReversalsList({ reversals }) {
  if (!reversals || reversals.length === 0) return <Empty />;
  return (
    <div className="space-y-3">
      {reversals.map((r) => <ReversalCard key={r.bill_id} reversal={r} />)}
    </div>
  );
}

function VoteCard({ vote, highlight }) {
  const titleTruncated = (vote.title || '').length > 100
    ? vote.title.slice(0, 100).trim() + '…'
    : vote.title;
  const result = formatPassageResult(vote);

  return (
    <div className="p-3 border" style={{
      borderColor: 'var(--rule)', backgroundColor: 'var(--paper)',
    }}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0" style={{ minWidth: 90 }}>
          <div className="font-bold" style={{ color: 'var(--ink)' }}>
            {vote.bill_number}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
            {formatDate(vote.vote_date)}
          </div>
          <div className="text-[9px] uppercase tracking-wider mt-0.5"
            style={{ color: 'var(--ink-soft)' }}>
            {vote.chamber}
          </div>
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CategoryBadge category={vote.vote_category} />
          </div>
          <div className="text-sm mb-1" title={vote.title} style={{ color: 'var(--ink)' }}>
            {titleTruncated}
          </div>
          {highlight && (
            <div className="text-[11px] mt-1" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {highlight}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-right" style={{ minWidth: 130 }}>
          <div className="text-xs tabular-nums">
            <span style={{ color: 'var(--coverage-good)' }}>Y {vote.yea}</span>
            {' · '}
            <span style={{ color: 'var(--accent)' }}>N {vote.nay}</span>
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Y D{vote.yea_dem}/R{vote.yea_gop} · N D{vote.nay_dem}/R{vote.nay_gop}
          </div>
          <div className="text-[9px] uppercase tracking-wider mt-1"
            style={{ color: result.color, fontWeight: 600 }}>
            {result.label}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReversalCard({ reversal }) {
  return (
    <div className="p-3 border" style={{
      borderColor: 'var(--rule)', backgroundColor: 'var(--paper)',
    }}>
      <div className="flex items-baseline gap-3 mb-2">
        <div className="font-bold" style={{ color: 'var(--ink)' }}>
          {reversal.bill_number}
        </div>
        <div className="text-xs flex-grow" style={{ color: 'var(--ink-soft)' }}>
          {reversal.title.length > 90 ? reversal.title.slice(0, 90) + '…' : reversal.title}
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--ink-soft)' }}>
        Substantive vote sequence
      </div>
      <div className="space-y-1">
        {reversal.votes.map((v) => (
          <div key={v.bvid} className="flex items-center gap-3 text-xs"
            style={{ color: 'var(--ink)' }}>
            <span className="tabular-nums w-12" style={{ color: 'var(--ink-soft)' }}>
              {formatDate(v.date)}
            </span>
            <span className="flex-grow text-[11px]" style={{ color: 'var(--ink-soft)' }}>
              {v.desc.replace(/: \w+ Vote #\d+$/, '')}
            </span>
            <span className="tabular-nums text-[11px]">
              <span style={{ color: 'var(--coverage-good)' }}>Y {v.yea}</span>
              {' · '}
              <span style={{ color: 'var(--accent)' }}>N {v.nay}</span>
            </span>
            <span className="text-[9px] uppercase tracking-wider w-12 text-right"
              style={{ color: v.passed ? 'var(--coverage-good)' : 'var(--accent)' }}>
              {v.passed ? 'Pass' : 'Fail'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="text-sm italic py-6 text-center" style={{ color: 'var(--ink-soft)' }}>
      No votes in this category.
    </div>
  );
}
