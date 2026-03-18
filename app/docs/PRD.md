# CCR Autocross Performance Analysis App — PRD

## Context

Ryan Berg competes in F-Street (FS) at CCR SCCA Autocross. The 2025 season had 10 events (Feb–Nov). FS had very low turnout, so class results (mostly 100/100 normalized points) don't measure actual performance. The app provides cross-class benchmarks — primarily PAX rankings and a hypothetical "what if I competed in PST" feature — to assess improvement over the season.

---

## Problem Statement

Without consistent class competitors, Ryan has no meaningful baseline to evaluate whether his driving is improving, regressing, or plateauing. He needs a way to compare his performance against the full field using PAX (performance index) normalization, which levels the playing field across all car classes.

---

## Users

Single user (Ryan Berg), personal use only. No auth required.

---

## Data Sources

- **30 PDFs** across 10 event subdirectories in `/data/2025/`, all text-extractable (Pronto Timing System output)
  - `*_OVERALL.pdf` — per-driver individual run times, cone penalties, DNFs, organized by class
  - `*_PAX.pdf` / `*_Indexed.pdf` — full field ranked by `raw_time × PAX_factor`; shows each driver's class index
  - `*_RAW.pdf` — full field ranked by raw elapsed time
- **PAX index reference**: https://www.solotime.info/pax/rtp2025.html (canonical 2025 SCCA Solo PAX factors by class)

### Key Data Facts

- Ryan's car: 2022 BMW M240i, class FS, car #2 (car #21 at Event 2), Bridgestone tires
- FS PAX index (2025): 0.817
- Event 8 PDFs use CIDFont encoding — require `pdf-parse` fallback; Ryan did not attend Event 8
- Events 5, 7, 10 are dual-run (two sessions, score = best_run_A + best_run_B)
- ~170–190 drivers per event across classes: SS, AS, BS, CS, DS, ES, FS, GS, HS, PST, XP, CAM, PRT, etc.
- **Novice class**: CCR runs a robust Novice program. Drivers appear as class `N`. **Exclude all class `N` drivers from every computation.**

### PST Class Explained

PST (Pro Street Tire) is a catch-all indexed class where drivers from various street classes compete together using their home-class PAX factor. Ryan's hypothetical PST competitive time = `best_raw_time × FS_PAX_factor` = his official PAX indexed time.

---

## Features

### P0 — Core (Season Dashboard)

- **PAX rank trend**: Line chart, x=event, y=rank position (inverted so lower=better)
- **Indexed time trend**: Line chart of `best_raw × FS_PAX` per event
- **Gap to PAX leader**: Bar chart of `(ryan_indexed - leader_indexed) / leader_indexed × 100`
- **Percentile trend**: Line chart of `% of field beaten` per event
- **Season summary stats**: Best PAX rank, best percentile, best indexed time, events attended

### P0 — Core (Event Detail)

- Ryan's individual run times with cone/DNF annotations, session dividers for dual-run events
- PAX position card: rank, percentile, indexed time, gap to leader (seconds + %)
- Raw position card: rank, raw time, gap to raw leader
- **Hypothetical PST card**: "Your indexed time of X.XXX would rank Nth of Y PST drivers"
- PAX field distribution: histogram of all indexed times with Ryan's time marked
- F-Street class results: small table of all FS competitors that event

### P1 — Secondary

- Raw rank trend chart on dashboard
- Clickable chart data points → navigate to event detail
- Prev/next event navigation in detail view

### P2 — Future

- Season selector (multi-season support)
- `add-event.js` utility to append new events to the dataset
- Export chart as PNG
- **Cone summary on dashboard**: Aggregate cone penalty data across the season. Possible views: total cones hit per event (bar chart), cone penalty seconds lost per event, season total. Helps identify whether cone penalties are improving or worsening over time — a distinct signal from raw pace.

---

### P3 — Competitor Comparison

Track and compare performance against a specific rival across the season.

#### Entry Points

**Expandable rows in results tables** (ClassResults, PstResults):
- Clicking any non-Ryan competitor row expands it in place to reveal an inline comparison chart
- The chart shows indexed times per event for Ryan and that competitor, for all events where the competitor appears in the data
- Events where only one of them competed are still plotted with a single point (no connecting line for the absent party)
- A short summary line in the expansion: e.g., "Ryan faster in 3 of 5 shared events · avg delta −0.842s"
- A "Full comparison →" link in the expanded row navigates to the competitor detail page

**DataTable API change needed:**
- Add optional `getExpandedContent?: (row) => ReactNode` prop
- Clicking a non-Ryan row toggles its expansion; clicking again collapses it
- Only one row expanded at a time (collapsing the previous when a new one is opened)
- Expanded content renders in a full-width row below the data row, with a subtle left accent border in the competitor's implied color

#### Inline Comparison Chart

- `ComposedChart` (Recharts) with two `Line` series: Ryan (bmw-blue) and competitor (fg-muted or a derived color)
- X-axis: event numbers for events where *either* competed
- Y-axis: indexed time (lower = better, y-axis label "Indexed time (s)")
- Null/missing values for events where a party didn't compete render as gaps in the line
- Dot markers at each data point; custom tooltip showing both times and the delta for that event
- Height ~160px to keep the expansion compact

#### Competitor Detail Page (`/competitor/:name`)

Route: `/competitor/:encodedName`

**Header section:**
- "Ryan Berg vs [Competitor Name]"
- Competitor's class and car (from most recent shared event)
- Summary chips: N shared events · Ryan wins X · Competitor wins Y

**Charts (full width):**
- Indexed time over season: two overlaid lines (Ryan + competitor) across shared events
- Delta chart: bar chart of `ryan_indexed − competitor_indexed` per event (negative = Ryan faster)

**Head-to-head table:**
- Columns: Event, Date, Venue, Ryan Indexed, Competitor Indexed, Delta, Winner
- Rows sorted by event number
- Winner column: color-coded "Ryan" (blue) or competitor name (muted) or "—" for tie
- Rows for events where only one competed shown but greyed out

**Navigation:** Back link to the event detail page for the most recently clicked event, and a breadcrumb `Season / Competitors / [Name]`.

#### Data Notes

- **No pipeline changes needed.** All competitor data is already present in `pax_results` on each event. The competitor lookup queries `events[].pax_results.find(d => d.name === competitorName)` client-side.
- **Name matching:** exact string match on `name` field. Competitor names are stable within a season (Pronto Timing system uses consistent registration names).
- **New hook:** `useCompetitor(name)` — iterates all attended events, joins each event's pax_results row (if present) with Ryan's data, returns an array of per-event comparison records.
- **URL encoding:** competitor names with spaces use `encodeURIComponent` / React Router's `:name` param with `decodeURIComponent` in the page.

#### New Files

```
src/
  hooks/
    useCompetitor.js          — aggregates competitor data across all events
  components/
    competitor/
      ComparisonChart.jsx     — shared inline + detail chart (reused in both contexts)
      HeadToHeadTable.jsx     — per-event breakdown table
  pages/
    CompetitorPage.jsx        — full comparison page
```

---

## Technical Architecture

### Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite, JavaScript + JSX (not TypeScript) |
| Routing | React Router v6 |
| Charts | Recharts |
| UI primitives | ShadCN (Base UI foundation, not Radix UI) |
| Styling | Tailwind CSS v4 — `@theme {}` in CSS, no `tailwind.config.js` |
| Data pipeline | Node.js script, runs at build time |
| Deployment | GitHub Pages (`vite.config base: '/autox2/'`) |

### Visual Design

- **Aesthetic**: High-quality SaaS analytics dashboard (Linear, Vercel analytics style)
- **Color palette**: BMW-inspired — primary blue `#1c69d4`, dark navy `#003566`, black, white, neutral grays
- **Venue colors**: Michelin `#003566` (dark navy), ZMAX `#C92120` (red). Trend line variants: Michelin `#001a40`, ZMAX `#7a1414`
- **Typography**: Mona Sans variable font (Google Fonts)
  - OpenType features: 2-story `a` (cv01), tailed `l` (cv02), square capital `G` (cv03)
  - Mona Sans Mono VF (`MonaSansMonoVF[wght].ttf`) registered as `--font-mono` for numeric columns

### App Name

The app is named **Auto Crossref** (short for Autocross Reference, a play on "cross-reference"). Displayed in the sidebar brand area as `Auto` + `Crossref` (blue accent on `Crossref`).

### Layout

- **Full-width navbar** (`h-12`, `sticky top-0`) — extends edge-to-edge with no max-width constraint
- **Left sidebar** (`w-60`, `sticky top-12`, `h-[calc(100dvh-3rem)]`) — `bg-nav` matching the navbar, with `border-r`
  - Top-left intersection of navbar and sidebar contains the brand logo + "AutoX-Ref" name
  - Navigation sections: Dashboard (`HomeIcon`), Events (`CalendarDaysIcon`), Competitors (`UserGroupIcon`, disabled/soon)
  - Events list: one item per event showing venue-colored dot, event number, short date + venue label; events Ryan didn't attend are dimmed and non-clickable
- **Subnav bar** (`sticky top-12`, `min-h-[38px]`) — within the main content column; used for breadcrumbs and prev/next event nav
- **Main content** — `flex-1` column to the right of the sidebar; `px-6 py-6` page padding

### Styling Rules

- **All DOM styling must use Tailwind utility classes.** Inline `style` props are only allowed for:
  1. Truly dynamic computed values (e.g., `style={{ width: \`${barWidth}%\` }}` for progress bars)
  2. Third-party library props that accept style objects (Recharts SVG attributes: `stroke`, `fill`, `tick`, `LabelList style`)
  3. Runtime dynamic colors from helper functions (e.g., `style={{ backgroundColor: venueColor(event.venue) }}`)
- **Tailwind v4 `@theme`**: `--color-*` → `text-*`/`bg-*`/`border-*`; `--radius-*` → `rounded-*`; `--font-*` → `font-*`
- **Opacity modifiers**: `bg-bmw-blue/10`, `border-bmw-blue/20`, `bg-warning/15`, etc.
- **Time display**: All time values are shown to exactly 3 decimal places with no unit suffix — e.g. `60.100` not `60.1s`. Use `.toFixed(3)` at the display layer.
- **DataTable `getRowClassName`** (not `getRowStyle`): pass `row => 'class string'`; Ryan highlight: `'bg-bmw-blue/5 outline outline-1 outline-bmw-blue/20 [outline-offset:-1px]'`
- **DataTable column `meta`**: `{ thClassName: 'text-right', tdClassName: 'text-right' }` for per-column alignment

### Dependencies

- `@heroicons/react` v2 — used for sidebar navigation icons (`/20/solid` variant)

### Project Structure

```
app/
  src/
    components/
      layout/       AppShell (sidebar + full-width nav)
      dashboard/    SeasonSummary, GapBarChart, PercentileChart, PstRankChart
      event/        RunTimeline, PositionCard, PstCard,
                    FieldHistogram, ClassResults, PstResults
      shared/       StatCard, ChartCard, DataTable, venueColors.js
    data/
      season-2025.json     (generated by parse script)
    hooks/
      useSeasonData.js
      useEvent.js
    pages/
      DashboardPage.jsx
      EventDetailPage.jsx
  scripts/
    parse-events.js
    lib/
      extract-pdf-text.js
      extract-pdf-text-fallback.js
      parse-pax-results.js
      parse-raw-results.js
      parse-overall-runs.js
      compute-derived.js
  docs/
    PRD.md             ← this file
    PROGRESS.md
```

### JSON Schema

```json
{
  "season": 2025,
  "subject": { "name": "Ryan Berg", "class": "FS", "pax_index": 0.817, "car": "2022 BMW M240i", "tires": "Bridgestone" },
  "events": [{
    "id": "2025-E06",
    "event_number": 6,
    "date": "2025-07-19",
    "title": "CCR Autocross #6 Overhalf",
    "scoring_type": "single",
    "ryan_attended": true,
    "total_drivers_pax": 113,
    "total_drivers_raw": 0,
    "pax_results": [],
    "raw_results": [],
    "ryan": {
      "car_number": "2",
      "class_code": "FS",
      "pax_index": 0.817,
      "runs": [
        { "run_number": 1, "session": "a", "base_time": 65.405, "scored_time": 65.405, "cones": 0, "dnf": false }
      ],
      "best_raw_time": 64.379,
      "official_indexed_time": 52.598,
      "pax_rank": 73,
      "pax_total": 113,
      "pax_percentile": 35.4,
      "pax_leader_time": null,
      "pax_gap_seconds": null,
      "pax_gap_pct": null,
      "raw_rank": null,
      "raw_total": 0,
      "hypothetical_pst_indexed_time": 52.598,
      "hypothetical_pst_rank": null,
      "hypothetical_pst_total": null,
      "fs_class_rank": 1,
      "fs_class_total": 2
    }
  }]
}
```

---

## Parsing Architecture

### PAX PDF Parsing

- **Anchor**: Each row has exactly one `0.[789]\d{2}` PAX index value
- **Work backwards** from the PAX index: rawTime → carNum/rawTime split → class code → name
- carNum and rawTime integer part are concatenated (e.g., `6855.603` = carNum `68` + rawTime `55.603`)
- Split deterministically: find suffix forming a valid autocross time (35–260s)
- Class code: trailing uppercase letters after name
- Name: everything after the last digit in text before class

### OVERALL PDF Run Parsing

- Find `Ryan Berg` then `Bridgestone` (tire brand marks start of runs)
- Parse decimal numbers in range [20, 300] as run times
- Cone notation: `·N` = exactly 1 digit (middle dot); `(N)` or `(N\` = paren-delimited
- DNF: stored as `{ dnf: true, scored_time: null }`
- Bail out if skipCount > 80 (entered next driver's data)

### Validation Reference Points

| Event | Metric | Expected |
|---|---|---|
| E2 | Ryan car number | 21 |
| E2 | Ryan best raw | 55.666 |
| E6 | Ryan best raw | 64.379 |
| E6 | Ryan PAX rank | 73 |
| E6 | Ryan runs | 65.405, 66.995(3c), 64.379, 68.654(3c) |
| E7 | Ryan AM runs | 40.225, 39.917, 38.962 |
| E7 | Ryan PM runs | 39.926, 40.197, 39.361 |
| E7 | Ryan raw total | 78.323 |
| E10 | Ryan raw total | 130.974 |

---

## Implementation Phases

### Phase 1 — Data Pipeline ✅ COMPLETE
- Scaffold Vite + React + JS + Tailwind v4 project
- PDF extraction utilities (zlib + pdf-parse fallback)
- PAX, RAW, OVERALL parsers
- compute-derived.js
- Generate and validate `season-2025.json`

### Phase 2 — Season Dashboard
- `useSeasonData` and `useEvent` hooks
- `AppShell` layout (done)
- All 5 trend charts
- Season summary stat cards

### Phase 3 — Event Detail
- React Router setup (done)
- `RunTimeline` component
- `PositionCard` (PAX + raw)
- `PstCard`
- `FieldHistogram`
- `ClassResults` table
- `EventNav` prev/next

### Phase 4 — Future
- `add-event.js` utility
- Multi-season support
- Season selector
