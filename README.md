# Legislative Insight Engine

50-state quantitative legislative analysis tool. Sibling app to the State Affairs Directory. Designed to surface partisanship scoring, bill flow funnels, vote pattern analysis, sponsor partnership detection, gut-and-replace flagging, and (eventually) one-click whitepaper PDF generation for editorial, sales, and government affairs use.

**Status**: Phase 1 (Georgia pilot) scaffold.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Run dev server (port 5174 to avoid clashing with directory's 5173)
npm run dev

# 3. Open http://localhost:5174
```

The app boots with seed data in `src/data/states/ga/summary.json` (numbers derived from Phase 0 inventory). Run the extraction pipeline (below) to replace seed data with live BigQuery numbers.

---

## Pushing this to GitHub for the first time

This repo is meant to live at `State-Affairs-GTM/legislative-insight-engine`. Step-by-step:

```bash
# 1. Extract the zip you received into your projects folder
cd ~/projects   # or wherever your code lives
unzip ~/Downloads/legislative-insight-engine.zip
cd legislative-insight-engine

# 2. Initialize git
git init -b main
git add .
git commit -m "Phase 1 scaffold: components, GA pilot, extraction pipeline"

# 3. Create the GitHub repo
#    Option A: via the GitHub website
#      - Go to https://github.com/State-Affairs-GTM
#      - Click "New repository"
#      - Name: legislative-insight-engine
#      - Visibility: Private (recommended for v1)
#      - DO NOT initialize with README/license/.gitignore — we already have them
#      - Click "Create repository"
#
#    Option B: via gh CLI (if installed)
gh repo create State-Affairs-GTM/legislative-insight-engine --private --source=. --remote=origin

# 4. Push (if you used Option A and need to add the remote)
git remote add origin git@github.com:State-Affairs-GTM/legislative-insight-engine.git
git push -u origin main
```

## Connecting to Vercel

```bash
# Either via the Vercel dashboard:
# 1. Open https://vercel.com/state-affairs-gtm
# 2. Click "Add New" → "Project"
# 3. Import legislative-insight-engine
# 4. Framework preset: Vite (auto-detected)
# 5. Root directory: ./
# 6. Build command: npm run build
# 7. Output directory: dist
# 8. Click "Deploy"

# Or via the Vercel CLI (faster):
npm i -g vercel
vercel login
vercel --prod
```

The first deploy will produce a `legislative-insight-engine.vercel.app` URL. Custom domain can be configured later from the Vercel project settings.

---

## Data extraction (BigQuery → JSON)

The app reads static JSON files from `src/data/states/{abbr}/`. Generate these from BigQuery:

```bash
# 1. Get a service account key with BigQuery read access on
#    pendo-test-456821.state_affairs_prod and save it as gcp-key.json
#    (already in .gitignore)

# 2. Set the env var
export GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/gcp-key.json

# 3. Run the extraction for Georgia
npm run extract

# Or with custom params:
node scripts/extract.mjs --state=GA --session="2025-2026 Regular Session"
```

This writes `src/data/states/ga/summary.json` (and other files as the pipeline grows). The dev server hot-reloads when these change.

The extraction script (`scripts/extract.mjs`) currently writes `summary.json`. Other extractors (bills, legislators, votes, history, committees, best-buddies, gut-replace, historical) are coming in subsequent updates — they follow the same pattern.

---

## Project structure

```
legislative-insight-engine/
├── index.html                  # Tailwind CDN + Georgia serif default
├── package.json
├── vite.config.js              # port 5174
├── scripts/
│   └── extract.mjs             # BigQuery → JSON pipeline (GA only for now)
├── src/
│   ├── main.jsx                # React Router root
│   ├── App.jsx                 # Routes
│   ├── components/
│   │   ├── shared/             # Lifted verbatim from directory
│   │   │   ├── Section.jsx     #   Expandable card primitive
│   │   │   ├── PartyChip.jsx   #   R/D/I pills
│   │   │   ├── PartyBar.jsx    #   Chamber composition bar
│   │   │   └── StateAffairsMark.jsx
│   │   ├── insights/           # New to insight engine
│   │   │   ├── AtAGlanceSection.jsx
│   │   │   ├── BillFunnel.jsx  #   Deck-style staged grid (slides 7-10)
│   │   │   ├── CoverageBadge.jsx
│   │   │   ├── HeadlineRow.jsx
│   │   │   ├── ScoreBadge.jsx
│   │   │   ├── StateOutline.jsx
│   │   │   └── stateOutlines.js
│   │   └── layout/
│   │       ├── Layout.jsx
│   │       ├── Sidebar.jsx
│   │       └── StateHeader.jsx
│   ├── pages/
│   │   ├── Overview.jsx        # 50-state grid landing page
│   │   ├── StatePage.jsx       # Per-state page composing all sections
│   │   ├── Methodology.jsx
│   │   ├── Coverage.jsx
│   │   ├── Nuances.jsx         # Catalog of state-specific conventions
│   │   └── NotFound.jsx
│   ├── data/
│   │   ├── states/ga/          # Per-state JSON (generated by extract.mjs)
│   │   │   └── summary.json
│   │   └── reference/
│   │       ├── states.js       # 50 states metadata
│   │       └── nuances.js      # State Nuances catalog data
│   └── lib/
│       ├── tokens.js           # Design tokens lifted from directory
│       └── useStateData.js     # Data loader hook
└── README.md
```

---

## Design language

Mirrors `state-directory` exactly. Same Georgia serif typography, same cream paper background (`#faf7f1`), same brick-red accent (`#8b3a1f`), same Section card pattern with chevron expansion. The two apps should feel like different floors of the same building.

See `phase0/design_tokens.md` (in the original specs delivery) for the full extracted token set.

---

## Roadmap

### Phase 1 (current) — GA pilot
- [x] Repo scaffold with lifted design tokens and shared components
- [x] AT A GLANCE section with deck-style bill funnel
- [x] State header with outline + session info
- [x] Sidebar with nav + state list + reference links
- [x] Methodology page
- [x] Coverage page
- [x] Nuances page (catalog of state-specific conventions)
- [x] Overview page (50-state grid)
- [x] BQ extraction script for summary.json
- [ ] BILLS section (Sankey, type breakdown, budget bills panel)
- [ ] VOTES section
- [ ] COMMITTEES section
- [ ] SPONSORSHIP section
- [ ] PARTISANSHIP section (the 6 scores)
- [ ] TIMELINE section
- [ ] LEGISLATOR PARTNERS section
- [ ] GUT & REPLACE section
- [ ] HISTORICAL CONTEXT section
- [ ] /legislator/[abbr]/[id] page
- [ ] /bill/[abbr]/[id] page
- [ ] Generate state outlines from us-atlas for all 50 states
- [ ] Deploy to Vercel

### Phase 2 — 50-state rollout
- [ ] Per-state vote-vocabulary classifiers
- [ ] Per-state action vocabulary mapping (or rely on history_step)
- [ ] Cross-state Partisanship view
- [ ] Cross-state Legislator Index
- [ ] Cross-state Bill Explorer
- [ ] Cross-state Best Buddies view

### Phase 3 — Reports + Search
- [ ] Cross-State Reports builder
- [ ] Plain-language search (LLM → SQL → results)
- [ ] Whitepaper PDF generator (matching NC General Assembly format)

---

## Methodology highlights

- **Six partisanship scores** (BS, BV, CG, LS, LV, LC), all on −1 to +1 scale, never collapsed.
- **Bayesian shrinkage** toward chamber average (k=20 sponsorship / k=30 voting).
- **Bills and resolutions always split**, with resolution sub-types where applicable.
- **Consent-calendar votes excluded** from bill-level partisanship (BV) scoring.
- **Within-chamber comparisons only** — no cross-state legislator rankings.
- **Ceremonial resolutions excluded** by default from partisanship; toggleable.

Full methodology details on the in-app `/methodology` page.

---

## State Nuances catalog

A continually-updated reference of state-specific legislative conventions discovered during analysis. Currently seeded with Georgia and Hawaii observations from Phase 0. Visit `/nuances` in the app or read `src/data/reference/nuances.js` directly. This catalog grows as we onboard each new state.
