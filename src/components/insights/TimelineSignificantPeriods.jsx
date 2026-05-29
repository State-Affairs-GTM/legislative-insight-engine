// TimelineSignificantPeriods — top 5 days or weeks per metric per year.

import { useState } from 'react';

const GRANULARITIES = [
  { key: 'days',  label: 'Top Days' },
  { key: 'weeks', label: 'Top Weeks' },
];

export default function TimelineSignificantPeriods({ years, yearKeys, chamber, visibleMetrics }) {
  const [granularity, setGranularity] = useState('days');

  return (
    <div className="space-y-6">
      <div className="inline-flex border" style={{ borderColor: 'var(--rule)' }}>
        {GRANULARITIES.map((g) => {
          const active = granularity === g.key;
          return (
            <button key={g.key} onClick={() => setGranularity(g.key)}
              className="text-xs px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: active ? 'var(--ink)' : 'var(--paper)',
                color: active ? 'var(--paper)' : 'var(--ink-soft)',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
              }}>
              {g.label}
            </button>
          );
        })}
      </div>

      {yearKeys.map((year) => {
        const data = years[year];
        const topData = granularity === 'days' ? data.top_days : data.top_weeks;

        return (
          <div key={year}>
            <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--ink)' }}>{year}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleMetrics.map((m) => {
                const items = topData[m.key] || [];
                return (
                  <div key={m.key}
                    className="border p-3"
                    style={{ borderColor: 'var(--rule)' }}>
                    <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b"
                      style={{ borderColor: 'var(--rule)' }}>
                      <span style={{ display: 'inline-block', width: 12, height: 2, backgroundColor: m.color }} />
                      <span className="text-[10px] uppercase tracking-wider"
                        style={{ color: 'var(--ink-soft)', fontWeight: 700 }}>
                        {m.label}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="text-xs italic py-2" style={{ color: 'var(--ink-soft)' }}>
                        No activity
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {items.map((item, i) => {
                          const label = granularity === 'days'
                            ? formatDate(item.date)
                            : `Week of ${formatDate(item.week_start)}`;
                          const breakdown = chamber === 'total'
                            ? ` (${item.house}H / ${item.senate}S)`
                            : '';
                          return (
                            <div key={i} className="flex items-baseline justify-between text-xs"
                              style={{ color: 'var(--ink)' }}>
                              <span className="truncate" style={{ flex: 1 }} title={label}>
                                <span style={{ color: 'var(--ink-soft)', marginRight: 4 }}>{i + 1}.</span>
                                {label}
                              </span>
                              <span className="ml-2 tabular-nums" style={{ fontWeight: 600 }}>
                                {item.count}
                                <span className="ml-1 text-[10px] font-normal"
                                  style={{ color: 'var(--ink-soft)' }}>
                                  {breakdown}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="text-[10px] italic pt-2"
        style={{ color: 'var(--ink-soft)' }}>
        Ranked by total activity {chamber === 'total' ? 'across both chambers' : `in the ${chamber} only`}.
        {chamber === 'total' && ' Chamber split shown in parentheses.'}
      </div>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '';
  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, day] = d.split('-');
  return `${months[parseInt(m)]} ${parseInt(day)}, ${y}`;
}
