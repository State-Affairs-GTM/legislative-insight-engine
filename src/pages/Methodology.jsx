export default function Methodology() {
  return (
    <article className="max-w-3xl">
      <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: 'var(--ink-soft)' }}>
        Reference
      </div>
      <h1 className="text-4xl mb-2" style={{ color: 'var(--ink)', fontWeight: 400 }}>
        Methodology
      </h1>
      <p className="text-sm italic mb-6" style={{ color: 'var(--ink-soft)' }}>
        How we score, classify, and surface legislative data — and where we're being honest about limits.
      </p>

      <Block title="Partisanship Scores">
        <p className="mb-3">
          We publish six scores, all on a −1 (Democratic) to +1 (Republican) scale, never collapsed
          into a single number:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm pl-2">
          <li><strong>BS</strong> — Bill Sponsorship: 0.75 × primary sponsor × 0.25 × cosponsor party share</li>
          <li><strong>BV</strong> — Bill Vote: party split on contested floor passage</li>
          <li><strong>CG</strong> — Consensus Gap: BV − BS (does the room shift on the vote?)</li>
          <li><strong>LS</strong> — Legislator Sponsorship: 0.60 primary + 0.20 joint + 0.20 cosponsor</li>
          <li><strong>LV</strong> — Legislator Voting: weighted by vote consequentiality</li>
          <li><strong>LC</strong> — Legislator Combined: 0.50 LV + 0.30 LS + 0.20 cross-aisle index</li>
        </ul>
        <p className="mt-3 text-xs italic" style={{ color: 'var(--ink-soft)' }}>
          All scores shrink toward chamber average (Bayesian, k=20 sponsorship / k=30 voting).
          Legislators with fewer than 5 observations are marked "Limited data" rather than ranked.
          Within-chamber comparisons only; we do not publish cross-state legislator rankings.
        </p>
      </Block>

      <Block title="What Counts as a Vote">
        <p className="mb-2">
          For bill-level vote scores (BV) we use <strong>final passage votes and concurrence votes</strong> only.
          Procedural votes (table, recommit, adjourn, sustain) inform legislator voting (LV) at lower weights but
          don't enter BV.
        </p>
        <p>
          <strong>Consent-calendar and batch votes are excluded entirely.</strong> Some states (notably Georgia)
          dispose of bills through bundled "consent calendar" votes that process 30+ bills at once with a single
          roll call. Bills passed via consent calendar did not receive a contested vote of their own and are
          flagged accordingly. BV is null for those bills, displayed as "Passed by consent calendar — no individual vote."
        </p>
      </Block>

      <Block title="Bills vs. Resolutions">
        We always split these. A "passage rate" that lumps them together is misleading because resolutions
        (especially ceremonial ones) pass at near-100% rates and bills don't. We further split resolutions into
        sub-types (joint, concurrent, ceremonial, memorial) where states distinguish them.
        <br /><br />
        <strong>Partisanship scoring applies only to substantive Bills</strong>, never to Resolutions or
        Joint Resolutions. Ceremonial resolutions ("Honoring Coach Smith," "Recognizing November as X Awareness Month")
        are functionally non-partisan and their inclusion would distort scoring distributions. Joint Resolutions
        often handle constitutional or procedural matters where the partisan signal doesn't map to policy
        positioning. Resolutions get their own treatment — volume, pass rate, sub-type breakdown — but no
        BS/BV/CG scores attached.
      </Block>

      <Block title="Topic Classification">
        Bills are classified using a 24-topic keyword/regex taxonomy applied against the most-specific available
        text (<code>bill.summary</code> primary, <code>description</code> fallback, <code>title</code> last resort).
        About 93% of current-session bills have AI summaries; the remainder fall back to description or title.
        Bills can match multiple topics. The taxonomy is reviewed quarterly with editorial input.
      </Block>

      <Block title="Per-State Coverage">
        Coverage varies state by state. Some legislatures publish complete member-level vote records;
        others don't. Some use formal amendments; others use substitutes. We disclose coverage at the
        section level on every state page and maintain a{' '}
        <a href="/coverage" style={{ color: 'var(--accent)' }}>full coverage matrix</a> with per-state
        per-feature reliability scoring.
      </Block>

      <Block title="State-Specific Conventions">
        Every state legislature has procedural quirks, terminology differences, and data conventions
        that aren't obvious from the data alone. We catalog these in our{' '}
        <a href="/nuances" style={{ color: 'var(--accent)' }}>State Nuances reference</a> — both as a
        documentation artifact and to inform readers when our analysis depends on a state-specific
        interpretation.
      </Block>
    </article>
  );
}

function Block({ title, children }) {
  return (
    <section className="mb-6 pb-6 border-b" style={{ borderColor: 'var(--rule)' }}>
      <h2 className="text-xs uppercase tracking-[0.2em] mb-3"
        style={{ color: 'var(--ink)', fontWeight: 600 }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
        {children}
      </div>
    </section>
  );
}
