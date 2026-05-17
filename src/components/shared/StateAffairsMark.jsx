// The small "SA" wordmark badge.
export default function StateAffairsMark({ size = 13 }) {
  return (
    <span
      className="inline-flex items-center justify-center font-bold tracking-tight"
      style={{
        width: size + 4,
        height: size + 2,
        fontSize: size - 3,
        backgroundColor: 'var(--ink)',
        color: 'var(--paper)',
        borderRadius: 2,
        lineHeight: 1,
      }}
    >
      SA
    </span>
  );
}
