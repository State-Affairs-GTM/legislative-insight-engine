// TimelineSection — 3 tab orchestrator (Charts / Table / Significant Periods)
// Shared state: chamber filter, class filter, hidden metrics (legend toggle)

import { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import Section from '../shared/Section.jsx';
import { useStateData } from '../../lib/useStateData.js';
import TimelineCharts from './TimelineCharts.jsx';
import TimelineTable from './TimelineTable.jsx';
import TimelineSignificantPeriods from './TimelineSignificantPeriods.jsx';

const TABS = [
  { key: 'charts', label: 'Charts' },
  { key: 'table',  label: 'Weekly Table' },
  { key: 'periods',label: 'Significant Periods' },
];

const CHAMBERS = [
  { key: 'total',  label: 'Both Chambers' },
  { key: 'house',  label: 'House' },
  { key: 'senate', label: 'Senate' },
];

const CLASSES = [
  { key: 'both',        label: 'Both' },
  { key: 'bills',       label: 'Bills' },
  { key: 'resolutions', label: 'Resolutions' },
];

// 6 metric series with class membership.
//   class: 'bill' = shown when filter is Bills or Both
//          'resolution' = shown when filter is Resolutions or Both
//          'both' = always shown (roll_call_votes covers both)
export const METRICS = [
  { key: 'bills_introduced',       label: 'Bills introduced',       class: 'bill',       color: '#B85042' },
  { key: 'bills_floor_passed',     label: 'Bills floor-passed',     class: 'bill',       color: '#2C5F5D' },
  { key: 'bills_became_law',       label: 'Bills became law',       class: 'bill',       color: '#C8924F' },
  { key: 'resolutions_introduced', label: 'Resolutions introduced', class: 'resolution', color: '#A26E8F' },
  { key: 'resolutions_adopted',    label: 'Resolutions adopted',    class: 'resolution', color: '#7B5B8E' },
  { key: 'roll_call_votes',        label: 'Roll-call votes',        class: 'both',       color: '#2A2622' },
];

// Filter metrics by current class selection
function metricsForClass(classFilter) {
  if (classFilter === 'both') return METRICS;
  if (classFilter === 'bills')       return METRICS.filter((m) => m.class === 'bill' || m.class === 'both');
  if (classFilter === 'resolutions') return METRICS.filter((m) => m.class === 'resolution' || m.class === 'both');
  return METRICS;
}

export default function TimelineSection({ abbr }) {
  const timeline = useStateData(abbr, 'timeline');
  const [activeTab, setActiveTab] = useState('charts');
  const [chamber, setChamber] = useState('total');
  const [classFilter, setClassFilter] = useState('both');
  const [hiddenMetrics, setHiddenMetrics] = useState(new Set());

  const toggleMetric = (key) => {
    setHiddenMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Metrics surviving the class filter (used for legend and chart logic)
  const classMetrics = useMemo(() => metricsForClass(classFilter), [classFilter]);

  // Final set: class filter + legend hide/show
  const visibleMetrics = useMemo(
    () => classMetrics.filter((m) => !hiddenMetrics.has(m.key)),
    [classMetrics, hiddenMetrics]
  );

  if (timeline.loading) {
    return (
      <Section icon={Calendar} title="Timeline" subtitle="Loading…">
        <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>Loading…</div>
      </Section>
    );
  }
  if (timeline.error || !timeline.data) {
    return (
      <Section icon={Calendar} title="Timeline" subtitle="Not yet available">
        <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
          Timeline data not yet generated.
        </div>
      </Section>
    );
  }

  const { years } = timeline.data;
  const yearKeys = Object.keys(years).sort();

  return (
    <Section icon={Calendar} title="Timeline"
      subtitle={`Daily legislative activity across ${yearKeys.length} session years`}>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b mb-5"
        style={{ borderColor: 'var(--rule)' }}>
        {TABS.map((t) => {
          const isActive = t.key === activeTab;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="px-4 py-2 text-xs uppercase tracking-wider transition-colors"
              style={{
                color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
                fontWeight: isActive ? 700 : 400,
                borderBottom: isActive ? '2px solid var(--ink)' : '2px solid transparent',
                marginBottom: '-1px',
                cursor: 'pointer',
              }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Controls row: chamber toggle + class toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Toggle options={CHAMBERS} value={chamber} onChange={setChamber} />
        <Toggle options={CLASSES} value={classFilter} onChange={setClassFilter} />
      </div>

      {/* Legend — only metrics for current class filter */}
      <div className="flex flex-wrap items-center gap-3 text-xs mb-5">
        {classMetrics.map((m) => {
          const isHidden = hiddenMetrics.has(m.key);
          return (
            <button key={m.key} onClick={() => toggleMetric(m.key)}
              className="flex items-center gap-1.5 transition-opacity"
              style={{
                opacity: isHidden ? 0.35 : 1,
                textDecoration: isHidden ? 'line-through' : 'none',
                cursor: 'pointer',
                color: 'var(--ink-soft)',
              }}
              title={isHidden ? 'Click to show' : 'Click to hide'}>
              <span style={{ display: 'inline-block', width: 14, height: 2, backgroundColor: m.color }} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'charts' && (
        <TimelineCharts years={years} yearKeys={yearKeys}
          chamber={chamber} visibleMetrics={visibleMetrics} />
      )}
      {activeTab === 'table' && (
        <TimelineTable years={years} yearKeys={yearKeys}
          chamber={chamber} visibleMetrics={visibleMetrics} />
      )}
      {activeTab === 'periods' && (
        <TimelineSignificantPeriods years={years} yearKeys={yearKeys}
          chamber={chamber} visibleMetrics={visibleMetrics} />
      )}

      <div className="mt-6 pt-4 border-t text-[10px] italic"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
        Bills floor-passed counts chamber passage actions (passed/adopted, substitute passages, concurrence).
        Bills became law uses signed-by-governor as the trigger. Resolutions adopted uses status_id = 4 (final state).
        Season bands reflect the GA legislative calendar.
      </div>
    </Section>
  );
}

function Toggle({ options, value, onChange }) {
  return (
    <div className="inline-flex border" style={{ borderColor: 'var(--rule)' }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button key={o.key} onClick={() => onChange(o.key)}
            className="text-xs px-3 py-1.5 transition-colors"
            style={{
              backgroundColor: active ? 'var(--ink)' : 'var(--paper)',
              color: active ? 'var(--paper)' : 'var(--ink-soft)',
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
