// PartisanshipMethodology — the methodology tab.
// Full explanation of bill scoring, BS, BV (with party-relative defection adjustment), state portability.

export default function PartisanshipMethodology({ data }) {
  const stats = data.overview.stats;
  const baselines = data.overview.baselines;
  const thresholds = data.overview.thresholds || {};

  return (
    <div className="space-y-8 text-sm" style={{ color: 'var(--ink)' }}>

      <div>
        <p style={{ lineHeight: 1.6 }}>
          Every legislator gets two scores from −1 (super-Democrat) to +1 (super-Republican),
          with 0 meaning truly bipartisan behavior. The two scores measure different things:
        </p>
        <ul className="mt-3 space-y-1.5 list-disc list-inside text-sm" style={{ lineHeight: 1.6 }}>
          <li><strong>BS (Bill Sponsorship)</strong> — the partisan flavor of bills they attach their name to (as primary sponsor or cosponsor).</li>
          <li><strong>BV (Bill Voting)</strong> — how they vote relative to their own party's consensus on partisan bills.</li>
        </ul>
        <p className="mt-3" style={{ lineHeight: 1.6 }}>
          A legislator can have a strongly partisan BS but a less partisan BV (they sponsor with their caucus but
          occasionally vote across the aisle), or vice versa. The gap between BS and BV is itself a story.
        </p>
      </div>

      <Section title="Step 1: Score Every Bill">
        <p className="mb-3" style={{ lineHeight: 1.6 }}>
          First, each bill gets a partisanship score from −1 to +1 based on two components:
        </p>

        <div className="space-y-3 mb-4">
          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--ink)' }}>
            <div className="font-bold mb-1">Pre-score (sponsorship makeup)</div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              <code style={inlineCode}>0.65 × primary_party_signal + 0.35 × cosponsor_party_mix</code>
              <br /><br />
              In Georgia (single primary sponsor), primary_party_signal is binary: +1.0 if Republican,
              −1.0 if Democrat. Cosponsor mix ranges from −1 (all Dem) to +1 (all Rep).
              The pre-score captures who chose to author and lend their name to the bill.
            </div>
          </div>

          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--ink)' }}>
            <div className="font-bold mb-1">Post-score (voting reception)</div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              <code style={inlineCode}>gop_yea_pct − dem_yea_pct</code> over substantive + concurrence votes.
              Captures how the two parties actually voted. Ranges from −1 (only Dems voted Yea) to +1 (only Reps voted Yea).
            </div>
          </div>

          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--accent)' }}>
            <div className="font-bold mb-1">Final bill partisanship score</div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              <code style={inlineCode}>0.60 × pre + 0.40 × post</code>
              <br /><br />
              Sponsorship is weighted heavier because it captures bill identity. The voting half adjusts for
              actual reception. A bill primarily authored by Republicans (pre = +0.84) that gets significant
              Dem crossover (post = +0.33) lands at +0.64 — clearly Republican but with the crossover registered.
            </div>
          </div>
        </div>

        <CalloutBox>
          <strong>Why sponsorship is weighted heavier:</strong> If we relied purely on votes, bipartisan
          crossovers would dilute the score and disappear. We want to preserve "this was a Dem bill" as a
          signal, even when some Republicans crossed over to support it. Their crossover then shows up in
          their personal BV score instead.
        </CalloutBox>
      </Section>

      <Section title="Step 2: BS — Bill Sponsorship Partisanship">
        <p className="mb-3" style={{ lineHeight: 1.6 }}>
          For each legislator, BS is a weighted average of the partisanship scores of bills they attached to:
        </p>
        <div className="p-3 mb-3" style={{
          backgroundColor: 'var(--paper-warm)',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: 1.5,
          border: '1px solid var(--rule)',
        }}>
          BS = Σ(bill_partisanship × engagement_weight × |bill_partisanship|)
          {' / '}
          Σ(engagement_weight × |bill_partisanship|)
        </div>
        <ul className="space-y-1.5 list-disc list-inside text-xs" style={{ lineHeight: 1.5 }}>
          <li><strong>Primary sponsor engagement weight: 1.5×</strong></li>
          <li><strong>Cosponsor engagement weight: 1.0×</strong></li>
          <li>Bills also weighted by their absolute partisanship (|bill_partisanship|), so strongly
              partisan bills dominate the legislator's BS more than weakly partisan ones.</li>
          <li>Only bills (not resolutions); only contested bills with clear party signal.</li>
        </ul>
      </Section>

      <Section title="Step 3: BV — Party-Relative Voting Partisanship">
        <p className="mb-3" style={{ lineHeight: 1.6 }}>
          BV is more subtle. We initially tried averaging bill partisanship scores across a legislator's
          Yea votes, but in a supermajority state this just reflects which bills reach the floor — not
          personal partisan behavior. The fix: anchor at the party baseline and adjust for defections.
        </p>

        <div className="space-y-3 mb-3">
          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--ink)' }}>
            <div className="font-bold mb-1">Party baseline</div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              The mean BS score across all members of a party. Computed from the data:
              <br /><br />
              <strong>Democrats baseline: {baselines?.Democrat?.toFixed(2)}</strong>{' '}·{' '}
              <strong>Republicans baseline: {baselines?.Republican?.toFixed(2)}</strong>
            </div>
          </div>

          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--ink)' }}>
            <div className="font-bold mb-1">Defection adjustment</div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              For each substantive/concurrence vote on a partisan bill (|partisanship| ≥ {thresholds.partisan_bill_threshold ?? 0.3}),
              where 75%+ of the party agreed on a position:
              <br /><br />
              <ul className="space-y-1 list-disc list-inside">
                <li>If they voted WITH their party majority: no adjustment</li>
                <li>If they DEFECTED: contribution = vote_direction × bill_partisanship × magnitude</li>
              </ul>
              <br />
              The vote direction matters: a Dem voting Yea on a +0.8 R-bill contributes +0.8 (pulls toward Rep);
              a Rep voting Nay on a +0.8 R-bill contributes −0.8 (pulls toward Dem).
            </div>
          </div>

          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--accent)' }}>
            <div className="font-bold mb-1">Final BV</div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              <code style={inlineCode}>BV = party_baseline + Σ(defection_contribution × magnitude) / Σ(magnitude)</code>
              <br /><br />
              A perfectly disciplined Dem stays at the Dem baseline ({baselines?.Democrat?.toFixed(2)}).
              A Dem who defects on a quarter of R-bills (voting Yea against caucus) gets pulled meaningfully
              toward 0 or positive. A Republican who defects against R-bills 35% of the time (like Colton Moore
              in GA) gets pulled below the GOP baseline by ~0.20.
            </div>
          </div>
        </div>

        <CalloutBox>
          <strong>Why party-relative:</strong> In a supermajority state, raw vote-tally approaches push
          everyone in one direction because the bill mix is asymmetric. Party-relative scoring isolates
          the personal signal: how often does this legislator break with their caucus on contested votes?
        </CalloutBox>
      </Section>

      <Section title="Interpreting the Scale">
        <div className="space-y-2 text-xs" style={{ lineHeight: 1.6 }}>
          <ScaleRow score="−1.0 to −0.7" label="Strong Democrat" desc="Sponsors and votes consistently with the Democratic caucus on partisan issues" />
          <ScaleRow score="−0.7 to −0.3" label="Lean Democrat"   desc="Mostly Democrat-aligned with some bipartisan engagement" />
          <ScaleRow score="−0.3 to +0.3" label="Bipartisan"      desc="Behavior is centrist or unclear — rare in highly polarized states" />
          <ScaleRow score="+0.3 to +0.7" label="Lean Republican" desc="Mostly Republican-aligned with some bipartisan engagement" />
          <ScaleRow score="+0.7 to +1.0" label="Strong Republican" desc="Sponsors and votes consistently with the Republican caucus" />
        </div>
        <p className="mt-3 text-xs italic" style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          In Georgia's 2025-2026 session, the vast majority of legislators score within ±0.3 of their party
          baseline. Crossover scores are rare and meaningful when they appear.
        </p>
      </Section>

      <Section title="Cross-Method Notes">
        <p className="mb-3" style={{ lineHeight: 1.6 }}>
          BS and BV measure related but distinct dimensions of partisan behavior:
        </p>
        <ul className="space-y-2 list-disc list-inside text-xs" style={{ lineHeight: 1.5 }}>
          <li><strong>BS = "What kind of legislator are you on paper?"</strong> What bills do you choose to author and attach your name to?</li>
          <li><strong>BV = "What kind of legislator are you on the floor?"</strong> When the chips are down on partisan bills, do you stick with caucus or cross over?</li>
          <li>The <strong>BV − BS gap</strong> reveals behavioral mismatch: a legislator who sponsors moderate
              bills but votes party-line, or a legislator who sponsors with caucus but votes across the aisle.
              The largest gaps in this session deserve a closer look.</li>
          <li>Both are distinct from the <strong>Legislator Pairs</strong> section (which measures cross-party
              collaboration partnerships) and the <strong>Votes</strong> section (which measures raw defection rates).</li>
        </ul>
      </Section>

      <Section title="Georgia-Specific Notes">
        <ul className="space-y-2 list-disc list-inside text-xs" style={{ lineHeight: 1.5 }}>
          <li>
            <strong>Single primary sponsor convention.</strong> In Georgia, every bill has exactly one primary sponsor.
            This is unusual: most states allow multiple primary sponsors. The pre-score weight (0.65 primary / 0.35 cosponsor)
            is calibrated to this convention. Multi-primary states would use different weights.
          </li>
          <li>
            <strong>GOP supermajority dynamic.</strong> Republicans hold ~135 seats vs Democrats ~105. Most contested
            bills are R-authored, so even moderate Dems show up with negative BV (they consistently Nay R-bills).
            The party-relative methodology corrects for this by anchoring at party baselines.
          </li>
          <li>
            <strong>Resolutions excluded.</strong> Most GA resolutions are commemorative and don't carry partisan signal.
            Only bills (bill_type_id = 1) are scored.
          </li>
          <li>
            <strong>Vote categories.</strong> Only substantive + concurrence votes count toward BV. Consent calendar,
            procedural, and amendment votes are excluded (see Votes methodology).
          </li>
          <li>
            <strong>Minimum vote threshold.</strong> Legislators with fewer than {thresholds.min_votes_for_bv ?? 50} partisan
            votes don't get a reliable BV (mid-session arrivals, departures, etc.).
          </li>
        </ul>
      </Section>

      <div className="pt-4 border-t text-xs italic"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
        Source: GA {data.overview.session_label}, {stats.total_bills_scored.toLocaleString()} bills scored,{' '}
        {stats.total_legislators} legislators. Methodology v3.1 (party-relative defection-weighted BV).
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

function ScaleRow({ score, label, desc }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-[10px] tabular-nums"
        style={{ color: 'var(--ink-soft)', minWidth: 100 }}>
        {score}
      </span>
      <span className="font-bold" style={{ color: 'var(--ink)', minWidth: 130 }}>
        {label}
      </span>
      <span style={{ color: 'var(--ink-soft)' }}>{desc}</span>
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
