// Headline stats — horizontal row of stat cards at the top of sections.
// Each card: a big number, a small-caps label, optional delta indicator.

export default function HeadlineRow({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((s, i) => (
        <div
          key={i}
          className="px-4 py-3 border"
          style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--paper)' }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
              {s.value}
            </span>
            {s.delta != null && (
              <span
                className="text-[11px] font-mono"
                style={{
                  color: s.delta >= 0 ? 'var(--ind)' : 'var(--gop)',
                }}
              >
                {s.delta >= 0 ? '↑' : '↓'} {Math.abs(s.delta).toLocaleString()}{s.deltaUnit || ''}
              </span>
            )}
          </div>
          <div
            className="text-[10px] uppercase tracking-[0.2em] mt-1"
            style={{ color: 'var(--ink-soft)' }}
          >
            {s.label}
          </div>
          {s.sublabel && (
            <div className="text-[10px] italic mt-0.5" style={{ color: 'var(--ink-soft)' }}>
              {s.sublabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
