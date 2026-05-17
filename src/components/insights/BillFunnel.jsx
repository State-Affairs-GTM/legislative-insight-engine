// BillFunnel — matches slides 7-10 from State Government 101 deck.
// A staged grid showing bill type (Bills / Resolutions / Joint Res) by chamber
// dropping through stages: Introduced → Stuck in 1st → Engrossed → Passed.
//
// Expects a `funnel` prop with this shape:
// {
//   stages: [
//     { key: 'introduced',    label: 'Introduced' },
//     { key: 'stuck',         label: 'Stuck in 1st chamber' },
//     { key: 'engrossed',     label: 'Engrossed', subtitle: 'passed 1 chamber, still in 2nd' },
//     { key: 'passed',        label: 'Became Law' },
//   ],
//   tracks: [
//     {
//       chamber: 'House',
//       rows: [
//         { type: 'Bills',         counts: { introduced: 1053, stuck: 734, engrossed: 224, passed: 81 } },
//         { type: 'Resolutions',   counts: { introduced: 10,   stuck: 1,   engrossed: 0,   passed: 10 } },
//         { type: 'Joint Res.',    counts: { introduced: 7,    stuck: 3,   engrossed: 3,   passed: 3 } },
//       ]
//     },
//     { chamber: 'Senate', rows: [ ... ] },
//   ]
// }

import { useMemo } from 'react';

export default function BillFunnel({ funnel }) {
  if (!funnel || !funnel.stages || !funnel.tracks) {
    return <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>No funnel data.</div>;
  }

  return (
    <div className="space-y-8">
      {funnel.tracks.map((track) => (
        <ChamberTrack key={track.chamber} track={track} stages={funnel.stages} />
      ))}
    </div>
  );
}

function ChamberTrack({ track, stages }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.2em] mb-3 pb-2 border-b"
        style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
        {track.chamber}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }}>
        {/* stage headers */}
        {stages.map((stage) => (
          <div key={stage.key} className="text-center">
            <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--ink)' }}>
              {stage.label}
            </div>
            {stage.subtitle && (
              <div className="text-[10px] italic mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                {stage.subtitle}
              </div>
            )}
          </div>
        ))}

        {/* one row per bill-type within chamber */}
        {track.rows.map((row, ri) => (
          <RowCells key={row.type} row={row} stages={stages} firstRow={ri === 0} />
        ))}
      </div>
    </div>
  );
}

function RowCells({ row, stages, firstRow }) {
  const introducedCount = row.counts[stages[0].key] || 0;
  return stages.map((stage, si) => {
    const count = row.counts[stage.key];
    const pct = introducedCount > 0 ? Math.round((count / introducedCount) * 100) : null;
    return (
      <Cell key={stage.key} type={row.type} count={count} pct={pct} stageIndex={si} firstRow={firstRow} firstCell={si === 0} />
    );
  }).flat();
}

function Cell({ type, count, pct, stageIndex, firstRow, firstCell }) {
  const isBills = type === 'Bills';
  const bg = isBills ? 'var(--paper-warm)' : 'var(--paper)';

  return (
    <div
      className="border px-3 py-3 text-center"
      style={{ borderColor: 'var(--rule)', backgroundColor: bg }}
    >
      {firstCell && (
        <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--ink-soft)' }}>
          {type}
        </div>
      )}
      <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
        {count != null ? count.toLocaleString() : '—'}
      </div>
      {pct != null && stageIndex > 0 && (
        <div className="text-[11px] font-mono" style={{ color: 'var(--ink-soft)' }}>
          {pct}%
        </div>
      )}
    </div>
  );
}
