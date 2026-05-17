import { scoreColor } from '../../lib/tokens.js';

// Renders a partisanship score as a colored chip.
// score: number from -1 to +1, where -1 = strongly D, +1 = strongly R.
export default function ScoreBadge({ score, n, label, size = 'md' }) {
  if (score == null || isNaN(score)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] italic" style={{ color: 'var(--ink-soft)' }}>
        Unscored
      </span>
    );
  }

  const color = scoreColor(score);
  const display = score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
  const sizes = {
    sm: { fontSize: 10, py: 1, px: 5 },
    md: { fontSize: 12, py: 2, px: 8 },
    lg: { fontSize: 14, py: 3, px: 10 },
  };
  const sz = sizes[size] || sizes.md;

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono rounded-sm"
      style={{
        backgroundColor: 'var(--paper)',
        border: `1px solid ${color}`,
        color: color,
        fontSize: sz.fontSize,
        padding: `${sz.py}px ${sz.px}px`,
      }}
      title={n != null ? `n=${n}` : undefined}
    >
      {label && <span style={{ color: 'var(--ink-soft)' }}>{label}</span>}
      <span style={{ fontWeight: 700 }}>{display}</span>
      {n != null && <sup className="text-[9px]" style={{ color: 'var(--ink-soft)' }}>n={n}</sup>}
    </span>
  );
}
