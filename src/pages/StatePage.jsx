import { useParams } from 'react-router-dom';
import { useStateData } from '../lib/useStateData.js';
import StateHeader from '../components/layout/StateHeader.jsx';
import AtAGlanceSection from '../components/insights/AtAGlanceSection.jsx';
import BillsSection from '../components/insights/BillsSection.jsx';
import Section from '../components/shared/Section.jsx';
import {
  CheckSquare, Users2, PenTool, Scale,
  CalendarClock, HeartHandshake, RefreshCw, History, BookOpen,
} from 'lucide-react';

const PLACEHOLDER_SECTIONS = [
  { key: 'votes',         title: 'Votes',                  icon: CheckSquare,    phase: 'Next up' },
  { key: 'partisanship',  title: 'Partisanship',           icon: Scale,          phase: 'Next up' },
  { key: 'committees',    title: 'Committees',             icon: Users2,         phase: 'Phase 1' },
  { key: 'sponsorship',   title: 'Sponsorship',            icon: PenTool,        phase: 'Phase 1' },
  { key: 'timeline',      title: 'Timeline',               icon: CalendarClock,  phase: 'Phase 1' },
  { key: 'partners',      title: 'Legislator Partners',    icon: HeartHandshake, phase: 'Phase 1' },
  { key: 'gut-replace',   title: 'Gut & Replace',          icon: RefreshCw,      phase: 'Phase 1' },
  { key: 'history',       title: 'Historical Context',     icon: History,        phase: 'Phase 1' },
  { key: 'nuances',       title: 'State-Specific Nuances', icon: BookOpen,       phase: 'Phase 1' },
];

export default function StatePage() {
  const { abbr } = useParams();
  const abbrUpper = abbr?.toUpperCase();
  const { data: summary, loading, error } = useStateData(abbrUpper, 'summary');
  const { data: billsSummary } = useStateData(abbrUpper, 'bills_summary');

  if (loading) return <Loading />;
  if (error || !summary) return <NotYetAvailable abbr={abbrUpper} />;

  return (
    <>
      <StateHeader summary={summary} />
      <AtAGlanceSection summary={summary} />
      <BillsSection abbr={abbrUpper} data={billsSummary} />
      {PLACEHOLDER_SECTIONS.map((s) => (
        <Section
          key={s.key}
          icon={s.icon}
          title={s.title}
          subtitle={`In progress · ${s.phase}`}
        >
          <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
            Section under construction. Data extraction queries are ready — components shipping next.
          </div>
        </Section>
      ))}
    </>
  );
}

function Loading() {
  return (
    <div className="text-sm italic py-12 text-center" style={{ color: 'var(--ink-soft)' }}>
      Loading state data…
    </div>
  );
}

function NotYetAvailable({ abbr }) {
  return (
    <div className="py-12 text-center">
      <h2 className="text-2xl mb-2" style={{ color: 'var(--ink)' }}>
        {abbr} data not yet available
      </h2>
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
        Currently only Georgia (GA) is live as our Phase 1 pilot.
        Other states roll out in Phase 2.
      </p>
    </div>
  );
}
