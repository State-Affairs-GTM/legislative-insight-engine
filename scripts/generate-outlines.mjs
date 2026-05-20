#!/usr/bin/env node
// generate-outlines.mjs
// ----------------------------------------------------------------------------
// Reads us-atlas states-10m.json (or albers projection) and produces
// src/components/insights/stateOutlines.js with proper SVG paths for all 50
// states (+ DC, PR if present).
//
// Run from repo root:
//   node scripts/generate-outlines.mjs
//
// Why two output sources:
//   - states-10m.json uses raw lat/lng (Mercator-like, stretches at high latitudes)
//   - states-albers-10m.json uses Albers USA projection (correct US shapes, AK/HI
//     placed in lower-left corner so the whole country fits a single viewBox)
//
// For individual state outlines we use raw lat/lng + d3-geo's geoIdentity to
// fit each state to its own viewBox. This means each state gets a snug
// bounding box rather than being a tiny sliver of the whole-US viewport.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as topojson from 'topojson-client';
import { geoPath, geoIdentity } from 'd3-geo';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load us-atlas data (Mercator-like raw projection works fine for individual state outlines)
const us = require('us-atlas/states-10m.json');

// FIPS code -> state abbreviation map. us-atlas uses FIPS state codes as feature IDs.
const FIPS_TO_ABBR = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '72': 'PR',
};

// Approximate capital locations (lat/lng). We project these alongside the state
// outline so the dot ends up in the right spot inside the viewBox.
const CAPITALS = {
  AL: { name: 'Montgomery',   lng: -86.279, lat: 32.361 },
  AK: { name: 'Juneau',       lng: -134.420, lat: 58.302 },
  AZ: { name: 'Phoenix',      lng: -112.074, lat: 33.448 },
  AR: { name: 'Little Rock',  lng: -92.289, lat: 34.746 },
  CA: { name: 'Sacramento',   lng: -121.495, lat: 38.582 },
  CO: { name: 'Denver',       lng: -104.985, lat: 39.739 },
  CT: { name: 'Hartford',     lng: -72.685, lat: 41.764 },
  DE: { name: 'Dover',        lng: -75.527, lat: 39.158 },
  DC: { name: 'Washington',   lng: -77.036, lat: 38.907 },
  FL: { name: 'Tallahassee',  lng: -84.281, lat: 30.438 },
  GA: { name: 'Atlanta',      lng: -84.388, lat: 33.749 },
  HI: { name: 'Honolulu',     lng: -157.858, lat: 21.307 },
  ID: { name: 'Boise',        lng: -116.200, lat: 43.617 },
  IL: { name: 'Springfield',  lng: -89.650, lat: 39.781 },
  IN: { name: 'Indianapolis', lng: -86.158, lat: 39.768 },
  IA: { name: 'Des Moines',   lng: -93.609, lat: 41.591 },
  KS: { name: 'Topeka',       lng: -95.677, lat: 39.048 },
  KY: { name: 'Frankfort',    lng: -84.875, lat: 38.197 },
  LA: { name: 'Baton Rouge',  lng: -91.140, lat: 30.457 },
  ME: { name: 'Augusta',      lng: -69.765, lat: 44.323 },
  MD: { name: 'Annapolis',    lng: -76.491, lat: 38.978 },
  MA: { name: 'Boston',       lng: -71.058, lat: 42.358 },
  MI: { name: 'Lansing',      lng: -84.555, lat: 42.733 },
  MN: { name: 'Saint Paul',   lng: -93.094, lat: 44.954 },
  MS: { name: 'Jackson',      lng: -90.182, lat: 32.298 },
  MO: { name: 'Jefferson City', lng: -92.173, lat: 38.577 },
  MT: { name: 'Helena',       lng: -112.034, lat: 46.589 },
  NE: { name: 'Lincoln',      lng: -96.675, lat: 40.808 },
  NV: { name: 'Carson City',  lng: -119.766, lat: 39.163 },
  NH: { name: 'Concord',      lng: -71.537, lat: 43.207 },
  NJ: { name: 'Trenton',      lng: -74.764, lat: 40.220 },
  NM: { name: 'Santa Fe',     lng: -105.937, lat: 35.681 },
  NY: { name: 'Albany',       lng: -73.755, lat: 42.652 },
  NC: { name: 'Raleigh',      lng: -78.638, lat: 35.779 },
  ND: { name: 'Bismarck',     lng: -100.783, lat: 46.808 },
  OH: { name: 'Columbus',     lng: -82.999, lat: 39.961 },
  OK: { name: 'Oklahoma City', lng: -97.503, lat: 35.467 },
  OR: { name: 'Salem',        lng: -123.029, lat: 44.931 },
  PA: { name: 'Harrisburg',   lng: -76.886, lat: 40.270 },
  RI: { name: 'Providence',   lng: -71.421, lat: 41.824 },
  SC: { name: 'Columbia',     lng: -81.035, lat: 34.000 },
  SD: { name: 'Pierre',       lng: -100.346, lat: 44.367 },
  TN: { name: 'Nashville',    lng: -86.781, lat: 36.165 },
  TX: { name: 'Austin',       lng: -97.743, lat: 30.267 },
  UT: { name: 'Salt Lake City', lng: -111.892, lat: 40.760 },
  VT: { name: 'Montpelier',   lng: -72.580, lat: 44.260 },
  VA: { name: 'Richmond',     lng: -77.436, lat: 37.541 },
  WA: { name: 'Olympia',      lng: -122.901, lat: 47.038 },
  WV: { name: 'Charleston',   lng: -81.633, lat: 38.350 },
  WI: { name: 'Madison',      lng: -89.401, lat: 43.073 },
  WY: { name: 'Cheyenne',     lng: -104.802, lat: 41.140 },
  PR: { name: 'San Juan',     lng: -66.105, lat: 18.466 },
};

// VIEWBOX size — we fit each state to a 100x110 viewBox to match the existing
// GA hand-traced outline. Maintaining the same viewBox means the StateOutline
// component doesn't need to change at all.
const VIEW_W = 100;
const VIEW_H = 110;
const PADDING = 4;

const states = topojson.feature(us, us.objects.states);
const outlines = {};

for (const feature of states.features) {
  const fips = feature.id;
  const abbr = FIPS_TO_ABBR[fips];
  if (!abbr) continue;  // skip territories not in our list

  // Build a projection that fits this state's geometry into the viewBox.
  // geoIdentity with .fitExtent does the right math for any feature.
  const projection = geoIdentity()
    .reflectY(true)
    .fitExtent(
      [[PADDING, PADDING], [VIEW_W - PADDING, VIEW_H - PADDING]],
      feature
    );

  const pathGen = geoPath(projection);
  const pathString = pathGen(feature);

  // Project the capital location through the same projection so the dot
  // lands in the right place inside the viewBox.
  const capital = CAPITALS[abbr];
  let capitalPoint = null;
  if (capital) {
    const [x, y] = projection([capital.lng, capital.lat]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      capitalPoint = {
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        name: capital.name,
      };
    }
  }

  outlines[abbr] = {
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    path: pathString,
    capital: capitalPoint,
  };
}

// Write to src/components/insights/stateOutlines.js
const OUTPUT_PATH = join(process.cwd(), 'src/components/insights/stateOutlines.js');

const ABBR_ORDER = Object.values(FIPS_TO_ABBR).filter((a) => outlines[a]);

const fileContents = `// State outline SVG path data.
// Generated by scripts/generate-outlines.mjs from us-atlas TopoJSON.
// Last generated: ${new Date().toISOString()}
//
// Source: us-atlas/states-10m.json (10m resolution)
// Projection: geoIdentity fitted to each state's bbox in a 100x110 viewBox
//
// To regenerate, run: node scripts/generate-outlines.mjs

const outlines = {
${ABBR_ORDER.map((abbr) => {
  const o = outlines[abbr];
  const cap = o.capital
    ? `, capital: { x: ${o.capital.x}, y: ${o.capital.y}, name: ${JSON.stringify(o.capital.name)} }`
    : '';
  return `  ${abbr}: {
    viewBox: ${JSON.stringify(o.viewBox)},
    path: ${JSON.stringify(o.path)}${cap}
  }`;
}).join(',\n')}
};

export default outlines;
`;

writeFileSync(OUTPUT_PATH, fileContents);
console.log(`✓ Wrote ${OUTPUT_PATH}`);
console.log(`  ${Object.keys(outlines).length} state outlines generated`);
console.log(`  File size: ${(Buffer.byteLength(fileContents) / 1024).toFixed(1)} KB`);
console.log('');
console.log('Generated states:', Object.keys(outlines).sort().join(' '));
