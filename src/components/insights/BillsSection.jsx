import { ScrollText, FileText, DollarSign, AlertCircle } from 'lucide-react';
import Section from '../shared/Section.jsx';

export default function BillsSection({ abbr, data }) {
  if (!data) {
    return (
      <Section icon={ScrollText} title="Bills" subtitle="Loading…">
        <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
          Bill data hasn't been generated yet for this state.
        </div>
      </Section>
    );
  }

  return (
    <Section
      icon={ScrollText}
      title="Bills"
      badge={`${data.totals.bills.toLocaleString()} bills`}
    >
      {/* Top of section: type breakdown */}
      <TypeBreakdown totals={data.totals} />

      {/* Topics — Bills */}
      <Subsection
        icon={FileText}
        title="Substantive Bills by Topic"
        subtitle="Topic-tagged via keyword/regex classifier applied to bill summary, description, and title. Bills can match multiple topics."
      >
        <TopicsTable topics={data.topics_bills} accentClass="bills" />
      </Subsection>

      {/* Topics — Resolutions (carveout) */}
      {data.topics_resolutions && data.topics_resolutions.length > 0 && (
        <Subsection
          icon={ScrollText}
          title="Resolutions — Separate Treatment"
          subtitle="Resolutions are mostly ceremonial or constitutional and have near-100% pass rates. They're excluded from partisanship scoring; we track them separately for completeness."
        >
          <TopicsTable topics={data.topics_resolutions} accentClass="resolutions" />
        </Subsection>
      )}

      {/* Budget bills */}
      {data.budget_bills && data.budget_bills.count > 0 && (
        <Subsection
          icon={DollarSign}
          title="Budget Bills"
          subtitle={data.budget_bills.total_appropriations_label}
        >
          <BudgetBillsTable items={data.budget_bills.items} />
        </Subsection>
      )}

      {/* Consent calendar callout */}
      {data.consent_calendar_story && (
        <Subsection
          icon={AlertCircle}
          title="Consent Calendar: The Hidden Layer"
          subtitle="A Georgia-specific procedural quirk that materially affects how we interpret pass rates and partisanship."
          accent="warning"
        >
          <ConsentCalendarCallout story={data.consent_calendar_story} />
        </Subsection>
      )}
    </Section>
  );
}

// --- helpers ---

function Subsection({ icon: Icon, title, subtitle, children, accent }) {
  const borderColor = accent === 'warning' ? 'var(--accent)' : 'var(--rule)';
  return (
    <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--rule)' }}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={13} style={{ color: 'var(--accent)' }} />}
        <h3 className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--ink)', fontWeight: 600 }}>
          {title}
        </h3>
      </div>
      {subtitle && (
        <p className="text-[11px] italic mb-3 max-w-3xl" style={{ color: 'var(--ink-soft)' }}>
          {subtitle}
        </p>
      )}
      <div style={{ borderLeft: accent === 'warning' ? `3px solid ${borderColor}` : 'none', paddingLeft: accent === 'warning' ? '0.75rem' : 0 }}>
        {children}
      </div>
    </div>
  );
}

function TypeBreakdown({ totals }) {
  const pctOf = (n, d) => d ? Math.round((n / d) * 1000) / 10 : 0;
  return (
    <div className="grid grid-cols-3 gap-3">
      <TypePill label="Bills" value={totals.bills} pct={pctOf(totals.bills, totals.all)} highlight="brand" />
      <TypePill label="Resolutions" value={totals.resolutions} pct={pctOf(totals.resolutions, totals.all)} highlight="muted" />
      <TypePill label="Joint Resolutions" value={totals.joint_resolutions} pct={pctOf(totals.joint_resolutions, totals.all)} highlight="muted" />
    </div>
  );
}

function TypePill({ label, value, pct, highlight }) {
  const isBrand = highlight === 'brand';
  return (
    <div className="border p-3" style={{
      borderColor: isBrand ? 'var(--accent)' : 'var(--rule)',
      backgroundColor: isBrand ? 'var(--paper)' : 'var(--paper-warm)',
    }}>
      <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{value.toLocaleString()}</span>
        <span className="text-[11px] font-mono" style={{ color: 'var(--ink-soft)' }}>{pct}%</span>
      </div>
    </div>
  );
}

function TopicsTable({ topics, accentClass }) {
  const maxCount = Math.max(...topics.map((t) => t.count));
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left border-b" style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
          <th className="py-1.5 uppercase tracking-wider font-normal">Topic</th>
          <th className="py-1.5 uppercase tracking-wider font-normal text-right">Filed</th>
          <th className="py-1.5 uppercase tracking-wider font-normal text-right">Passed</th>
          <th className="py-1.5 uppercase tracking-wider font-normal text-right">Pass Rate</th>
          <th className="py-1.5 uppercase tracking-wider font-normal pl-4" style={{ width: '40%' }}>Volume</th>
        </tr>
      </thead>
      <tbody>
        {topics.map((t) => (
          <tr key={t.key} className="border-b" style={{ borderColor: 'var(--rule)' }}>
            <td className="py-1.5" style={{ color: 'var(--ink)' }}>{t.label}</td>
            <td className="py-1.5 text-right font-mono" style={{ color: 'var(--ink)' }}>{t.count.toLocaleString()}</td>
            <td className="py-1.5 text-right font-mono" style={{ color: 'var(--ink-soft)' }}>{t.passed.toLocaleString()}</td>
            <td className="py-1.5 text-right font-mono" style={{ color: passRateColor(t.pass_rate) }}>
              {t.pass_rate.toFixed(1)}%
            </td>
            <td className="py-1.5 pl-4">
              <VolumeBar value={t.count} max={maxCount} accentClass={accentClass} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VolumeBar({ value, max, accentClass }) {
  const pct = max ? (value / max) * 100 : 0;
  const color = accentClass === 'resolutions' ? 'var(--ink-soft)' : 'var(--accent)';
  return (
    <div className="h-2 w-full rounded-sm" style={{ backgroundColor: 'var(--rule)' }}>
      <div className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function passRateColor(rate) {
  if (rate > 80) return 'var(--ind)';
  if (rate > 30) return 'var(--ink)';
  if (rate > 10) return 'var(--ink-soft)';
  return 'var(--gop)';
}

function BudgetBillsTable({ items }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left border-b" style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
          <th className="py-1.5 uppercase tracking-wider font-normal">Bill</th>
          <th className="py-1.5 uppercase tracking-wider font-normal">Title</th>
          <th className="py-1.5 uppercase tracking-wider font-normal">Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((b) => (
          <tr key={b.bill_id} className="border-b" style={{ borderColor: 'var(--rule)' }}>
            <td className="py-1.5 font-mono" style={{ color: 'var(--accent)' }}>{b.bill_id}</td>
            <td className="py-1.5" style={{ color: 'var(--ink)' }}>{b.title}</td>
            <td className="py-1.5">
              <StatusPill status={b.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusPill({ status }) {
  const colors = {
    Signed:  { bg: 'var(--ind-bg)',     color: 'var(--ind)' },
    Pending: { bg: 'var(--paper-warm)', color: 'var(--ink-soft)' },
    Failed:  { bg: 'var(--gop-bg)',     color: 'var(--gop)' },
    Vetoed:  { bg: 'var(--gop-bg)',     color: 'var(--gop)' },
  };
  const c = colors[status] || { bg: 'var(--neutral-bg)', color: 'var(--ink-soft)' };
  return (
    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{ backgroundColor: c.bg, color: c.color, fontWeight: 600 }}>
      {status}
    </span>
  );
}

function ConsentCalendarCallout({ story }) {
  return (
    <div>
      <p className="text-sm mb-3" style={{ color: 'var(--ink)' }}>
        <strong style={{ color: 'var(--accent)' }}>{story.headline}.</strong> {story.narrative}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        {story.stats.map((s, i) => (
          <div key={i} className="border p-3" style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--paper)' }}>
            <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{s.value.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--ink-soft)' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-[11px] italic" style={{ color: 'var(--ink-soft)' }}>
        Editorial note: This is a publishable finding in its own right. Most public discourse about state-level
        bipartisanship doesn't account for consent-calendar bundling.
      </div>
    </div>
  );
}
