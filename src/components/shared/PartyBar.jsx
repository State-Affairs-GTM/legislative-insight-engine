export default function PartyBar({ chamber }) {
  if (!chamber || !chamber.total) return null;
  const r = chamber.rep || 0, d = chamber.dem || 0, i = chamber.ind || 0, v = chamber.vacant || 0;
  const total = chamber.total;
  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--rule)]">
        <div style={{ width: `${(d/total)*100}%`, backgroundColor: 'var(--dem)' }} />
        <div style={{ width: `${(i/total)*100}%`, backgroundColor: 'var(--ind)' }} />
        <div style={{ width: `${(v/total)*100}%`, backgroundColor: 'var(--rule)' }} />
        <div style={{ width: `${(r/total)*100}%`, backgroundColor: 'var(--gop)' }} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
        {d > 0 && <span><span style={{ color: 'var(--dem)' }}>●</span> {d} Dem</span>}
        {r > 0 && <span><span style={{ color: 'var(--gop)' }}>●</span> {r} Rep</span>}
        {i > 0 && <span><span style={{ color: 'var(--ind)' }}>●</span> {i} Ind</span>}
        {v > 0 && <span style={{ color: 'var(--ink-soft)' }}>○ {v} Vacant</span>}
        <span className="ml-auto font-mono">Total {total}</span>
      </div>
    </div>
  );
}
