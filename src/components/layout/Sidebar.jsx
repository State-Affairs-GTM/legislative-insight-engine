import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Search, BarChart3, Users, FileText, Network, FileBarChart,
  MessageSquare, BookOpen, ShieldCheck, Database, ArrowLeft,
} from 'lucide-react';
import StateAffairsMark from '../shared/StateAffairsMark.jsx';
import STATES from '../../data/reference/states.js';

const TOP_NAV = [
  { to: '/',             label: 'Overview',             pill: 'GRID',     icon: BarChart3 },
  { to: '/partisanship', label: 'Partisanship',         pill: 'RANK',     icon: BarChart3, disabled: true, note: 'Phase 2' },
  { to: '/legislators',  label: 'Legislator Index',     pill: 'BROWSE',   icon: Users,     disabled: true, note: 'Phase 2' },
  { to: '/bills',        label: 'Bill Explorer',        pill: 'FILTER',   icon: FileText,  disabled: true, note: 'Phase 2' },
  { to: '/best-buddies', label: 'Best Buddies',         pill: 'NETWORK',  icon: Network,   disabled: true, note: 'Phase 2' },
  { to: '/reports',      label: 'Cross-State Reports',  pill: 'BUILD',    icon: FileBarChart, disabled: true, note: 'Phase 3' },
  { to: '/search',       label: 'Plain-Language Search',pill: 'ASK',      icon: MessageSquare, disabled: true, note: 'Phase 3' },
  { to: '/nuances',      label: 'State Nuances',        pill: 'CATALOG',  icon: BookOpen },
];

const REF_LINKS = [
  { to: '/methodology', label: 'Methodology',     icon: ShieldCheck },
  { to: '/coverage',    label: 'Data Coverage',   icon: Database },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside
      className="w-72 shrink-0 border-r min-h-screen sticky top-0 self-start"
      style={{
        backgroundColor: 'var(--paper-warm)',
        borderColor: 'var(--rule)',
      }}
    >
      <div className="p-6">
        {/* Wordmark */}
        <div className="flex items-center gap-2 mb-1">
          <StateAffairsMark size={14} />
          <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--ink-soft)' }}>
            State Affairs
          </span>
        </div>
        <h1 className="text-xl mb-0.5" style={{ color: 'var(--ink)', fontWeight: 700 }}>
          Insight Engine
        </h1>
        <div className="text-[10px] italic mb-4" style={{ color: 'var(--ink-soft)' }}>
          50-state legislative analysis · 2026 beta
        </div>

        {/* Back to directory */}
        <a
          href="https://state-directory.vercel.app"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-[11px] mb-4 hover:underline"
          style={{ color: 'var(--ink-soft)' }}
        >
          <ArrowLeft size={12} /> Back to Directory
        </a>

        {/* Search */}
        <div className="relative mb-5">
          <input
            type="text"
            placeholder="Search states & legislators…"
            className="w-full text-xs px-3 py-2 pr-8 border"
            style={{
              backgroundColor: 'var(--paper)',
              borderColor: 'var(--rule)',
              color: 'var(--ink)',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          />
          <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-soft)' }} />
        </div>

        {/* Top-level nav */}
        <nav className="mb-5">
          {TOP_NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.disabled ? '#' : item.to}
                onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                className="flex items-center justify-between px-2 py-1.5 mb-0.5 text-sm group"
                style={{
                  backgroundColor: active ? 'var(--ink)' : 'transparent',
                  color: active ? 'var(--paper)' : (item.disabled ? 'var(--ink-soft)' : 'var(--ink)'),
                  cursor: item.disabled ? 'default' : 'pointer',
                  opacity: item.disabled ? 0.55 : 1,
                }}
                title={item.note || item.label}
              >
                <span className="flex items-center gap-2">
                  <Icon size={13} style={{ color: active ? 'var(--paper)' : (item.disabled ? 'var(--ink-soft)' : 'var(--accent)') }} />
                  {item.label}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: active ? 'var(--paper-warm)' : 'var(--paper)',
                    color: active ? 'var(--ink)' : 'var(--ink-soft)',
                    border: '1px solid var(--rule)',
                  }}>
                  {item.pill}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Individual states */}
        <div className="mb-2 text-[10px] uppercase tracking-[0.3em] pt-3 border-t"
          style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
          Individual States
        </div>
        <div className="max-h-96 overflow-y-auto -mx-1 mt-2">
          {STATES.map((s) => {
            const active = pathname === `/state/${s.abbr.toLowerCase()}`;
            const has = !!s.coverage;
            return (
              <Link
                key={s.abbr}
                to={`/state/${s.abbr.toLowerCase()}`}
                className="flex items-center justify-between px-2 py-1 text-xs mx-1"
                style={{
                  backgroundColor: active ? 'var(--ink)' : 'transparent',
                  color: active ? 'var(--paper)' : 'var(--ink)',
                  opacity: has ? 1 : 0.5,
                }}
              >
                <span className="flex items-center gap-1.5">
                  {has && s.pilot && <StateAffairsMark size={10} />}
                  {s.name}
                </span>
                <span className="font-mono text-[10px]" style={{ color: active ? 'var(--paper-warm)' : 'var(--ink-soft)' }}>
                  {s.abbr}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Reference links */}
        <div className="mt-5 pt-3 border-t" style={{ borderColor: 'var(--rule)' }}>
          {REF_LINKS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2 px-2 py-1 text-[11px]"
                style={{
                  color: active ? 'var(--ink)' : 'var(--ink-soft)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                <Icon size={11} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
