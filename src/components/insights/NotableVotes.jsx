// NotableVotes — editorial tab.
// Five sub-sections: Closest / Big Defections / Mild Defections /
// Same-Bill Reversals / Notable Resolutions.

import { useState } from 'react';
import { PartyDot, partyInitial, formatDate } from './VotesSection.jsx';

const SECTIONS = [
  { key: 'closest',         label: 'Closest Votes',
    desc: 'Bills decided by the slimmest margins — sometimes a single vote.' },
  { key: 'big_defections',  label: 'Major Defections',
    desc: 'Votes where 3+ legislators broke with their party on a clear party-position bill.' },
  { key: 'mild_defections', label: 'Mild Defections',
    desc: 'Votes where exactly 2 legislators broke with party. Worth watching.' },
  { key: 'reversals',       label: 'Same-Bill Reversals',
    desc: "Bills that flipped between Pass and Fail across multiple votes — usually amendment cycles." },
  { key: 'resolutions',     label: 'Notable Resolutions',
    desc: 'Resolutions where 3+ legislators voted Nay. Someone took a public stand.' },
];

export default function NotableVotes({ data }) {
  const [section, setSection] = useState('closest');
  const { notable } = data.overview;

  return (
    <div className="space-y-5">
      {/* Sub-section nav */}
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => {
          const isActive = s.key === section;
          let count;
          if (s.key === 'closest') count = notable.closest.length;
          else if (s.key === 'big_defections') count = notable.big_defections.length;
          else if (s.key === 'mild_defections') count = notable.mild_defections.length;
          else if (s.key === 'reversals') count = notable.same_bill_reversals.length;
          else if (s.key === 'resolutions') count = notable.notable_resolutions.length;

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

      {/* Section subtitle */}
      <div className="text-xs italic" style={{ color: 'var(--ink-soft)' }}>
        {SECTIONS.find((s) => s.key === section)?.desc}
      </div>

      {/* Content */}
      {section === 'closest'         && <ClosestList votes={notable.closest} />}
      {section === 'big_defections'  && <DefectionList votes={notable.big_defections} kind="major" />}
      {section === 'mild_defections' && <DefectionList votes={notable.mild_defections} kind="mild" />}
      {section === 'reversals'       && <ReversalsList reversals={notable.same_bill_reversals} />}
      {section === 'resolutions'     && <NotableResolutionsList votes={notable.notable_resolutions} />}
    </div>
  );
}

// ----------------------------------------------------------------------------

function ClosestList({ votes }) {
  if (votes.length === 0) return <Empty />;
  return (
    <div className="space-y-2">
      {votes.map((v) => (
        <VoteCard key={v.bill_vote_id} vote={v} highlight={`Margin: ${Math.abs(v.yea - v.nay)} votes`} />
      ))}
    </div>
  );
}

function DefectionList({ votes, kind }) {
  if (votes.length === 0) return <Empty />;
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

function NotableResolutionsList({ votes }) {
  if (votes.length === 0) return <Empty />;
  return (
    <div className="space-y-2">
      {votes.map((v) => (
        <VoteCard key={v.bill_vote_id} vote={v} highlight={`${v.nay} Nay votes on resolution`} />
      ))}
    </div>
  );
}

function ReversalsList({ reversals }) {
  if (reversals.length === 0) return <Empty />;
  return (
    <div className="space-y-3">
      {reversals.map((r) => (
        <ReversalCard key={r.bill_id} reversal={r} />
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------

function VoteCard({ vote, highlight }) {
  const titleTruncated = (vote.title || '').length > 100
    ? vote.title.slice(0, 100).trim() + '…'
    : vote.title;
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
          <div className="text-sm mb-1" title={vote.title} style={{ color: 'var(--ink)' }}>
            {titleTruncated}
          </div>
          {highlight && (
            <div className="text-[11px] mt-1" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {highlight}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-right" style={{ minWidth: 110 }}>
          <div className="text-xs tabular-nums">
            <span style={{ color: 'var(--coverage-good)' }}>Y {vote.yea}</span>
            {' · '}
            <span style={{ color: 'var(--accent)' }}>N {vote.nay}</span>
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Y D{vote.yea_dem}/R{vote.yea_gop} · N D{vote.nay_dem}/R{vote.nay_gop}
          </div>
          <div className="text-[9px] uppercase tracking-wider mt-1"
            style={{ color: vote.passed ? 'var(--coverage-good)' : 'var(--accent)' }}>
            {vote.passed ? 'Passed' : 'Failed'}
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
        Vote sequence
      </div>
      <div className="space-y-1">
        {reversal.votes.map((v, i) => (
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
