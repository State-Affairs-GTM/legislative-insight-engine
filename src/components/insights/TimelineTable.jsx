// TimelineTable — week-by-week table with heatmap coloring.

export default function TimelineTable({ years, yearKeys, chamber, visibleMetrics }) {
  return (
    <div className="space-y-6">
      {yearKeys.map((year) => {
        const data = years[year];
        const weeks = data.weekly;

        const maxByMetric = {};
        for (const m of visibleMetrics) {
          let max = 0;
          for (const w of weeks) {
            const v = w[chamber][m.key] || 0;
            if (v > max) max = v;
          }
          maxByMetric[m.key] = max;
        }

        return (
          <div key={year}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--ink)' }}>{year}</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                    <th className="px-2 py-2 text-left text-[10px] uppercase tracking-wider"
                      style={{ color: 'var(--ink-soft)' }}>
                      Week of
                    </th>
                    {visibleMetrics.map((m) => (
                      <th key={m.key}
                        className="px-2 py-2 text-right text-[10px] uppercase tracking-wider"
                        style={{ color: 'var(--ink-soft)' }}>
                        <span style={{ display: 'inline-block', width: 10, height: 2,
                          backgroundColor: m.color, marginRight: 4, verticalAlign: 'middle' }} />
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w) => {
                    const hasActivity = visibleMetrics.some((m) => (w[chamber][m.key] || 0) > 0);
                    return (
                      <tr key={w.week_start}
                        style={{
                          borderBottom: '1px solid var(--rule)',
                          opacity: hasActivity ? 1 : 0.4,
                        }}>
                        <td className="px-2 py-1.5" style={{ color: 'var(--ink)' }}>
                          {formatWeekRange(w.week_start)}
                        </td>
                        {visibleMetrics.map((m) => {
                          const v = w[chamber][m.key] || 0;
                          const max = maxByMetric[m.key];
                          const intensity = max > 0 ? v / max : 0;
                          return (
                            <td key={m.key}
                              className="px-2 py-1.5 text-right tabular-nums"
                              style={{
                                color: v > 0 ? 'var(--ink)' : 'var(--ink-soft)',
                                backgroundColor: v > 0
                                  ? heatmapColor(m.color, intensity)
                                  : 'transparent',
                                fontWeight: intensity > 0.6 ? 700 : 400,
                              }}>
                              {v > 0 ? v.toLocaleString() : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatWeekRange(weekStart) {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const sStr = `${months[start.getMonth() + 1]} ${start.getDate()}`;
  const eStr = start.getMonth() === end.getMonth()
    ? `${end.getDate()}`
    : `${months[end.getMonth() + 1]} ${end.getDate()}`;
  return `${sStr}–${eStr}`;
}

function heatmapColor(color, intensity) {
  if (intensity <= 0) return 'transparent';
  const alpha = Math.min(0.5, Math.max(0.05, intensity * 0.4));
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
