# CCR Autocross Performance Analysis App — PRD

## Context

Ryan Berg competes at CCR SCCA Autocross. The app tracks multi-season performance using cross-class benchmarks (PAX rankings, PST comparisons) to assess improvement over time. Data spans 2023–2026, with new seasons added as they occur.

- **2023–2025**: Ryan competes in F-Street (FS), car #2 (car #21 at 2025 E2)
- **2026+**: Ryan moved to PST/FS class

---

## Problem Statement

Without consistent class competitors, Ryan has no meaningful baseline to evaluate whether his driving is improving, regressing, or plateauing. Cross-class PAX normalization levels the playing field. Multi-season data enables long-term trend analysis.

---

## Users

Single user (Ryan Berg), personal use only. No auth required.

---

## Data Sources

- **PDFs** across season/event subdirectories in `/data/{year}/`, all text-extractable (Pronto Timing System output)
  - `*_OVERALL.pdf` / `*_FINAL.pdf` — per-driver individual run times, cone penalties, DNFs, organized by class
  - `*_PAX.pdf` / `*_Indexed.pdf` — full field ranked by `raw_time × PAX_factor`
  - `*_RAW.pdf` — full field ranked by raw elapsed time

### Key Data Facts

- Ryan's car: 2022 BMW M240i, Bridgestone tires
- **PAX index by year**: 2023 = 0.813, 2024 = 0.814, 2025 = 0.817, 2026 = 0.817
- **Novice class**: Drivers appear as class `N`. **Exclude from all computations.**
- **Venues**: Michelin (Laurens, SC) = shorter course (~32–48s runs); ZMAX (Concord, NC) = longer course (~52–82s runs)
- **Dual-run session labels**: Michelin dual-run = "AM Session" / "PM Session" (same day, same run group). ZMAX dual-run = "Day 1" / "Day 2" (consecutive calendar days, group may differ).

### Season Coverage

| Year | Events | Ryan Attended | Notes |
|---|---|---|---|
| 2023 | 9 (E3–E11) | 8 | E1, E2 excluded — Ryan competed in Novice |
| 2024 | 10 | 9 | E9: Ryan did not attend |
| 2025 | 10 | 7 | E1, E4, E8: Ryan did not attend |
| 2026 | ongoing | — | Ryan competes as PST/FS |

### PST Class Explained

PST (Pro Street Tire) is a catch-all indexed class where drivers compete using their home-class PAX factor. Ryan's PST competitive time = `best_raw_time × PAX_factor` = his official PAX indexed time. PST class codes are compound — always filter with `.startsWith('PST')`.

- **2023–2025 (FS)**: PST ranking is *hypothetical* — shown as "if you ran PST"
- **2026+ (PST/FS)**: PST ranking is *actual* — no "hypothetical" language anywhere in the UI

---

## Features

### P0 — Core (Season Dashboard)

- **Gap to PAX leader**: Bar chart of `(ryan_indexed - leader_indexed) / leader_indexed × 100` per event
- **Percentile trend**: Bar chart of `% of field beaten` per event
- **PST rank**: Bar chart of percentile within PST field (labeled "Hypothetical" only pre-2026)
- All three charts include: single combined trend line, slope label in card header (colored green = improving, red = declining), alternating year-band backgrounds, event `id` as x-axis key with `#N` tick labels
- **Season summary cards**: Best PAX rank, best percentile, closest to leader, best PST rank
- **Events table**: All attended events, reverse-chronological, with Year column

### P0 — Core (Event Detail)

- **Run timeline**: Individual run times, cone/DNF annotations, per-session best highlighted; session labels per venue (see above)
- **PAX position card**: rank, percentile, indexed time, gap to leader (seconds + %)
- **Raw position card**: rank, raw time, gap to raw leader
- **PST card**: Rank within PST field. "PST Hypothetical" + "if you ran PST" badge for FS events; plain "PST" for PST/FS events
- **PAX field histogram**: Distribution of all indexed times with Ryan's time marked
- **Class results table**: FS class for FS events; full PST field for PST/FS events (title: "PST Class Results")
- **PST results table**: Full PST field with Ryan's row. "(Hypothetical)" suffix only for FS events.
- Prev/next event navigation (sorted by date across all seasons)

### P1 — Secondary

- Clickable chart bars → navigate to event detail
- Sidebar events grouped by year (most recent first), reverse-chron within each year

### P2 — Competitor Comparison

Track and compare performance against a specific rival across the season.

**Expandable rows in ClassResults / PstResults:**
- Click any competitor row to expand an inline comparison chart (Ryan + competitor indexed times over shared events)
- Summary: "Ryan faster in 3 of 5 shared events · avg delta −0.842s"
- "Full comparison →" link to competitor detail page

**Competitor detail page** (`/competitor/:name`):
- Header: "Ryan Berg vs [Name]", shared event count, win/loss summary
- Indexed time overlay chart + delta bar chart
- Head-to-head table: Event, Date, Venue, Ryan Indexed, Competitor Indexed, Delta, Winner

**Data**: No pipeline changes — all competitor data is in `pax_results` on each event. New `useCompetitor(name)` hook queries client-side.

### P3 — Future

- `add-event.js` utility for new events
- Export chart as PNG
- Cone summary dashboard: cones per event, penalty seconds lost

---

## Planned Features

### Weather Data

Attach historical weather (temperature range, precipitation) to each event day. Display in event detail and events table. Enable future dashboard filtering.

**Data source**: Open-Meteo Historical Archive API — free, no API key, covers all historical dates.
- Endpoint: `https://archive-api.open-meteo.com/v1/archive`
- Fields: `temperature_2m_max`, `temperature_2m_min`, `precipitation_sum`
- Units: `temperature_unit=fahrenheit`, `precipitation_unit=inch`, `timezone=America/New_York`

**Venue coordinates**:
- ZMAX Dragway: 35.3783° N, 80.7027° W (Concord, NC)
- Michelin Proving Grounds: 34.5035° N, 81.9973° W (Laurens, SC)

**Script**: `scripts/fetch-weather.js` — standalone enrichment script, idempotent (skips already-populated events). For ZMAX 2-day dual-run events, fetches both `event.date` (Day 1) and `event.date + 1 day` (Day 2, always the literal next calendar day).

**JSON schema addition** (on each event):
```json
"weather": {
  "temp_min_f": 58,
  "temp_max_f": 74,
  "precipitation_in": 0.0,
  "day2_temp_min_f": 61,
  "day2_temp_max_f": 79,
  "day2_precipitation_in": 0.12
}
```
`day2_*` fields present only for ZMAX 2-day events. `weather` is `null` until the script is run.

**Categorization** (at display time, not stored):
```js
// Temperature based on high of the day
if (maxF < 50)  → 'cold'
if (maxF < 80)  → 'mild'
else            → 'hot'

// Precipitation
if (total === 0)    → 'dry'
if (total < 0.1)    → 'trace'
else                → 'rainy'
```

**Event detail UI**: Weather info in the header metadata area (alongside venue/date pills). Temperature range + precipitation. 2-day events show per-day breakdown.

**Events table**: Add compact `Weather` column (e.g. `72° · Dry`).

**Future filtering** (dashboard): Filter chips for temperature (All / Cold / Mild / Hot) and conditions (All / Dry / Rainy). Filter state in `DashboardPage`; trend lines recompute on filtered set automatically.

---

### Run Group Tracking

Record which run group Ryan was assigned to for each event day. Run group order is a meaningful confounding variable — early groups run on a cold, dirty track while late groups benefit from rubber buildup.

**Data source**: Manual entry via `RUN_GROUPS` config in `parse-all-seasons.js`, keyed by event ID:
```js
const RUN_GROUPS = {
  '2023-E03': { group: 2, total: 4 },
  '2024-E07': { day1: { group: 3, total: 4 }, day2: { group: 1, total: 3 } },
}
```

**JSON schema addition** (on `ryan` object):
```json
"run_group": { "group": 2, "total": 4 }
// or for ZMAX 2-day dual-run events:
"run_group": {
  "day1": { "group": 3, "total": 4 },
  "day2": { "group": 1, "total": 3 }
}
```

Schema rules:
- Single-day ZMAX events: flat `{ group, total }`
- Michelin dual-run: flat `{ group, total }` — same group for both AM and PM sessions
- ZMAX 2-day dual-run: `{ day1, day2 }` — group may differ between days

**Event detail UI**: Run group in header metadata pills. Single: `Group 2 of 4`. 2-day: `Day 1: 3/4 · Day 2: 1/3`.

**Events table**: Add `Group` column. 2-day events: `3/4 · 1/3`.

**Future filtering** (dashboard): Filter by group position — Early (first half: `group/total ≤ 0.5`) or Late (second half). Pairs with weather filtering for condition-controlled analysis.

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
| Data pipeline | Node.js scripts, run at build time |
| Deployment | GitHub Pages |

### Visual Design

- **Aesthetic**: High-quality SaaS analytics dashboard (Linear, Vercel analytics style)
- **Color palette**: BMW-inspired — primary blue `#1c69d4`, dark navy `#003566`, black, white, neutral grays
- **Venue colors**: Michelin `#003566` (dark navy), ZMAX `#C92120` (red)
- **Trend line color**: `#94a3b8` (slate-400) — single neutral line, no per-venue split
- **Typography**: Mona Sans variable font (Google Fonts); Mona Sans Mono VF for numeric columns

### App Name

**Auto Crossref** — displayed as `Auto` + `Crossref` (blue accent on `Crossref`).

### Layout

- **Full-width navbar** (`h-12`, sticky) with brand logo in the sidebar-width area
- **Left sidebar** (`w-60`, sticky) — events grouped by year, most recent year first, reverse-chron within year; attended events are links, non-attended are dimmed non-clickable
- **Main content** — `px-6 py-6` page padding

### Styling Rules

- **All DOM styling must use Tailwind utility classes.** `style` props only for: (1) dynamic computed values, (2) Recharts SVG props, (3) runtime dynamic colors from helper functions (e.g. `venueColor()`).
- **Tailwind v4**: `--color-*` → `text-*`/`bg-*`/`border-*`; opacity modifiers: `bg-bmw-blue/10`, `border-bmw-blue/20`
- **Time display**: Always `.toFixed(3)`, no unit suffix
- **Percent labels on bar charts**: `Math.round(v)` — whole numbers only
- **DataTable `getRowClassName`**: Ryan row highlight: `'bg-bmw-blue/5 outline outline-1 outline-bmw-blue/20 [outline-offset:-1px]'`
- **ChartCard `headerRight` prop**: Used for trend slope labels — `↑ +1.2% / event` (green) or `↓ −0.8% / event` (accent)

### Project Structure

```
autox2/
  data/
    2023/    event subdirs with PDFs
    2024/    event subdirs with PDFs
    2025/    event subdirs with PDFs
    2026/    event subdirs with PDFs
  app/
    src/
      components/
        layout/       AppShell
        dashboard/    SeasonSummary, GapBarChart, PercentileChart, PstRankChart
        event/        RunTimeline, PositionCard, PstCard, FieldHistogram, ClassResults, PstResults
        shared/       StatCard, ChartCard, DataTable, venueColors.js
      data/
        season-2023.json
        season-2024.json
        season-2025.json
        season-2026.json
      hooks/
        useAllSeasons.js   (loads all 4 JSONs, merges+sorts by date)
        useSeasonData.js   (delegates to useAllSeasons)
        useEvent.js
      pages/
        DashboardPage.jsx
        EventDetailPage.jsx
    scripts/
      parse-all-seasons.js   (main pipeline — all years)
      fetch-weather.js       (weather enrichment — planned)
      lib/
        extract-pdf-text.js
        extract-pdf-text-fallback.js
        parse-pax-results.js
        parse-raw-results.js
        parse-overall-runs.js
        compute-derived.js
    docs/
      PRD.md
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
    "title": "CCR Autocross #6",
    "venue": "zmax",
    "scoring_type": "single",
    "ryan_attended": true,
    "total_drivers_pax": 113,
    "pax_results": [],
    "raw_results": [],
    "weather": null,
    "ryan": {
      "car_number": "2",
      "class_code": "FS",
      "pax_index": 0.817,
      "run_group": null,
      "runs": [
        { "run_number": 1, "session": "a", "base_time": 65.405, "scored_time": 65.405, "cones": 0, "dnf": false }
      ],
      "best_raw_time": 64.379,
      "official_indexed_time": 52.598,
      "pax_rank": 73, "pax_total": 113, "pax_percentile": 35.4,
      "pax_leader_time": 43.1, "pax_gap_seconds": 9.498, "pax_gap_pct": 22.04,
      "raw_rank": 95, "raw_total": 121, "raw_gap_seconds": 12.1, "raw_gap_pct": 18.8,
      "hypothetical_pst_indexed_time": 52.598,
      "hypothetical_pst_rank": 20, "hypothetical_pst_total": 20, "hypothetical_pst_percentile": 0,
      "fs_class_rank": 1, "fs_class_total": 2
    }
  }]
}
```

---

## Parsing Architecture

### `parse-all-seasons.js`

Single script processes all years via a `SEASONS` config array. Each season config includes subject info (name, class, PAX index, car) and per-event metadata (date, venue, scoring type, runs per session). `RUN_OVERRIDES` provides manually verified run arrays for events where PDF extraction produces wrong session order.

**Run command**: `cd app && node scripts/parse-all-seasons.js`

### PAX PDF Parsing

- **Anchor**: each row has exactly one `0.[789]\d{2}` PAX index value
- Work backwards from the anchor: extract raw time, then car number, then class code, then name
- **Dual-run raw time bug**: for times 100–199s where `time mod 100 ≥ 35`, the 2-digit slice grabs the wrong digits (e.g. 138 → 38). Fix: after parsing rawTime and indexedTime, validate `rawTime × paxIdx ≈ indexedTime`; if off by `100 × paxIdx`, add 100 to rawTime and strip last digit from carNum.

### OVERALL PDF Run Parsing

- Find `Ryan Berg` then `Bridgestone` (marks start of runs)
- Cone notation: `(N)` = N cones; scored_time already includes 2s-per-cone penalty
- DNF: `{ dnf: true, scored_time: null }`; RRN (timing malfunction): discard entirely
- Trophy markers: strip `T\d` (exactly one digit) before parsing

### Validation Reference Points

| Season | Event | Metric | Expected |
|---|---|---|---|
| 2023 | E4 | Ryan raw total | 138.267 |
| 2023 | E11 | Ryan raw total | 145.982 |
| 2024 | E3 | Ryan raw total | 87.777 |
| 2024 | E7 | Ryan raw total | 131.713 |
| 2024 | E10 | Ryan raw total | 131.690 |
| 2025 | E2 | Ryan best raw | 55.666 |
| 2025 | E5 | Ryan raw total | 78.773 |
| 2025 | E6 | Ryan best raw / PAX rank | 64.379 / 73rd |
| 2025 | E7 | Ryan raw total | 78.323 |
| 2025 | E9 | Ryan best raw | 58.858 (4th run, clean) |
| 2025 | E10 | Ryan raw total | 130.974 |
| 2026 | E1 | Ryan best raw / PAX rank | 67.279 / 53rd of 159 |

---

## Implementation Phases

### Phase 1 — Data Pipeline ✅
- PDF extraction utilities (zlib + pdf-parse fallback)
- PAX, RAW, OVERALL parsers with multi-season support
- `compute-derived.js` with PST/FS class support
- `parse-all-seasons.js` generating `season-{year}.json` for 2023–2026

### Phase 2 — Season Dashboard ✅
- `useAllSeasons.js` / `useSeasonData.js` / `useEvent.js`
- `AppShell` with year-grouped sidebar
- Bar charts with multi-year x-axis, year bands, single trend line + slope label
- Season summary cards; events table with Year column, reverse-chronological

### Phase 3 — Event Detail ✅
- `RunTimeline` with per-session best highlighting and venue-aware session labels
- `PositionCard`, `PstCard`, `FieldHistogram`
- `ClassResults` — PST/FS events show full PST field
- `PstResults` — "(Hypothetical)" suffix only for FS events
- Prev/next navigation sorted by date across all seasons

### Phase 4 — Weather Enrichment
- `fetch-weather.js` script (Open-Meteo API)
- `weather` field added to each event in JSON
- WeatherBadge component in event detail header
- Weather column in events table
- Future: dashboard filter chips

### Phase 5 — Run Group Tracking
- `RUN_GROUPS` config in `parse-all-seasons.js`
- `run_group` field added to Ryan's event data
- Run group display in event detail header and events table
- Future: dashboard filter (Early / Late group)

### Phase 6 — Competitor Comparison
- `useCompetitor(name)` hook
- Expandable rows in ClassResults / PstResults
- `/competitor/:name` detail page

### Phase 7 — Future
- `add-event.js` utility
- Export chart as PNG
- Cone summary dashboard
