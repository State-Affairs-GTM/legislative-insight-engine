export default function PartyChip({ party }) {
  const styles = {
    R: { bg: 'var(--gop-bg)', color: 'var(--gop)', label: 'R' },
    D: { bg: 'var(--dem-bg)', color: 'var(--dem)', label: 'D' },
    I: { bg: 'var(--ind-bg)', color: 'var(--ind)', label: 'I' },
    '—': { bg: 'var(--neutral-bg)', color: 'var(--ink-soft)', label: '—' },
  };
  const s = styles[party] || styles['—'];
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-sm tracking-tight"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}
