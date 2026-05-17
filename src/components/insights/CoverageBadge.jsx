// CoverageBadge — green/amber/red data quality indicator.
// Used in section headers and the coverage matrix view.

const styles = {
  good:    { color: 'var(--coverage-good)',    label: 'Complete' },
  partial: { color: 'var(--coverage-partial)', label: 'Partial'  },
  poor:    { color: 'var(--coverage-poor)',    label: 'Limited'  },
  unknown: { color: 'var(--ink-soft)',         label: 'Unknown'  },
};

export default function CoverageBadge({ level = 'unknown', label, tooltip }) {
  const s = styles[level] || styles.unknown;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider"
      style={{ color: 'var(--ink-soft)' }}
      title={tooltip}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 8,
          height: 8,
          backgroundColor: s.color,
        }}
      />
      {label || s.label}
    </span>
  );
}
