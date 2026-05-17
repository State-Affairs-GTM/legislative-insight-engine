import { BarChart3 } from 'lucide-react';
import Section from '../shared/Section.jsx';
import HeadlineRow from './HeadlineRow.jsx';
import BillFunnel from './BillFunnel.jsx';
import CoverageBadge from './CoverageBadge.jsx';

export default function AtAGlanceSection({ summary }) {
  if (!summary) return null;

  const stats = [
    { value: summary.total_bills?.toLocaleString() ?? '—', label: 'Bills + Resolutions Filed' },
    { value: summary.became_law?.toLocaleString() ?? '—', label: 'Became Law',
      sublabel: summary.total_bills ? `${pct(summary.became_law, summary.total_bills)}% pass rate` : null },
    { value: summary.unique_sponsors?.toLocaleString() ?? '—', label: 'Active Legislators' },
    { value: summary.recorded_votes?.toLocaleString() ?? '—', label: 'Recorded Votes',
      sublabel: summary.consent_pct != null ? `${summary.consent_pct}% via consent calendar` : null },
  ];

  return (
    <Section
      icon={BarChart3}
      title="At a Glance"
      defaultOpen={true}
      badge={summary.session_label}
    >
      <HeadlineRow stats={stats} />

      {summary.funnel && (
        <>
          <div className="text-xs uppercase tracking-[0.2em] mb-3 mt-6"
            style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>
            Bill Flow by Chamber & Type
          </div>
          <BillFunnel funnel={summary.funnel} />
        </>
      )}

      {summary.coverage_notes && summary.coverage_notes.length > 0 && (
        <div className="mt-8 pt-4 border-t" style={{ borderColor: 'var(--rule)' }}>
          <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--ink-soft)' }}>
            Data Coverage Notes
          </div>
          <ul className="space-y-1.5 text-xs" style={{ color: 'var(--ink)' }}>
            {summary.coverage_notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2">
                <CoverageBadge level={note.level} label="" />
                <span>{note.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 1000) / 10;
}
