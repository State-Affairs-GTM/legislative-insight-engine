import { BarChart3, FileText, ScrollText } from 'lucide-react';
import Section from '../shared/Section.jsx';
import HeadlineRow from './HeadlineRow.jsx';
import BillSankey from './BillSankey.jsx';
import CoverageBadge from './CoverageBadge.jsx';

export default function AtAGlanceSection({ summary }) {
  if (!summary) return null;

  const derived = deriveCarveouts(summary.funnel);

  const headlineStats = [
    {
      value: summary.total_bills?.toLocaleString() ?? '—',
      label: 'Bills + Resolutions Filed',
      sublabel: derived
        ? `${derived.bills.introduced.toLocaleString()} bills · ${derived.resolutions.introduced.toLocaleString()} res. · ${derived.jointRes.introduced.toLocaleString()} joint res.`
        : null,
    },
    {
      value: summary.unique_sponsors?.toLocaleString() ?? '—',
      label: 'Active Legislators',
    },
    {
      value: summary.recorded_votes?.toLocaleString() ?? '—',
      label: 'Recorded Votes',
      sublabel: summary.consent_pct != null
        ? `${summary.consent_pct}% via consent calendar`
        : null,
    },
    {
      value: derived?.coverageScore ?? '—',
      label: 'Data Coverage',
      sublabel: summary.coverage_overall_label ? `Overall: ${summary.coverage_overall_label}` : null,
    },
  ];

  return (
    <Section
      icon={BarChart3}
      title="At a Glance"
      defaultOpen={true}
      badge={summary.session_label}
    >
      <HeadlineRow stats={headlineStats} />

      {derived && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <CarveoutCard
            icon={FileText}
            title="Bills"
            subtitle="Substantive policy proposals — receive full partisanship scoring"
            data={derived.bills}
            highlight="brand"
          />
          <CarveoutCard
            icon={ScrollText}
            title="Resolutions (incl. Joint)"
            subtitle="Often ceremonial or constitutional — separate treatment, no partisanship scoring"
            data={derived.resolutionsCombined}
            highlight="muted"
          />
        </div>
      )}

      {summary.funnel && (
        <>
          <div className="text-xs uppercase tracking-[0.2em] mb-3 mt-6"
            style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>
            Bill Flow by Chamber & Type
          </div>
          <BillSankey funnel={summary.funnel} />
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

function CarveoutCard({ icon: Icon, title, subtitle, data, highlight }) {
  const passRate = pct(data.passed, data.introduced);
  const stuckRate = pct(data.stuck, data.introduced);
  const isBrand = highlight === 'brand';

  return (
    <div
      className="border p-4"
      style={{
        borderColor: isBrand ? 'var(--accent)' : 'var(--rule)',
        backgroundColor: isBrand ? 'var(--paper)' : 'var(--paper-warm)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: isBrand ? 'var(--accent)' : 'var(--ink-soft)' }} />
        <span className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--ink)', fontWeight: 600 }}>
          {title}
        </span>
      </div>
      <div className="text-[11px] italic mb-3" style={{ color: 'var(--ink-soft)' }}>
        {subtitle}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Filed" value={data.introduced.toLocaleString()} />
        <Stat label="Became Law" value={data.passed.toLocaleString()} sub={`${passRate}%`} />
        <Stat label="Died in 1st" value={data.stuck.toLocaleString()} sub={`${stuckRate}%`} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{value}</div>
      {sub && <div className="text-[10px] font-mono" style={{ color: 'var(--ink-soft)' }}>{sub}</div>}
      <div className="text-[9px] uppercase tracking-wider mt-1" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </div>
    </div>
  );
}

function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 1000) / 10;
}

function deriveCarveouts(funnel) {
  if (!funnel?.tracks) return null;

  const aggregate = (typeName) => {
    const totals = { introduced: 0, stuck: 0, engrossed: 0, passed: 0 };
    for (const track of funnel.tracks) {
      const row = track.rows.find((r) => r.type === typeName);
      if (!row) continue;
      for (const key of Object.keys(totals)) {
        totals[key] += row.counts[key] || 0;
      }
    }
    return totals;
  };

  const bills = aggregate('Bills');
  const resolutions = aggregate('Resolutions');
  const jointRes = aggregate('Joint Res.');

  const resolutionsCombined = {
    introduced: resolutions.introduced + jointRes.introduced,
    stuck:      resolutions.stuck + jointRes.stuck,
    engrossed:  resolutions.engrossed + jointRes.engrossed,
    passed:     resolutions.passed + jointRes.passed,
  };

  return { bills, resolutions, jointRes, resolutionsCombined, coverageScore: 'Good' };
}
