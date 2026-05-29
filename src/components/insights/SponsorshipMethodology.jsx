// SponsorshipMethodology v2 — terminology updates + state portability section.

export default function SponsorshipMethodology({ data }) {
  const stats = data.overview.stats;
  const thresholds = data.notable.thresholds || {};

  return (
    <div className="space-y-8 text-sm" style={{ color: 'var(--ink)' }}>

      <div>
        <p style={{ lineHeight: 1.6 }}>
          Sponsorship measures who <em>authored</em> bills. It captures three signals:
          how much a legislator writes (volume), what happens to their bills (success),
          and how they author them (behavioral patterns). This is distinct from the{' '}
          <strong>Legislator Pairs</strong> section, which measures cross-party
          collaboration partnerships, and the <strong>Votes</strong> section, which
          measures floor-vote behavior.
        </p>
      </div>

      <Section title="Sponsor Roles">
        <p className="mb-4" style={{ lineHeight: 1.6 }}>
          Each bill has multiple sponsors. We distinguish three roles:
        </p>

        <div className="space-y-3">
          <RoleRow
            badge="Primary sponsor"
            badgeColor="var(--ink)"
            description={
              <>The legislator who owns the bill — they drafted it, shepherd it through committee,
              and answer for it on the floor. Identified by <code style={inlineCode}>sponsor_type_id = 1</code>.{' '}
              <strong>Important state-specific note:</strong> In Georgia, every bill has exactly{' '}
              <em>one</em> primary sponsor (we additionally require <code style={inlineCode}>sponsor_order = 1</code>).
              Most other states allow multiple primary sponsors on a single bill — when we expand to
              other states, multiple legislators may receive credit for the same bill's outcomes.</>
            }
          />

          <RoleRow
            badge="Cosponsor"
            badgeColor="var(--ink-soft)"
            description={
              <>Any other sponsor with <code style={inlineCode}>sponsor_type_id = 1</code> at{' '}
              <code style={inlineCode}>sponsor_order &gt; 1</code> (in GA). House caps cosponsors at 5 per bill;
              Senate has no formal cap. Cosponsorship signals support and political alignment but is
              a weaker authoring claim than primary sponsor.</>
            }
          />

          <RoleRow
            badge="Joint sponsor"
            badgeColor="var(--accent)"
            description={
              <>A smaller category (<code style={inlineCode}>sponsor_type_id = 3</code>), used in GA
              for bills with shared cross-chamber or cross-committee authoring. Approximately 637 rows
              in session 2167 — a minor signal compared to primary and cosponsor.</>
            }
          />
        </div>
      </Section>

      <Section title="State Portability">
        <CalloutBox>
          <strong>This section's methodology is Georgia-specific in one important way:</strong> the
          "exactly one primary sponsor per bill" assumption. Most US states allow multiple primary
          sponsors on a single piece of legislation. When this tool expands beyond GA, the primary
          sponsor definition will adjust per state — and multiple legislators may receive credit
          for the same bill's passage. The grid will be denser as a result, and metrics like
          "lone wolves" (zero-cosponsor primary sponsorships) will become rare or extinct in some states.
        </CalloutBox>
      </Section>

      <Section title="Bill Outcomes">
        <p className="mb-3" style={{ lineHeight: 1.6 }}>
          Each bill has one outcome reflecting where it currently sits in the legislative process.
          Outcomes are mutually exclusive and based on LegiScan's <code style={inlineCode}>status_id</code>:
        </p>

        <div className="space-y-2">
          <OutcomeRow label="Passed" status="status_id = 4"
            description="Signed into law (or otherwise became law without veto)." />
          <OutcomeRow label="Enrolled" status="status_id = 3"
            description="Passed both chambers, awaiting governor's action." />
          <OutcomeRow label="Engrossed" status="status_id = 2"
            description="Passed one chamber but stalled in the other." />
          <OutcomeRow label="Vetoed" status="status_id = 5"
            description="Passed legislature but vetoed by governor. Counts as failed for passage rate." />
          <OutcomeRow label="Introduced" status="status_id = 1"
            description="Still pending. Most legislator-authored bills end here — filed and never advanced." />
          <OutcomeRow label="Failed" status="status_id = 6"
            description="Formally defeated, withdrawn, or dead at end of session." />
        </div>
      </Section>

      <Section title="Passage Rate">
        <p className="mb-3" style={{ lineHeight: 1.6 }}>
          Two rates are calculated, both for primary sponsors only:
        </p>

        <div className="space-y-3 mb-4">
          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--coverage-good)' }}>
            <div className="font-bold mb-1">Passage rate</div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              <code style={inlineCode}>lead_bills_passed / lead_count_bills</code>.
              Strict measure: % of primary-sponsored bills that became law.
            </div>
          </div>

          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--warn)' }}>
            <div className="font-bold mb-1">Engrossed rate</div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              <code style={inlineCode}>(passed + enrolled + engrossed) / lead_count_bills</code>.
              Broader: includes bills that passed at least one chamber. Useful when a bill died on
              the governor's desk or stalled in the second chamber despite real progress.
            </div>
          </div>
        </div>

        <CalloutBox>
          <strong>Volume floor for leaderboards:</strong> "Highest Passage Rate" requires at least{' '}
          {thresholds.passage_rate_volume_floor || 10} primary-sponsored bills. Otherwise someone with
          one 100%-passed bill would dominate. The grid view shows everyone regardless of volume.
        </CalloutBox>
      </Section>

      <Section title="Cosponsor Passage (Caveat)">
        <p style={{ lineHeight: 1.6 }} className="mb-3">
          The grid surfaces "Cosp. Passed" — bills a legislator cosponsored that became law. This
          is shown for completeness but carries an important caveat:
        </p>
        <CalloutBox>
          <strong>Cosponsor passage rate reflects choice of primary sponsors, not personal authoring
          success.</strong> A legislator who cosponsors 50 bills authored by powerful committee chairs
          will show a high cosponsor passage count — but that reflects the chairs' effectiveness, not
          theirs. Use this metric to see <em>which legislators are attached to successful coalitions</em>,
          not to evaluate authoring skill. The primary sponsor passage rate is the cleaner measure of
          individual effectiveness.
        </CalloutBox>
      </Section>

      <Section title="Notable Leaderboard Definitions">
        <div className="space-y-3">
          <LeaderboardDef name="Most Prolific Primary Sponsors"
            description="Top 15 by raw primary sponsor count. Volume signal." />
          <LeaderboardDef name="Workhorses"
            description="Top 15 by weighted score: primary × 3 + cosponsor × 1. Combined authoring activity, primary weighted higher." />
          <LeaderboardDef name="Most Prolific Cosponsors"
            description="Top 15 by cosponsor count. Separate from primary — many high-cosponsor legislators primary-sponsor almost nothing." />
          <LeaderboardDef name="Highest Passage Rate"
            description={`Top 15 primary sponsors by % passed. Volume floor: ${thresholds.passage_rate_volume_floor || 10} primary-sponsored bills minimum.`} />
          <LeaderboardDef name="Highest Engrossed Rate"
            description={`Top 15 primary sponsors by % engrossed-or-better. Volume floor: ${thresholds.passage_rate_volume_floor || 10} primary-sponsored bills minimum.`} />
          <LeaderboardDef name="Lone Wolves"
            description="Primary sponsors who led bills with ZERO cosponsors AND got at least one of those solo-led bills passed. Rare and meaningful — most successful bills have political coalitions behind them. (Note: this metric becomes rare in multi-primary-sponsor states.)" />
          <LeaderboardDef name="Name-Attachers"
            description={`Legislators with ≥${thresholds.name_attacher_min_cosponsor || 100} cosponsor count and ≤${thresholds.name_attacher_max_lead || 5} primary count. Pattern of attaching one's name broadly to others' bills without primary-sponsoring much.`} />
        </div>
      </Section>

      <Section title="Georgia-Specific Notes">
        <ul className="space-y-2 list-disc list-inside" style={{ lineHeight: 1.6 }}>
          <li>
            <strong>Single primary sponsor per bill.</strong> Every bill in session 2167 has exactly
            one row matching <code style={inlineCode}>sponsor_type_id=1 AND sponsor_order=1</code>.
            This is a Georgia convention; most states allow multiple.
          </li>
          <li>
            <strong>Cosponsor chamber rules differ.</strong> GA House caps cosponsors at 5 per bill;
            Senate has no formal cap. Senate bills frequently show cosponsor lists of 20-50 names.
          </li>
          <li>
            <strong>Resolutions are tracked separately from bills.</strong> Most resolutions are
            commemorative and pass easily. Their passage rate is not directly comparable to bill
            passage rate. The grid lets you toggle between bills and resolutions.
          </li>
          <li>
            <strong>Constitutional amendments require 2/3 supermajority</strong> (see Votes methodology).
            They appear here with the "CA" flag. Their passage rate uses the raw LegiScan status, so
            some "Failed" const amendments got a simple majority but fell short of supermajority.
          </li>
          <li>
            <strong>Topics are not yet available.</strong> Bill subject and category data lives in
            a separate dataset (<code style={inlineCode}>state_affairs_prod</code>) that hasn't been
            migrated to our analytics layer. When topics land, this section will gain topic filters.
          </li>
        </ul>
      </Section>

      <Section title="Cross-Method Notes">
        <p className="mb-3" style={{ lineHeight: 1.6 }}>
          A legislator's sponsorship profile is distinct from their voting behavior or collaboration:
        </p>
        <ul className="space-y-2 list-disc list-inside" style={{ lineHeight: 1.6 }}>
          <li>
            <strong>vs. Legislator Pairs:</strong> Pairs measures who collaborates with whom.
            Sponsorship measures total authoring volume and success. Sonya Halpern ranks #1 in
            cross-party pairs but is mid-pack on primary sponsor volume.
          </li>
          <li>
            <strong>vs. Votes:</strong> A legislator's bills can pass even when they themselves
            defect on floor votes. Charlice Byrd authors lots of bills with high passage rates AND
            has GA's #2 defection rate.
          </li>
          <li>
            <strong>Passage rate is sensitive to partisan dynamics.</strong> In GA's GOP supermajority,
            Democrats author many bills with near-zero passage rates because their bills die in committee.
          </li>
        </ul>
      </Section>

      <div className="pt-4 border-t text-xs italic"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
        Source: GA {data.overview.session_label}, {stats.total_bills_led.toLocaleString()} primary-sponsored
        bills, {stats.total_bills_cosponsored.toLocaleString()} cosponsorships across{' '}
        {stats.total_legislators} legislators.
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-base font-bold mb-3 pb-2 border-b"
        style={{ color: 'var(--ink)', borderColor: 'var(--rule)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function RoleRow({ badge, badgeColor, description }) {
  return (
    <div className="p-3 border" style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--paper)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider"
          style={{
            backgroundColor: 'var(--paper-warm)', color: badgeColor,
            border: `1px solid ${badgeColor}`, fontWeight: 600,
          }}>
          {badge}
        </span>
      </div>
      <div className="text-xs" style={{ color: 'var(--ink)', lineHeight: 1.55 }}>
        {description}
      </div>
    </div>
  );
}

function OutcomeRow({ label, status, description }) {
  return (
    <div className="flex items-baseline gap-3 text-xs">
      <span className="font-bold tabular-nums" style={{ color: 'var(--ink)', minWidth: 80 }}>
        {label}
      </span>
      <span className="font-mono text-[10px]" style={{ color: 'var(--ink-soft)', minWidth: 120 }}>
        {status}
      </span>
      <span style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        {description}
      </span>
    </div>
  );
}

function LeaderboardDef({ name, description }) {
  return (
    <div className="text-xs" style={{ lineHeight: 1.5 }}>
      <span className="font-bold" style={{ color: 'var(--ink)' }}>{name}.</span>{' '}
      <span style={{ color: 'var(--ink-soft)' }}>{description}</span>
    </div>
  );
}

function CalloutBox({ children }) {
  return (
    <div className="p-3 text-xs"
      style={{
        backgroundColor: 'var(--paper-warm)',
        borderLeft: '3px solid var(--accent)',
        lineHeight: 1.55,
      }}>
      {children}
    </div>
  );
}

const inlineCode = {
  backgroundColor: 'var(--paper-warm)',
  padding: '1px 4px',
  fontFamily: 'monospace',
  fontSize: '0.85em',
  border: '1px solid var(--rule)',
};
