import nuances from '../data/reference/nuances.js';
import { useState, useMemo } from 'react';

export default function Nuances() {
  const [selectedState, setSelectedState] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filtered = useMemo(() => {
    return nuances.entries.filter((e) => {
      if (selectedState !== 'all' && e.state !== selectedState) return false;
      if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
      return true;
    });
  }, [selectedState, selectedCategory]);

  return (
    <article>
      <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: 'var(--ink-soft)' }}>
        Reference
      </div>
      <h1 className="text-4xl mb-2" style={{ color: 'var(--ink)', fontWeight: 400 }}>
        State Legislative Nuances
      </h1>
      <p className="text-sm italic mb-6 max-w-3xl" style={{ color: 'var(--ink-soft)' }}>
        Every state legislature has procedural quirks, terminology differences, and data conventions that
        aren't obvious from the data alone. This is our running catalog. Continually updated as we surface
        new observations during analysis.
      </p>

      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="text-xs px-3 py-1.5 border"
          style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--paper)', color: 'var(--ink)' }}
        >
          <option value="all">All states</option>
          {nuances.states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs px-3 py-1.5 border"
          style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--paper)', color: 'var(--ink)' }}
        >
          <option value="all">All categories</option>
          {nuances.categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="text-[11px] self-center" style={{ color: 'var(--ink-soft)' }}>
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((entry, i) => (
          <NuanceCard key={i} entry={entry} />
        ))}
      </div>
    </article>
  );
}

function NuanceCard({ entry }) {
  const confidenceColor = {
    Confirmed: 'var(--coverage-good)',
    Strong:    'var(--coverage-partial)',
    Tentative: 'var(--ink-soft)',
  }[entry.confidence] || 'var(--ink-soft)';

  return (
    <div className="border p-4" style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--paper)' }}>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-mono text-sm" style={{ color: 'var(--accent)', fontWeight: 700 }}>
          {entry.state}
        </span>
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm"
          style={{ backgroundColor: 'var(--paper-warm)', color: 'var(--ink-soft)' }}>
          {entry.category}
        </span>
        <span className="text-[10px] uppercase tracking-wider"
          style={{ color: confidenceColor, fontWeight: 600 }}>
          {entry.confidence}
        </span>
        <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--ink-soft)' }}>
          {entry.date}
        </span>
      </div>
      <h3 className="text-sm mb-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>
        {entry.title}
      </h3>
      <p className="text-sm" style={{ color: 'var(--ink)' }}>{entry.body}</p>
      {entry.implication && (
        <div className="mt-2 pt-2 border-t text-xs italic" style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
          <strong>Implication:</strong> {entry.implication}
        </div>
      )}
      {entry.editorialFlag && (
        <div className="mt-2 inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm"
          style={{ backgroundColor: 'var(--gop-bg)', color: 'var(--gop)', fontWeight: 600 }}>
          📰 Newsroom-publishable
        </div>
      )}
    </div>
  );
}
