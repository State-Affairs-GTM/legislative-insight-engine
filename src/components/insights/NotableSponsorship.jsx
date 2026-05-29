// NotableSponsorship v2 — renamed "Lead" → "Primary" throughout user-facing text.
// Data keys preserved for SQL compat.

import { useState } from 'react';
import { PartyDot, partyInitial } from './SponsorshipSection.jsx';

const SECTIONS = [
  { key: 'prolific_leaders',     label: 'Most Prolific Primary Sponsors',
    desc: 'Legislators who authored the most bills as primary sponsor. The volume signal.' },
  { key: 'workhorses',           label: 'Workhorses',
    desc: 'Highest weighted score (primary × 3 + cosponsor × 1). Captures combined authoring + collaboration volume.' },
  { key: 'prolific_cosponsors',  label: 'Most Prolific Cosponsors',
    desc: 'Legislators attached to the most bills as cosponsor. Different signal than primary authorship.' },
  { key: 'highest_passage',      label: 'Highest Passage Rate',
    desc: 'Primary sponsors with the best passage rate, minimum 10 bills (so 1-bill-100%-rate flukes don\'t dominate). The effectiveness signal.' },
  { key: 'highest_engrossed',    label: 'Highest Engrossed Rate',
    desc: 'Primary sponsors whose bills most often pass at least one chamber. Broader success measure — captures bills that died on the governor\'s desk.' },
  { key: 'lone_wolves',          label: 'Lone Wolves',
    desc: 'Primary sponsors who led bills with ZERO cosponsors and got them passed. Solo authoring success.' },
  { key: 'name_attachers',       label: 'Name-Attachers',
    desc: 'High cosponsor count (100+) with low primary sponsor count (≤5). Legislators who attach their name broadly but rarely lead.' },
];

export default function NotableSponsorship({ data }) {
  const [section, setSection] = useState('prolific_leaders');
  const { leaderboards } = data.notable;

  const counts = {
    prolific_leaders:    leaderboards.most_prolific_leaders?.length || 0,
    workhorses:          leaderboards.workhorses?.length || 0,
    prolific_cosponsors: leaderboards.most_prolific_cosponsors?.length || 0,
    highest_passage:     leaderboards.highest_passage_rate?.length || 0,
    highest_engrossed:   leaderboards.highest_engrossed_rate?.length || 0,
    lone_wolves:         leaderboards.lone_wolves?.length || 0,
    name_attachers:      leaderboards.name_attachers?.length || 0,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => {
          const isActive = s.key === section;
          const count = counts[s.key];
          if (count === 0) return null;
          return (
            <button key={s.key} onClick={() => setSection(s.key)}
              className="text-xs px-3 py-2 transition-colors"
              style={{
                border: `1px solid ${isActive ? 'var(--ink)' : 'var(--rule)'}`,
                backgroundColor: isActive ? 'var(--ink)' : 'var(--paper)',
                color: isActive ? 'var(--paper)' : 'var(--ink-soft)',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
              }}>
              {s.label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="text-xs italic" style={{ color: 'var(--ink-soft)' }}>
        {SECTIONS.find((s) => s.key === section)?.desc}
      </div>

      {section === 'prolific_leaders'     && <List items={leaderboards.most_prolific_leaders} columns={[
        { key: 'lead_count_bills',         label: 'Primary',   primary: true },
        { key: 'lead_bills_passed',        label: 'Passed' },
        { key: 'passage_rate_bills_pct',   label: 'Rate', suffix: '%' },
        { key: 'avg_cosponsors_when_lead', label: 'Avg cosp.' },
      ]} />}
      {section === 'workhorses'           && <List items={leaderboards.workhorses} columns={[
        { key: 'workhorse_score',          label: 'Score', primary: true, tooltip: 'Primary × 3 + cosponsor' },
        { key: 'lead_count_bills',         label: 'Primary' },
        { key: 'cosponsor_count_bills',    label: 'Cosp.' },
        { key: 'passage_rate_bills_pct',   label: 'Rate', suffix: '%' },
      ]} />}
      {section === 'prolific_cosponsors'  && <List items={leaderboards.most_prolific_cosponsors} columns={[
        { key: 'cosponsor_count_bills',    label: 'Cosp.', primary: true },
        { key: 'lead_count_bills',         label: 'Primary' },
        { key: 'cosponsor_bills_passed',   label: 'Cosp. passed' },
      ]} />}
      {section === 'highest_passage'      && <List items={leaderboards.highest_passage_rate} columns={[
        { key: 'passage_rate_bills_pct',   label: 'Passage', primary: true, suffix: '%' },
        { key: 'lead_count_bills',         label: 'Primary' },
        { key: 'lead_bills_passed',        label: 'Passed' },
        { key: 'lead_bills_engrossed_plus',label: 'Engrossed+' },
      ]} />}
      {section === 'highest_engrossed'    && <List items={leaderboards.highest_engrossed_rate} columns={[
        { key: 'engrossed_rate_bills_pct', label: 'Engrossed', primary: true, suffix: '%' },
        { key: 'lead_count_bills',         label: 'Primary' },
        { key: 'lead_bills_passed',        label: 'Passed' },
        { key: 'lead_bills_engrossed_plus',label: 'Engrossed+' },
      ]} />}
      {section === 'lone_wolves'          && <List items={leaderboards.lone_wolves} columns={[
        { key: 'lone_wolf_passed',         label: 'Solo passed', primary: true },
        { key: 'lone_wolf_lead_bills',     label: 'Solo primary' },
        { key: 'lead_count_bills',         label: 'Total primary' },
      ]} />}
      {section === 'name_attachers'       && <List items={leaderboards.name_attachers} columns={[
        { key: 'cosponsor_count_bills',    label: 'Cosp.', primary: true },
        { key: 'lead_count_bills',         label: 'Primary' },
        { key: 'ratio',                    label: 'Ratio', suffix: ':1', fmt: (v) => v.toFixed(1) },
      ]} />}
    </div>
  );
}

function List({ items, columns }) {
  if (!items?.length) {
    return <div className="text-sm italic py-6 text-center" style={{ color: 'var(--ink-soft)' }}>
      No legislators qualified for this leaderboard.
    </div>;
  }

  return (
    <div>
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider border-b"
        style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}>
        <div className="col-span-1 text-right">#</div>
        <div className="col-span-5">Legislator</div>
        <div className="col-span-2 text-center">Chamber</div>
        {columns.map((c) => (
          <div key={c.key} className="col-span-1 text-right" title={c.tooltip}>
            {c.label}
          </div>
        ))}
      </div>

      {items.map((item, i) => (
        <div key={item.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-b"
          style={{ color: 'var(--ink)', borderColor: 'var(--rule)' }}>
          <div className="col-span-1 text-right tabular-nums" style={{ color: 'var(--ink-soft)' }}>
            {i + 1}.
          </div>
          <div className="col-span-5 flex items-center gap-2">
            <PartyDot party={item.party} size={8} />
            <span style={{ fontWeight: 600 }}>{item.name}</span>
            <span className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
              ({partyInitial(item.party)})
            </span>
          </div>
          <div className="col-span-2 text-center text-xs" style={{ color: 'var(--ink-soft)' }}>
            {item.chamber}
          </div>
          {columns.map((c) => {
            const val = item[c.key];
            const display = c.fmt ? c.fmt(val) : (val ?? 0);
            return (
              <div key={c.key} className="col-span-1 text-right tabular-nums"
                style={{
                  fontWeight: c.primary ? 700 : 400,
                  color: c.primary ? 'var(--ink)' : 'var(--ink-soft)',
                }}>
                {display}{c.suffix || ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
