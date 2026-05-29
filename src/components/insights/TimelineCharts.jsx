// TimelineCharts — two stacked yearly charts.
// Renders only the lines in visibleMetrics (filtered upstream by class + legend hide).

import { useState, useMemo } from 'react';

const SEASON_COLOR = {
  rest:      'rgba(165, 159, 142, 0.06)',
  intro:     'rgba(200, 146, 79, 0.10)',
  committee: 'rgba(165, 159, 142, 0.04)',
  crunch:    'rgba(184, 80, 66, 0.10)',
  review:    'rgba(165, 159, 142, 0.06)',
};

export default function TimelineCharts({ years, yearKeys, chamber, visibleMetrics }) {
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  return (
    <div className="space-y-6">
      {yearKeys.map((year) => (
        <YearChart key={year}
          year={year}
          data={years[year]}
          chamber={chamber}
          visibleMetrics={visibleMetrics}
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          hoveredPoint={hoveredPoint}
          setHoveredPoint={setHoveredPoint}
        />
      ))}
    </div>
  );
}

function YearChart({ year, data, chamber, visibleMetrics, hoveredMetric, setHoveredMetric,
                    hoveredPoint, setHoveredPoint }) {
  const { daily, season, totals, peak_days, active_days } = data;

  const WIDTH = 960;
  const HEIGHT = 220;
  const PAD_L = 44;
  const PAD_R = 16;
  const PAD_T = 36;
  const PAD_B = 36;
  const plotW = WIDTH - PAD_L - PAD_R;
  const plotH = HEIGHT - PAD_T - PAD_B;

  const dateToX = useMemo(() => {
    const m = {};
    daily.forEach((d, i) => { m[d.date] = PAD_L + (i / Math.max(daily.length - 1, 1)) * plotW; });
    return m;
  }, [daily]);

  const series = useMemo(() => {
    return daily.map((d) => {
      const point = { date: d.date, x: dateToX[d.date] };
      for (const m of visibleMetrics) point[m.key] = d[chamber][m.key];
      return point;
    });
  }, [daily, chamber, dateToX, visibleMetrics]);

  const maxY = useMemo(() => {
    let m = 0;
    for (const p of series) {
      for (const metric of visibleMetrics) {
        if (p[metric.key] > m) m = p[metric.key];
      }
    }
    return Math.max(m, 10);
  }, [series, visibleMetrics]);

  const yToPx = (v) => PAD_T + plotH - (v / maxY) * plotH;

  const buildPath = (metricKey) => {
    return series.map((p, i) => {
      const x = p.x;
      const y = yToPx(p[metricKey] || 0);
      return (i === 0 ? 'M' : 'L') + `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  const seasonBands = useMemo(() => {
    return season.bands.map((b) => {
      const startX = dateToX[b.start] ?? PAD_L;
      const endX   = dateToX[b.end]   ?? PAD_L + plotW;
      return { ...b, x: startX, width: Math.max(endX - startX, 1) };
    });
  }, [season, dateToX, plotW]);

  const yTicks = useMemo(() => {
    const ticks = [];
    const step = niceStep(maxY);
    for (let v = 0; v <= maxY; v += step) ticks.push(v);
    return ticks;
  }, [maxY]);

  const xMarkers = useMemo(() => {
    const marks = [];
    const seen = new Set();
    for (const d of daily) {
      const day = parseInt(d.date.slice(8, 10));
      const monthKey = d.date.slice(0, 7);
      if (day === 1 || day === 15) {
        const key = `${monthKey}-${day}`;
        if (!seen.has(key)) {
          seen.add(key);
          const monthNum = parseInt(d.date.slice(5, 7));
          marks.push({
            date: d.date,
            x: dateToX[d.date],
            label: day === 1 ? monthName(monthNum) : '15',
            isMonth: day === 1,
          });
        }
      }
    }
    return marks;
  }, [daily, dateToX]);

  const milestones = [
    { label: 'Session start', date: season.session_begin, color: 'var(--ink-soft)' },
    { label: 'Crossover',     date: season.crossover,     color: '#B85042' },
    { label: 'Sine die',      date: season.adjournment,   color: '#B85042' },
  ].map((m) => ({ ...m, x: dateToX[m.date] })).filter((m) => m.x != null);

  const handleMouseMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xPx = ((e.clientX - rect.left) / rect.width) * WIDTH;
    if (xPx < PAD_L || xPx > PAD_L + plotW) { setHoveredPoint(null); return; }
    let closest = null, minDist = Infinity;
    for (const p of series) {
      const d = Math.abs(p.x - xPx);
      if (d < minDist) { minDist = d; closest = p; }
    }
    if (closest) setHoveredPoint({ year, ...closest });
  };

  const handleMouseLeave = () => setHoveredPoint(null);
  const activeHover = hoveredPoint?.year === year ? hoveredPoint : null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{year}</h3>
        <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          {active_days} active days
        </div>
      </div>

      <div className="relative" style={{ overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
             onMouseMove={handleMouseMove}
             onMouseLeave={handleMouseLeave}
             style={{ width: '100%', height: 'auto', display: 'block' }}>

          {seasonBands.map((b, i) => (
            <rect key={i} x={b.x} y={PAD_T} width={b.width} height={plotH}
              fill={SEASON_COLOR[b.color] || SEASON_COLOR.rest} />
          ))}

          {seasonBands.filter((b) => b.width > 40).map((b, i) => {
            const lines = b.label.split('\n');
            return (
              <text key={i} x={b.x + b.width / 2} y={PAD_T - 14}
                textAnchor="middle" fontSize="9" fill="var(--ink-soft)"
                opacity="0.7" fontFamily="inherit">
                {lines.map((line, j) => (
                  <tspan key={j} x={b.x + b.width / 2} dy={j === 0 ? 0 : 10}>{line}</tspan>
                ))}
              </text>
            );
          })}

          {yTicks.map((v, i) => (
            <g key={`y${i}`}>
              <line x1={PAD_L} y1={yToPx(v)} x2={PAD_L + plotW} y2={yToPx(v)}
                stroke="var(--rule)" strokeWidth="0.5" opacity="0.5" />
              <text x={PAD_L - 6} y={yToPx(v) + 3}
                textAnchor="end" fontSize="9" fill="var(--ink-soft)" fontFamily="inherit">
                {v}
              </text>
            </g>
          ))}

          {xMarkers.map((m, i) => (
            <g key={`x${i}`}>
              <line x1={m.x} y1={PAD_T + plotH}
                x2={m.x} y2={PAD_T + plotH + (m.isMonth ? 5 : 3)}
                stroke="var(--rule)" strokeWidth="0.5" />
              <text x={m.x} y={PAD_T + plotH + 16}
                textAnchor="middle"
                fontSize={m.isMonth ? 10 : 8}
                fill="var(--ink-soft)"
                opacity={m.isMonth ? 1 : 0.6}
                fontFamily="inherit"
                fontWeight={m.isMonth ? 600 : 400}>
                {m.label}
              </text>
            </g>
          ))}

          {milestones.map((ms, i) => (
            <g key={`ms${i}`}>
              <line x1={ms.x} y1={PAD_T} x2={ms.x} y2={PAD_T + plotH}
                stroke={ms.color} strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
              <text x={ms.x} y={PAD_T + plotH + 28}
                textAnchor="middle" fontSize="8.5" fill={ms.color}
                opacity="0.85" fontFamily="inherit" fontStyle="italic">
                {ms.label} ({formatShortDate(ms.date)})
              </text>
            </g>
          ))}

          {visibleMetrics.map((m) => {
            const dimmed = hoveredMetric && hoveredMetric !== m.key;
            const highlighted = hoveredMetric === m.key;
            return (
              <path key={m.key}
                d={buildPath(m.key)}
                fill="none"
                stroke={m.color}
                strokeWidth={highlighted ? 2.5 : 1.5}
                opacity={dimmed ? 0.2 : 0.85}
                onMouseEnter={() => setHoveredMetric(m.key)}
                onMouseLeave={() => setHoveredMetric(null)}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s, stroke-width 0.15s' }} />
            );
          })}

          {activeHover && (
            <>
              <line x1={activeHover.x} y1={PAD_T} x2={activeHover.x} y2={PAD_T + plotH}
                stroke="var(--ink)" strokeWidth="0.5" strokeDasharray="2,2" />
              {visibleMetrics.map((m) => (
                <circle key={m.key}
                  cx={activeHover.x}
                  cy={yToPx(activeHover[m.key] || 0)}
                  r="3"
                  fill={m.color} stroke="var(--paper)" strokeWidth="1" />
              ))}
            </>
          )}
        </svg>

        {activeHover && <HoverTooltip point={activeHover} chamber={chamber} visibleMetrics={visibleMetrics} />}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px]"
        style={{ color: 'var(--ink-soft)' }}>
        {visibleMetrics.map((m) => {
          const total = totals[m.key] ?? 0;
          const peak = peak_days[m.key];
          return (
            <span key={m.key}
              onMouseEnter={() => setHoveredMetric(m.key)}
              onMouseLeave={() => setHoveredMetric(null)}
              style={{ cursor: 'default' }}>
              <span style={{ color: m.color }}>●</span>{' '}
              {total.toLocaleString()} {m.label.toLowerCase()}
              {peak?.date && (
                <span className="ml-1">(peak: {formatShortDate(peak.date)})</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function HoverTooltip({ point, chamber, visibleMetrics }) {
  return (
    <div style={{
      position: 'absolute',
      top: 8, right: 8,
      backgroundColor: 'var(--paper)',
      border: '1px solid var(--rule)',
      padding: '6px 10px',
      fontSize: '11px',
      lineHeight: 1.5,
      color: 'var(--ink)',
      pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{formatDate(point.date)}</div>
      {visibleMetrics.map((m) => (
        <div key={m.key} style={{ color: m.color }}>
          {point[m.key] || 0} {m.label.toLowerCase()}
        </div>
      ))}
      {chamber !== 'total' && (
        <div className="mt-1 italic" style={{ color: 'var(--ink-soft)', fontSize: '9px' }}>
          {chamber === 'house' ? 'House only' : 'Senate only'}
        </div>
      )}
    </div>
  );
}

function niceStep(max) {
  if (max <= 10) return 2;
  if (max <= 50) return 10;
  if (max <= 100) return 20;
  if (max <= 200) return 50;
  if (max <= 500) return 100;
  if (max <= 1000) return 200;
  return 500;
}

function monthName(m) {
  return ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m] || '';
}
function formatDate(d) {
  const [y,m,day] = d.split('-');
  return `${monthName(parseInt(m))} ${parseInt(day)}, ${y}`;
}
function formatShortDate(d) {
  const [, m, day] = d.split('-');
  return `${monthName(parseInt(m))} ${parseInt(day)}`;
}
