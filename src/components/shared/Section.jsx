import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Lifted verbatim from state-directory's Section component.
// Expandable card with icon, small-caps title, optional badge, chevron.
export default function Section({ icon: Icon, title, children, defaultOpen = false, badge, subtitle }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-3 border" style={{ borderColor: 'var(--rule)', backgroundColor: open ? 'var(--paper)' : 'transparent' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-4 group transition-colors"
        style={{
          backgroundColor: open ? 'var(--paper-warm)' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={16} style={{ color: 'var(--accent)' }} />}
          <h2 className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--ink)', fontWeight: 600 }}>{title}</h2>
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-sm font-mono"
              style={{ backgroundColor: 'var(--paper)', color: 'var(--ink-soft)', border: '1px solid var(--rule)' }}>
              {badge}
            </span>
          )}
          {subtitle && open && (
            <span className="text-[10px] italic ml-2" style={{ color: 'var(--ink-soft)' }}>{subtitle}</span>
          )}
        </div>
        <div
          className="flex items-center justify-center rounded-sm"
          style={{
            width: 28, height: 28,
            backgroundColor: open ? 'var(--ink)' : 'var(--paper)',
            color: open ? 'var(--paper)' : 'var(--ink)',
            border: '1px solid var(--rule)',
            transition: 'all 200ms ease',
          }}
        >
          <ChevronDown size={18} style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
            strokeWidth: 2.5,
          }} />
        </div>
      </button>
      <div style={{
        maxHeight: open ? '20000px' : '0',
        overflow: 'hidden',
        transition: 'max-height 400ms ease, opacity 200ms ease',
        opacity: open ? 1 : 0,
      }}>
        <div className="px-4 pb-5 pt-2">{children}</div>
      </div>
    </section>
  );
}
