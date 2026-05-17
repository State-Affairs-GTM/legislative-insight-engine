import { Link } from 'react-router-dom';
import { FileDown, ExternalLink } from 'lucide-react';
import StateOutline from '../insights/StateOutline.jsx';
import CoverageBadge from '../insights/CoverageBadge.jsx';

export default function StateHeader({ summary }) {
  if (!summary) return null;

  return (
    <header className="mb-8 pb-6 border-b" style={{ borderColor: 'var(--rule)' }}>
      <div className="flex items-start gap-6">
        <StateOutline code={summary.abbr} size={140} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--ink-soft)' }}>
              State of {summary.name} · {summary.abbr}
            </span>
          </div>
          <h1 className="mb-1" style={{
            fontSize: 56,
            lineHeight: 1.0,
            color: 'var(--ink)',
            fontWeight: 400,
          }}>
            {summary.name}
          </h1>
          <div className="text-sm italic mb-3" style={{ color: 'var(--ink-soft)' }}>
            {summary.assembly_name} · {summary.session_label}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <SessionStatusPill status={summary.session_status} />
            {summary.coverage_overall && (
              <CoverageBadge level={summary.coverage_overall} label={`Data: ${summary.coverage_overall_label || summary.coverage_overall}`} />
            )}
            {summary.legislature_url && (
              <a
                href={summary.legislature_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] inline-flex items-center gap-1 hover:underline"
                style={{ color: 'var(--ink-soft)' }}
              >
                Official site <ExternalLink size={10} />
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              disabled
              className="text-xs px-3 py-1.5 inline-flex items-center gap-2 border"
              style={{
                borderColor: 'var(--rule)',
                backgroundColor: 'var(--paper-warm)',
                color: 'var(--ink-soft)',
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
              title="Whitepaper PDF generation arrives in Phase 3"
            >
              <FileDown size={12} /> Generate Whitepaper (Phase 3)
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function SessionStatusPill({ status }) {
  const map = {
    'in-session':   { color: 'var(--ind)',     bg: 'var(--ind-bg)',     label: 'In Session' },
    'sine-die':     { color: 'var(--ink-soft)',bg: 'var(--neutral-bg)', label: 'Sine Die' },
    'pre-session':  { color: 'var(--accent)',  bg: 'var(--paper-warm)', label: 'Pre-Session' },
    'recess':       { color: 'var(--accent)',  bg: 'var(--paper-warm)', label: 'In Recess' },
  };
  const s = map[status] || { color: 'var(--ink-soft)', bg: 'var(--neutral-bg)', label: status || 'Unknown' };
  return (
    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm"
      style={{ backgroundColor: s.bg, color: s.color, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}
