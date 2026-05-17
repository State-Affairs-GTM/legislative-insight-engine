import { Link } from 'react-router-dom';
import StateOutline from '../components/insights/StateOutline.jsx';
import StateAffairsMark from '../components/shared/StateAffairsMark.jsx';
import STATES from '../data/reference/states.js';

const REGIONS = {
  Northeast: ['CT','ME','MA','NH','NJ','NY','PA','RI','VT'],
  Midwest:   ['IL','IN','IA','KS','MI','MN','MO','NE','ND','OH','SD','WI'],
  South:     ['AL','AR','DE','FL','GA','KY','LA','MD','MS','NC','OK','SC','TN','TX','VA','WV'],
  West:      ['AK','AZ','CA','CO','HI','ID','MT','NV','NM','OR','UT','WA','WY'],
};

export default function Overview() {
  return (
    <div>
      <header className="mb-8 pb-6 border-b" style={{ borderColor: 'var(--rule)' }}>
        <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: 'var(--ink-soft)' }}>
          State Affairs · Legislative Insight Engine
        </div>
        <h1 className="text-4xl mb-2" style={{ color: 'var(--ink)', fontWeight: 400 }}>
          Fifty State Legislatures
        </h1>
        <p className="text-sm italic max-w-2xl" style={{ color: 'var(--ink-soft)' }}>
          Quantitative legislative analysis powered by 2025-2026 session data. Georgia is the Phase 1 pilot.
          Additional states roll out through 2026.
        </p>
      </header>

      {Object.entries(REGIONS).map(([region, abbrs]) => (
        <div key={region} className="mb-8">
          <h2 className="text-xs uppercase tracking-[0.2em] mb-4 pb-2 border-b"
            style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
            {region}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {abbrs.map((abbr) => {
              const s = STATES.find((x) => x.abbr === abbr);
              if (!s) return null;
              return <StateCard key={abbr} state={s} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StateCard({ state }) {
  const available = state.coverage;
  const inner = (
    <div
      className="border p-4 transition-colors"
      style={{
        borderColor: 'var(--rule)',
        backgroundColor: 'var(--paper)',
        opacity: available ? 1 : 0.5,
        cursor: available ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => { if (available) e.currentTarget.style.backgroundColor = 'var(--paper-warm)'; }}
      onMouseLeave={(e) => { if (available) e.currentTarget.style.backgroundColor = 'var(--paper)'; }}
    >
      <div className="flex items-start gap-3">
        <StateOutline code={state.abbr} size={56} strokeWidth={1.2} />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            {state.pilot && <StateAffairsMark size={11} />}
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-soft)' }}>{state.abbr}</span>
          </div>
          <div className="text-sm" style={{ color: 'var(--ink)' }}>{state.name}</div>
          <div className="text-[10px] italic mt-1" style={{ color: 'var(--ink-soft)' }}>
            {available ? 'Data live' : 'Phase 2 rollout'}
          </div>
        </div>
      </div>
    </div>
  );

  if (!available) return inner;
  return (
    <Link to={`/state/${state.abbr.toLowerCase()}`} style={{ textDecoration: 'none' }}>
      {inner}
    </Link>
  );
}
