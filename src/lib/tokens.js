// Design tokens — verbatim from state-directory.
// Applied at App root via inline style on the root container.

export const tokens = {
  // Surfaces
  '--paper': '#faf7f1',
  '--paper-warm': '#f3ede0',
  '--hover': '#f0eadb',
  '--rule': '#d8d2c4',
  '--neutral-bg': '#e8e3d6',

  // Text
  '--ink': '#1a1814',
  '--ink-soft': '#6b655a',

  // Brand
  '--accent': '#8b3a1f',

  // Party
  '--gop': '#a72f2f',
  '--gop-bg': '#f5dada',
  '--dem': '#1f4f8b',
  '--dem-bg': '#dae3f0',
  '--ind': '#5b8a3a',
  '--ind-bg': '#dbe6cc',

  // Coverage badge additions (new for insight engine)
  '--coverage-good': '#5b8a3a',
  '--coverage-partial': '#c8924f',
  '--coverage-poor': '#a72f2f',

  // Root base
  backgroundColor: '#faf7f1',
  color: '#1a1814',
  fontFamily: "Georgia, 'Times New Roman', serif",
};

// Score interpolation: -1 (D) to +1 (R), through neutral gray
export function scoreColor(score) {
  if (score == null || isNaN(score)) return '#6b655a';
  const s = Math.max(-1, Math.min(1, score));
  // -1 → dem blue, 0 → ink-soft, +1 → gop red
  if (s < 0) {
    // interpolate from --dem to --ink-soft
    const t = -s; // 0 to 1
    return mix('#6b655a', '#1f4f8b', t);
  } else {
    const t = s;
    return mix('#6b655a', '#a72f2f', t);
  }
}

function mix(c1, c2, t) {
  const [r1, g1, b1] = hex(c1);
  const [r2, g2, b2] = hex(c2);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)}, ${Math.round(g1 + (g2 - g1) * t)}, ${Math.round(b1 + (b2 - b1) * t)})`;
}

function hex(c) {
  const m = c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}
