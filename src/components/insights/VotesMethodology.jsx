// VotesMethodology — the 4th sub-tab.
// Comprehensive definitions for vote categories, defection scoring,
// constitutional amendment handling, and exclusions.

import { CategoryBadge } from './VotesSection.jsx';

export default function VotesMethodology({ data }) {
  // Pull live counts from data.stats for the category table
  const counts = data.overview.stats.by_category || {};
  const total = data.overview.stats.total_votes || 1;
  const pct = (n) => ((n || 0) / total * 100).toFixed(1);

  return (
    <div className="space-y-8 text-sm" style={{ color: 'var(--ink)' }}>

      {/* Intro */}
      <div>
        <p style={{ lineHeight: 1.6 }}>
          Every roll call in this dataset is classified by what it actually <em>is</em>.
          Different vote types tell different stories, and surfacing them separately
          is the difference between meaningful analysis and noise.
        </p>
      </div>

      {/* Section: Vote categories */}
      <Section title="Vote Categories">
        <p className="mb-4" style={{ lineHeight: 1.6 }}>
          Each vote is assigned a single category based on its <code style={inlineCode}>roll_call_desc</code> text.
          Categories are checked in priority order; the first match wins.
        </p>

        <div className="space-y-3">

          <CatRow
            badge="substantive"
            count={counts.substantive}
            pct={pct(counts.substantive)}
            description="Final passage of a bill or final adoption of a resolution. The “did this become law” vote. The headline category for policy analysis."
            patterns={['"Passage"', '"Passage By Substitute"', '"Passage As Amended"', '"Adopt" / "Adoption"', '"Adopt Conference Committee Report"']}
          />

          <CatRow
            badge="concurrence"
            count={counts.concurrence}
            pct={pct(counts.concurrence)}
            description="When the second chamber agrees to changes the first chamber made. Real policy stakes — accepting the other chamber’s version of the bill. Counts as substantive policy in headline metrics."
            patterns={['"Agree To House Substitute"', '"Agree To Senate Substitute"', '"Agree To Senate Amendment"', '"Agree To Ham" / "Sam"']}
          />

          <CatRow
            badge="amendment"
            count={counts.amendment}
            pct={pct(counts.amendment)}
            description="A vote on whether to add or modify specific amendment language — NOT on whether the bill passes. Often tactical or signaling. Beau Evans’s SR 246 example (sham amendments to the Trump resolution) falls here."
            patterns={['"Adoption Of Amendment #1"', '"Adoption Of Amend #1a By The Senator From..."', '"Adoption Of The Amendment"']}
            note='Note: "Adoption" alone (without "Of Amendment") IS substantive. The regex specifically requires "Of Amend" to follow.'
          />

          <CatRow
            badge="procedural"
            count={counts.procedural}
            pct={pct(counts.procedural)}
            description="Motions about how to handle a bill (table, reconsider, engross), not about its content. The reconsider vote on HR 1114 fell here — Beau’s bill had a third-attempt reconsider after the failed adoption vote."
            patterns={['"Motion To Table" / "Engross" / "Reconsider"', '"Reconsider"', '"Immediately Transmit"', '"Shall The Ruling Of The Chair Be Sustained"', '"Suspend Rules"']}
          />

          <CatRow
            badge="consent_calendar"
            count={counts.consent_calendar}
            pct={pct(counts.consent_calendar)}
            description="Bulk votes on dozens of uncontested local bills at once — county tax assessor pay, local zoning, charter amendments for cities. Almost always near-unanimous. Legitimate procedural mechanism but noise for policy analysis. Hidden by default in Browse."
            patterns={['"Local Calendar"', '"Local Consent Calendar"', '"Consent Calendar For Senate Study Committees"', '"Uncontested House Resolutions"']}
          />

          <CatRow
            badge="constitutional_amendment"
            count={counts.constitutional_amendment}
            pct={pct(counts.constitutional_amendment)}
            description="A vote whose action is specifically to adopt a constitutional amendment. Distinct from the bill-level Constitutional Amendment flag (see below)."
            patterns={['"Adoption Of Constitutional Amendment"']}
          />

          <CatRow
            badge="other"
            count={counts.other}
            pct={pct(counts.other)}
            description="Edge-case vote descriptions we haven’t categorized yet. Small enough to ignore for now. If this bucket grows when we expand to other states, we’ll add patterns."
            patterns={['(unmatched)']}
          />

        </div>
      </Section>

      {/* Section: Constitutional amendments */}
      <Section title="Constitutional Amendments in Georgia">
        <p className="mb-3" style={{ lineHeight: 1.6 }}>
          GA constitutional amendments are flagged in <strong>two</strong> ways:
        </p>

        <div className="space-y-3 mb-4">
          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--accent)' }}>
            <div className="font-bold mb-1">Bill-level: <code style={inlineCode}>is_constitutional_amendment = true</code></div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              When a bill’s title ends with “ - CA” (e.g., “Homeowner’s Incentive Adjustment clause; remove cap on benefits - CA”).
              These bills require 2/3 supermajority in both chambers to pass.
            </div>
          </div>

          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--accent)' }}>
            <div className="font-bold mb-1">Vote-level: <code style={inlineCode}>vote_category = constitutional_amendment</code></div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              When a specific roll-call action is “Adoption Of Constitutional Amendment.”
            </div>
          </div>
        </div>

        <p className="mb-3" style={{ lineHeight: 1.6 }}>
          The two work together. Even when a const-amendment bill’s vote has{' '}
          <code style={inlineCode}>vote_category = substantive</code> (because the action was “Adopt”),
          we still apply the 2/3 threshold via <code style={inlineCode}>effectively_passed</code>.
        </p>

        <CalloutBox>
          <strong>HR 1114 example:</strong> 99-73 (57.6%) shows <code style={inlineCode}>passed_raw = TRUE</code>{' '}
          from LegiScan but <code style={inlineCode}>effectively_passed = FALSE</code> because it fell short
          of the supermajority. The Browse tab and Notable Votes correctly display this as Failed.
        </CalloutBox>
      </Section>

      {/* Section: Defection methodology */}
      <Section title="Defection Methodology">
        <p className="mb-3" style={{ lineHeight: 1.6 }}>
          A <em>defection</em> is when a legislator votes opposite the majority of their party on a vote where{' '}
          <strong>75%+ of the party agreed</strong> on a position. Votes where the party was internally split (less than 75% consensus)
          are excluded entirely — there’s no clear position to defect from.
        </p>

        <p className="mb-3" style={{ lineHeight: 1.6 }}>
          Two metrics appear in legislator profiles:
        </p>

        <div className="space-y-3 mb-4">
          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--ink)' }}>
            <div className="font-bold mb-1">Headline defection rate</div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Substantive + concurrence votes on bills only. The “real policy dissent” measure.
              This is what the leaderboards default to.
            </div>
          </div>

          <div className="pl-3 border-l-2" style={{ borderColor: 'var(--ink-soft)' }}>
            <div className="font-bold mb-1">All-category defection rate</div>
            <div style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Includes amendments, procedural votes, and constitutional amendments alongside substantive.
              The “broad independence” measure. Shown as a secondary column.
            </div>
          </div>
        </div>

        <CalloutBox>
          <strong>Why two metrics?</strong> Charlice Byrd defects on substantive votes — real policy independence.
          Sonya Halpern almost never defects on substantive votes despite being GA’s #1 bipartisan collaborator
          (see Legislator Pairs). The two signals matter and we surface both.
        </CalloutBox>
      </Section>

      {/* Section: Cross-method note */}
      <Section title="Cross-Method Note: Pairs vs Votes">
        <p style={{ lineHeight: 1.6 }}>
          A legislator can be a top bipartisan collaborator (see Legislator Pairs) while having a low defection
          rate here. <strong>Cosponsorship and floor-vote behavior are different signals.</strong>{' '}
          Sonya Halpern is the clearest example: #1 cross-party cosponsor in GA, but ~98% party unity on roll calls.
          She negotiates in committee, votes in lockstep on the floor — the playbook of a skilled minority-party legislator.
        </p>
      </Section>

      {/* Section: Exclusions */}
      <Section title="Exclusions">
        <ul className="space-y-2 list-disc list-inside" style={{ lineHeight: 1.6 }}>
          <li>
            <strong>Speaker Jon Burns</strong> is excluded from voting analytics. Speakers traditionally
            vote only to break ties; including him would distort participation metrics.
          </li>
          <li>
            <strong>Shelly Hutchinson</strong> is excluded — departed mid-session with no recorded votes.
          </li>
          <li>
            <strong>Consent calendar votes</strong> are hidden by default in Browse but available via category filter.
            They appear in legislator drill-downs only if explicitly filtered for.
          </li>
        </ul>
      </Section>

      {/* Source */}
      <div className="pt-4 border-t text-xs italic"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
        Source: GA {data.overview.session_label}, {data.overview.stats.total_votes.toLocaleString()} roll calls,{' '}
        {data.legislators.legislators_active.length} active legislators.
        Methodology reviewed by Beau Evans (GA State Affairs reporter), May 2026.
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

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

function CatRow({ badge, count, pct, description, patterns, note }) {
  return (
    <div className="p-3 border" style={{
      borderColor: 'var(--rule)', backgroundColor: 'var(--paper)',
    }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <CategoryBadge category={badge} />
          {count != null && (
            <span className="text-xs tabular-nums" style={{ color: 'var(--ink-soft)' }}>
              {count.toLocaleString()} votes · {pct}%
            </span>
          )}
        </div>
      </div>
      <div className="text-xs mb-2" style={{ color: 'var(--ink)', lineHeight: 1.55 }}>
        {description}
      </div>
      <div className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
        <span className="uppercase tracking-wider mr-2">Patterns:</span>
        <span style={{ fontFamily: 'monospace' }}>{patterns.join(' · ')}</span>
      </div>
      {note && (
        <div className="text-[10px] mt-1.5 italic"
          style={{ color: 'var(--ink-soft)', lineHeight: 1.4 }}>
          {note}
        </div>
      )}
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
