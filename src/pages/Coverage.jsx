export default function Coverage() {
  return (
    <article className="max-w-3xl">
      <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: 'var(--ink-soft)' }}>
        Reference
      </div>
      <h1 className="text-4xl mb-2" style={{ color: 'var(--ink)', fontWeight: 400 }}>
        Data Coverage
      </h1>
      <p className="text-sm italic mb-6" style={{ color: 'var(--ink-soft)' }}>
        Per-state, per-section data quality status. Updated weekly.
      </p>

      <div className="mb-6 p-4 border" style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--paper-warm)' }}>
        <h2 className="text-sm mb-2" style={{ fontWeight: 600 }}>Georgia (Pilot) — 2025-2026 Regular Session</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left" style={{ color: 'var(--ink-soft)' }}>
              <th className="py-1 uppercase tracking-wider">Section</th>
              <th className="py-1 uppercase tracking-wider">Coverage</th>
              <th className="py-1 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody>
            <Row section="Bills" level="good" notes="11,770 bills · 92.6% with AI summaries" />
            <Row section="Sponsors" level="good" notes="All sponsors linked to legislator records with party" />
            <Row section="Stage progression" level="good" notes="history_step 1-11 fully populated" />
            <Row section="Votes (substantive)" level="good" notes="100% Senate / 99.8% House member-level coverage" />
            <Row section="Votes (consent calendar)" level="partial" notes="Excluded from analysis per methodology" />
            <Row section="Bill text versions" level="good" notes="4,155 multi-version bills, 100% with summaries" />
            <Row section="Amendments" level="poor" notes="GA uses substitutes, not amendments — different signal channel" />
            <Row section="Committee data" level="good" notes="Committee referrals and reports populated" />
            <Row section="Hearings" level="partial" notes="70-90% accurate, only reliable from mid-2025" />
            <Row section="Curated event vocab (sa_history_action)" level="poor" notes="Empty for GA; using raw history_action" />
          </tbody>
        </table>
      </div>

      <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
        Other 49 states roll out in Phase 2. Their coverage tables appear here as data lands.
      </div>
    </article>
  );
}

function Row({ section, level, notes }) {
  const colors = { good: 'var(--coverage-good)', partial: 'var(--coverage-partial)', poor: 'var(--coverage-poor)' };
  const labels = { good: 'Complete', partial: 'Partial', poor: 'Limited' };
  return (
    <tr className="border-t" style={{ borderColor: 'var(--rule)' }}>
      <td className="py-1.5 pr-3" style={{ color: 'var(--ink)' }}>{section}</td>
      <td className="py-1.5 pr-3">
        <span className="inline-flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, backgroundColor: colors[level], borderRadius: '50%' }} />
          <span style={{ color: colors[level], fontWeight: 600 }}>{labels[level]}</span>
        </span>
      </td>
      <td className="py-1.5" style={{ color: 'var(--ink-soft)' }}>{notes}</td>
    </tr>
  );
}
