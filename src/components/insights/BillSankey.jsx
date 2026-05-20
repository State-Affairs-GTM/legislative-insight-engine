// BillSankey — staged Sankey for bill flow with hover tooltips,
// chamber-crossover divider, and optional veto/override branches.
//
// Visual model: y-axis = cohort of introduced bills. X-axis = progression.
// Terminals drop off at increasing column positions as bills die later
// in the process. The vertical dashed line at 50% marks the "crossover"
// point — to your right is the second chamber's territory.
//
//   col 0:  INTRODUCED
//   col 1:  STUCK IN 1ST (terminal)
//   col 2:  ENGROSSED (terminal — passed 1, died in 2nd)
//           ----- 50% crossover line -----
//   col 3:  PASSED 2ND (conduit — splits to outcome)
//   col 4:  VETOED (terminal, only if present)
//           OVERRIDE PASSED (terminal, only if present — counts as enacted)
//           BECAME LAW (terminal)
//
// Counts schema (forward-compatible):
//   counts.introduced
//   counts.stuck
//   counts.engrossed
//   counts.passed         — became law via normal route
//   counts.vetoed         — final vetoed, NOT overridden  (optional)
//   counts.override_passed — vetoed BUT overridden, became law (optional)
//
// If vetoed/override aren't in the data, those nodes are not rendered and
// the chart looks like the simpler 4-stage version.

import { useMemo, useState, useRef, useEffect } from 'react';
import { sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey';

const TYPE_ORDER = ['Bills', 'Resolutions', 'Joint Res.'];

const COLORS = {
  origin:    '#6b655a',
  stuck:     '#a72f2f',
  engrossed: '#c8924f',
  passed:    '#5b8a3a',
  vetoed:    '#7a2222',
  override:  '#3a6b2e',  // darker green for "became law via override"
  conduit:   '#a59f8e',
};

export default function BillSankey({ funnel }) {
  const [activeType, setActiveType] = useState('Bills');

  if (!funnel || !funnel.stages || !funnel.tracks) {
    return (
      <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
        No funnel data.
      </div>
    );
  }

  const availableTypes = useMemo(() => {
    const set = new Set();
    funnel.tracks.forEach((t) => t.rows.forEach((r) => set.add(r.type)));
    return TYPE_ORDER.filter((t) => set.has(t));
  }, [funnel]);

  return (
    <div className="space-y-6">
      <TypeToggle types={availableTypes} active={activeType} onChange={setActiveType} />
      <div className="space-y-10">
        {funnel.tracks.map((track) => {
          const row = track.rows.find((r) => r.type === activeType);
          return (
            <ChamberBlock key={track.chamber} chamber={track.chamber}>
              {row ? (
                <StagedSankey counts={row.counts} chamber={track.chamber} type={activeType} />
              ) : (
                <div className="text-xs italic py-6 text-center" style={{ color: 'var(--ink-soft)' }}>
                  No {activeType.toLowerCase()} data for {track.chamber}.
                </div>
              )}
            </ChamberBlock>
          );
        })}
      </div>
    </div>
  );
}

function TypeToggle({ types, active, onChange }) {
  return (
    <div className="flex items-center gap-1 border w-fit"
      style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--paper-warm)' }}>
      {types.map((t, i) => {
        const isActive = t === active;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className="px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors"
            style={{
              color: isActive ? 'var(--paper)' : 'var(--ink-soft)',
              backgroundColor: isActive ? 'var(--ink)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              borderRight: i !== types.length - 1 ? '1px solid var(--rule)' : 'none',
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function ChamberBlock({ chamber, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.2em] mb-3 pb-2 border-b"
        style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
        {chamber}
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// StagedSankey — main chart
// ============================================================================
function StagedSankey({ counts, chamber, type }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(900);
  const [hover, setHover] = useState(null);  // { kind: 'node'|'link', data, x, y }

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Auto-size height: taller if veto/override branches present
  const hasVetoBranch = (counts.vetoed || 0) > 0 || (counts.override_passed || 0) > 0;
  const HEIGHT = hasVetoBranch ? 340 : 280;
  const MARGIN = { top: 16, right: 160, bottom: 28, left: 110 };

  const otherChamber = chamber === 'House' ? 'Senate' : 'House';

  const layout = useMemo(() => {
    const introduced       = counts.introduced || 0;
    const stuck            = counts.stuck || 0;
    const engrossed        = counts.engrossed || 0;
    const passedTotal      = counts.passed || 0;      // became-law (incl. override if you bundle)
    const vetoed           = counts.vetoed || 0;
    const overridePassed   = counts.override_passed || 0;

    // The "became law via normal signing" = passedTotal minus any override-counted
    // bills if your data includes override in passed. To be unambiguous, we
    // treat them as distinct counts now:
    //   passed         = signed normally
    //   override_passed = became law via override
    //   vetoed         = final vetoed, not overridden
    // If your SQL puts everything-that-became-law in passed and vetoed is
    // separate, set override_passed=0 and we're fine.

    const accounted = stuck + engrossed + passedTotal + vetoed + overridePassed;
    const other     = Math.max(0, introduced - accounted);

    const survivedFirstChamber = engrossed + passedTotal + vetoed + overridePassed + other;
    const survivedSecondChamber = passedTotal + vetoed + overridePassed + other;

    const nodes = [
      { id: 'introduced', name: 'Introduced',  count: introduced, kind: 'origin' },
      { id: 'stuck',      name: 'Stuck in 1st', count: stuck,     kind: 'stuck',
        subtitle: 'filed but no chamber passage' },
      { id: 'conduit_a',  name: '',             count: survivedFirstChamber,
        kind: 'conduit', hidden: true },
      { id: 'engrossed',  name: 'Engrossed',    count: engrossed, kind: 'engrossed',
        subtitle: 'passed 1, still in 2nd' },
      { id: 'conduit_b',  name: '',             count: survivedSecondChamber,
        kind: 'conduit', hidden: true },
    ];

    // Outcome nodes — added conditionally
    if (vetoed > 0) {
      nodes.push({ id: 'vetoed', name: 'Vetoed', count: vetoed, kind: 'vetoed',
        subtitle: 'final — not overridden' });
    }
    if (overridePassed > 0) {
      nodes.push({ id: 'override_passed', name: 'Override', count: overridePassed, kind: 'override',
        subtitle: 'vetoed, became law' });
    }
    nodes.push({ id: 'became_law', name: 'Became Law', count: passedTotal, kind: 'passed' });
    if (other > 0) {
      nodes.push({ id: 'other', name: 'Other', count: other, kind: 'stuck',
        subtitle: 'withdrawn/indeterminate' });
    }

    const idIndex = Object.fromEntries(nodes.map((n, i) => [n.id, i]));

    const linkDefs = [];
    if (stuck > 0)                    linkDefs.push(['introduced', 'stuck',           stuck]);
    if (survivedFirstChamber > 0)     linkDefs.push(['introduced', 'conduit_a',       survivedFirstChamber]);
    if (engrossed > 0)                linkDefs.push(['conduit_a',  'engrossed',       engrossed]);
    if (survivedSecondChamber > 0)    linkDefs.push(['conduit_a',  'conduit_b',       survivedSecondChamber]);
    if (vetoed > 0)                   linkDefs.push(['conduit_b',  'vetoed',          vetoed]);
    if (overridePassed > 0)           linkDefs.push(['conduit_b',  'override_passed', overridePassed]);
    if (passedTotal > 0)              linkDefs.push(['conduit_b',  'became_law',      passedTotal]);
    if (other > 0)                    linkDefs.push(['conduit_b',  'other',           other]);

    const sankeyLinks = linkDefs.map(([s, t, v]) => ({
      source: idIndex[s],
      target: idIndex[t],
      value: v,
    }));

    const generator = sankey()
      .nodeAlign(sankeyLeft)
      .nodeWidth(12)
      .nodePadding(20)
      .extent([[MARGIN.left, MARGIN.top], [width - MARGIN.right, HEIGHT - MARGIN.bottom]]);

    return generator({
      nodes: nodes.map((n) => ({ ...n })),
      links: sankeyLinks,
    });
  }, [counts, width, HEIGHT]);

  const totalIntroduced = counts.introduced || 0;
  const pct = (n) => totalIntroduced > 0 ? Math.round((n / totalIntroduced) * 100) : 0;

  // Crossover divider X position — midpoint between conduit_a and conduit_b columns
  const conduitA = layout.nodes.find((n) => n.id === 'conduit_a');
  const conduitB = layout.nodes.find((n) => n.id === 'conduit_b');
  const crossoverX = conduitA && conduitB
    ? (conduitA.x1 + conduitB.x0) / 2
    : null;

  return (
    <div ref={containerRef} className="w-full relative">
      <svg
        width={width}
        height={HEIGHT}
        style={{ display: 'block' }}
        role="img"
        aria-label={`Staged Sankey of ${type} flow in ${chamber}: ${totalIntroduced.toLocaleString()} introduced.`}
        onMouseLeave={() => setHover(null)}
      >
        {/* Crossover divider */}
        {crossoverX != null && (
          <g>
            <line
              x1={crossoverX}
              y1={MARGIN.top - 4}
              x2={crossoverX}
              y2={HEIGHT - MARGIN.bottom + 4}
              stroke="var(--ink-soft)"
              strokeWidth={1}
              strokeDasharray="3,4"
              opacity={0.5}
            />
            <text
              x={crossoverX}
              y={HEIGHT - 8}
              textAnchor="middle"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '9px',
                fill: 'var(--ink-soft)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontStyle: 'italic',
              }}
            >
              to {otherChamber.toLowerCase()} →
            </text>
          </g>
        )}

        {/* Links */}
        <g fill="none">
          {layout.links.map((link, i) => {
            const targetNode = layout.nodes[link.target.index];
            const sourceNode = layout.nodes[link.source.index];
            const color = COLORS[targetNode.kind] || COLORS.conduit;
            return (
              <path
                key={i}
                d={sankeyLinkHorizontal()(link)}
                stroke={color}
                strokeOpacity={targetNode.kind === 'conduit' ? 0.18 : 0.4}
                strokeWidth={Math.max(1, link.width)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const rect = containerRef.current.getBoundingClientRect();
                  setHover({
                    kind: 'link',
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    data: {
                      sourceName: sourceLabel(sourceNode),
                      targetName: targetLabel(targetNode),
                      value: link.value,
                      pct: pct(link.value),
                    },
                  });
                }}
                onMouseMove={(e) => {
                  const rect = containerRef.current.getBoundingClientRect();
                  setHover((h) => h
                    ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top }
                    : null);
                }}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {layout.nodes.map((node) => {
            if (node.hidden) return null;
            const isSource = node.id === 'introduced';
            const labelX = isSource ? node.x0 - 10 : node.x1 + 8;
            const labelAnchor = isSource ? 'end' : 'start';
            const nodePct = pct(node.count);
            return (
              <g key={node.id}>
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={node.x1 - node.x0}
                  height={Math.max(2, node.y1 - node.y0)}
                  fill={COLORS[node.kind]}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current.getBoundingClientRect();
                    setHover({
                      kind: 'node',
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      data: {
                        name: node.name || node.id,
                        subtitle: node.subtitle,
                        count: node.count,
                        pct: nodePct,
                      },
                    });
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current.getBoundingClientRect();
                    setHover((h) => h
                      ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top }
                      : null);
                  }}
                  onMouseLeave={() => setHover(null)}
                />
                <text
                  x={labelX}
                  y={(node.y0 + node.y1) / 2}
                  dy="0.35em"
                  textAnchor={labelAnchor}
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: '12px',
                    fill: 'var(--ink)',
                  }}
                >
                  <tspan style={{ fontWeight: 700 }}>{node.count.toLocaleString()}</tspan>
                  <tspan dx="6" style={{ fill: 'var(--ink-soft)', fontSize: '11px' }}>{nodePct}%</tspan>
                </text>
                <text
                  x={labelX}
                  y={(node.y0 + node.y1) / 2 + 15}
                  textAnchor={labelAnchor}
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: '10px',
                    fill: 'var(--ink-soft)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {node.name}
                </text>
                {node.subtitle && (
                  <text
                    x={labelX}
                    y={(node.y0 + node.y1) / 2 + 28}
                    textAnchor={labelAnchor}
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: '9px',
                      fill: 'var(--ink-soft)',
                      fontStyle: 'italic',
                    }}
                  >
                    {node.subtitle}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip — positioned absolutely over the container */}
      {hover && <Tooltip hover={hover} chamber={chamber} type={type} containerWidth={width} />}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

// Friendly labels for source/target in link tooltips (conduits get renamed)
function sourceLabel(node) {
  if (node.id === 'conduit_a') return 'Passed 1st chamber';
  if (node.id === 'conduit_b') return 'Passed both chambers';
  return node.name || node.id;
}
function targetLabel(node) {
  if (node.id === 'conduit_a') return 'continued past 1st chamber';
  if (node.id === 'conduit_b') return 'continued past 2nd chamber';
  return node.name || node.id;
}

function Tooltip({ hover, chamber, type, containerWidth }) {
  // Pin tooltip to the right of the cursor unless near the right edge
  const PAD = 14;
  const WIDTH = 240;
  const left = hover.x + PAD + WIDTH > containerWidth
    ? hover.x - PAD - WIDTH
    : hover.x + PAD;
  const top = hover.y + 8;

  return (
    <div
      style={{
        position: 'absolute',
        left, top,
        width: WIDTH,
        pointerEvents: 'none',
        zIndex: 10,
        backgroundColor: 'var(--paper)',
        border: '1px solid var(--ink)',
        boxShadow: '2px 2px 0 var(--rule)',
        padding: '8px 10px',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '11px',
        color: 'var(--ink)',
        lineHeight: 1.4,
      }}
    >
      {hover.kind === 'node' ? (
        <>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em',
                        color: 'var(--ink-soft)', marginBottom: 3 }}>
            {chamber} · {type}
          </div>
          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: 2 }}>
            {hover.data.name}
          </div>
          {hover.data.subtitle && (
            <div style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 4 }}>
              {hover.data.subtitle}
            </div>
          )}
          <div>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>
              {hover.data.count.toLocaleString()}
            </span>
            <span style={{ marginLeft: 6, color: 'var(--ink-soft)' }}>
              {hover.data.pct}% of introduced
            </span>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em',
                        color: 'var(--ink-soft)', marginBottom: 3 }}>
            {chamber} · {type}
          </div>
          <div style={{ marginBottom: 3 }}>
            <span style={{ color: 'var(--ink-soft)' }}>From:</span> {hover.data.sourceName}
          </div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: 'var(--ink-soft)' }}>To:</span> {hover.data.targetName}
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>
              {hover.data.value.toLocaleString()}
            </span>
            <span style={{ marginLeft: 6, color: 'var(--ink-soft)' }}>
              {hover.data.pct}% of introduced
            </span>
          </div>
        </>
      )}
    </div>
  );
}
