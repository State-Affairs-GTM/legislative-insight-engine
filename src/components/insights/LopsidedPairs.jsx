// LopsidedPairs — the "who does the work, who signs on" tab.
// Shows pairs with the biggest asymmetry between bills_a_primary and bills_b_primary.

import { PartyDot, partyInitial } from './LegislatorPairsSection.jsx';

export default function LopsidedPairs({ data }) {
  const lopsided = data.lopsided_top_20 || [];

  if (lopsided.length === 0) {
    return (
      <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
        No lopsided pair data available.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--ink)' }}>
          Lopsided Pairs
        </h3>
        <p className="text-xs italic" style={{ color: 'var(--ink-soft)' }}>
          Pairs where one legislator consistently authors bills the other backs.
          A high lopsided score signals a workhorse-supporter dynamic, not equal partnership.
        </p>
      </div>

      <div>
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider border-b"
          style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
          <div className="col-span-6">Pair</div>
          <div className="col-span-2 text-right">A authored</div>
          <div className="col-span-2 text-right">B authored</div>
          <div className="col-span-1 text-right">Gap</div>
          <div className="col-span-1 text-right">Total</div>
        </div>

        {lopsided.map((p) => (
          <LopsidedRow key={`${p.leg_a_id}-${p.leg_b_id}`}
            pair={p} legislators={data.legislators} />
        ))}
      </div>

      <div className="border-t pt-4 text-[10px] italic"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
        Filtered to pairs with at least 5 author-backer bills total to exclude
        pairs whose only relationship is mutual co-sponsorship on someone else's
        legislation. "Gap" = absolute difference between A authored and B authored.
      </div>
    </div>
  );
}

function LopsidedRow({ pair, legislators }) {
  const a = legislators[pair.leg_a_id];
  const b = legislators[pair.leg_b_id];
  if (!a || !b) return null;

  const aDominant = pair.bills_a_primary > pair.bills_b_primary;
  const bDominant = pair.bills_b_primary > pair.bills_a_primary;

  return (
    <div className="grid grid-cols-12 gap-2 px-3 py-2.5 text-sm border-b"
      style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}>
      <div className="col-span-6 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <PartyDot party={a.party} size={8} />
          <span style={{ fontWeight: aDominant ? 700 : 400 }}>{a.name}</span>
        </span>
        <span style={{ color: 'var(--ink-soft)' }}>↔</span>
        <span className="inline-flex items-center gap-1.5">
          <PartyDot party={b.party} size={8} />
          <span style={{ fontWeight: bDominant ? 700 : 400 }}>{b.name}</span>
        </span>
      </div>
      <div className="col-span-2 text-right tabular-nums"
        style={{ fontWeight: aDominant ? 700 : 400, color: aDominant ? 'var(--accent)' : 'var(--ink)' }}>
        {pair.bills_a_primary}
      </div>
      <div className="col-span-2 text-right tabular-nums"
        style={{ fontWeight: bDominant ? 700 : 400, color: bDominant ? 'var(--accent)' : 'var(--ink)' }}>
        {pair.bills_b_primary}
      </div>
      <div className="col-span-1 text-right tabular-nums" style={{ fontWeight: 600 }}>
        {pair.lopsided_score}
      </div>
      <div className="col-span-1 text-right tabular-nums" style={{ color: 'var(--ink-soft)' }}>
        {pair.bills_shared}
      </div>
    </div>
  );
}
