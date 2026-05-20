// BipartisanBridges — editorial "hero" tab. Names the bipartisan bridges
// explicitly. Three sections:
//   1. Featured pairs (top 5 cross-party with real authoring)
//   2. Most bipartisan Democrats (ranked)
//   3. Most bipartisan Republicans (ranked)

import { PartyDot, partyInitial } from './LegislatorPairsSection.jsx';

export default function BipartisanBridges({ data }) {
  const { bridges } = data;
  if (!bridges) {
    return <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
      No bridge data available.
    </div>;
  }

  return (
    <div className="space-y-10">
      {/* Featured cross-party pairs */}
      {bridges.featured_pairs?.length > 0 && (
        <section>
          <SectionHeader
            title="Featured Cross-Party Pairs"
            subtitle="Bipartisan partnerships where one legislator authored and the other backed substantive legislation."
          />
          <div className="space-y-2 mt-3">
            {bridges.featured_pairs.map((p) => (
              <FeaturedPairRow key={`${p.leg_a_id}-${p.leg_b_id}`} pair={p} />
            ))}
          </div>
        </section>
      )}

      {/* Two-column: Dems on left, Reps on right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <BridgeColumn
          title="Most Bipartisan Democrats"
          subtitle="Democrats with the most Republican collaborators (10+ shared bills each)."
          bridges={bridges.most_bipartisan_democrats}
          accent="var(--dem)"
        />
        <BridgeColumn
          title="Most Bipartisan Republicans"
          subtitle="Republicans with the most Democratic collaborators (10+ shared bills each)."
          bridges={bridges.most_bipartisan_republicans}
          accent="var(--gop)"
        />
      </div>

      {/* Methodology footnote */}
      <div className="border-t pt-4 text-[10px] italic"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
        A "bridge" is a legislator who has collaborated with the opposing party
        on at least 10 substantive bills (ceremonial resolutions excluded).
        Ranking is by number of distinct cross-party partners, with total bills
        as the tiebreaker.
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div>
      <h3 className="text-base font-bold mb-1" style={{ color: 'var(--ink)' }}>
        {title}
      </h3>
      <p className="text-xs italic" style={{ color: 'var(--ink-soft)' }}>
        {subtitle}
      </p>
    </div>
  );
}

function FeaturedPairRow({ pair }) {
  return (
    <div className="grid grid-cols-12 gap-3 p-3 border"
      style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--paper)' }}>
      <div className="col-span-7 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5">
          <PartyDot party={pair.leg_a_party} />
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{pair.leg_a_name}</span>
          <span className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
            ({partyInitial(pair.leg_a_party)})
          </span>
        </span>
        <span style={{ color: 'var(--ink-soft)' }}>↔</span>
        <span className="inline-flex items-center gap-1.5">
          <PartyDot party={pair.leg_b_party} />
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{pair.leg_b_name}</span>
          <span className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
            ({partyInitial(pair.leg_b_party)})
          </span>
        </span>
      </div>
      <div className="col-span-5 grid grid-cols-3 gap-2 text-xs">
        <Metric label="Bills" value={pair.bills_shared} />
        <Metric label="One led" value={pair.bills_a_primary + pair.bills_b_primary} accent />
        <Metric label="Passed" value={pair.bills_passed} good />
      </div>
    </div>
  );
}

function Metric({ label, value, accent, good }) {
  return (
    <div className="text-right">
      <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </div>
      <div className="tabular-nums" style={{
        color: good ? 'var(--coverage-good)'
             : accent ? 'var(--accent)'
             : 'var(--ink)',
        fontWeight: 600, fontSize: '14px',
      }}>
        {value?.toLocaleString() ?? 0}
      </div>
    </div>
  );
}

function BridgeColumn({ title, subtitle, bridges, accent }) {
  if (!bridges || bridges.length === 0) {
    return (
      <section>
        <SectionHeader title={title} subtitle={subtitle} />
        <div className="text-sm italic mt-3" style={{ color: 'var(--ink-soft)' }}>
          No qualifying bridges.
        </div>
      </section>
    );
  }
  return (
    <section>
      <SectionHeader title={title} subtitle={subtitle} />
      <ol className="space-y-2 mt-3">
        {bridges.slice(0, 8).map((b, i) => (
          <li key={b.id} className="flex items-center gap-3 py-1.5 border-b"
            style={{ borderColor: 'var(--rule)' }}>
            <span className="text-xs tabular-nums w-5 text-right"
              style={{ color: 'var(--ink-soft)' }}>
              {i + 1}.
            </span>
            <span className="flex-grow flex items-center gap-2">
              <PartyDot party={b.party} />
              <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{b.name}</span>
            </span>
            <span className="text-xs tabular-nums"
              style={{ color: accent, fontWeight: 600 }}>
              {b.cross_party_partners} partners
            </span>
            <span className="text-[10px] tabular-nums w-16 text-right"
              style={{ color: 'var(--ink-soft)' }}>
              {b.bills_with_partners} bills
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
