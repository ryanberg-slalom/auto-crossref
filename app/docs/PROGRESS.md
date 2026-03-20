# Implementation Progress

## Status: Phases 1–3 Complete ✅

---

## Phase 1 — Data Pipeline ✅

- [x] Scaffold Vite + React + JS + Tailwind v4 project
- [x] `scripts/lib/extract-pdf-text.js` — zlib stream extraction (works for 9/10 events)
- [x] `scripts/lib/extract-pdf-text-fallback.js` — pdf-parse wrapper for Event 8 CIDFont PDFs
- [x] `scripts/lib/parse-pax-results.js` — PAX index anchor strategy, carNum/rawTime split, name extraction
- [x] `scripts/lib/parse-raw-results.js` — class code anchor strategy
- [x] `scripts/lib/parse-overall-runs.js` — tire brand marker, cone/DNF parsing
- [x] `scripts/lib/compute-derived.js` — PAX rank/percentile/gap, RAW rank, hypothetical PST rank, FS class rank
- [x] `scripts/parse-events.js` — main pipeline, EVENT_META, PDF discovery
- [x] `src/data/season-2025.json` generated and validated

### Validation Results (all pass)

| Event | Check | Result |
|---|---|---|
| E2 | car_number | `"21"` ✓ |
| E2 | best_raw_time | `55.666` ✓ |
| E6 | best_raw_time | `64.379` ✓ |
| E6 | pax_rank | `73` ✓ |
| E6 | runs | `65.405 / 66.995(3c) / 64.379 / 68.654(3c)` ✓ |
| E7 | best_raw_time | `78.323` ✓ |
| E7 | runs | `40.225, 39.917, 38.962 / 39.926, 40.197, 39.361` ✓ |
| E10 | best_raw_time | `130.974` ✓ |

### Notable Bugs Fixed During Development

- **PAX position garbage**: gap numbers from previous row bled into position. Fixed by assigning position from sorted array index instead of parsing.
- **Class code truncation** (`"F"` instead of `"FS"`): extra `carNum` strip was cutting into class code. Fixed by using `textBeforeRaw` directly (carNum already excluded by the rawTime regex match).
- **Cone regex overreach** (`c=364` for 3 cones): `\d+` greedily consumed digits from the next run time (`·3` followed by `64.379` → `·364`). Fixed by using `·(\d)` for dot notation (exactly 1 digit) and `(\d{1,2})` with closing delimiter for paren notation.
- **Run parser overflow**: parser entered next driver's runs when Ryan's actual run 3 was consumed by the broken cone match. Fixed by the cone regex fix above + `skipCount > 80` bailout.

---

## Phase 2 — Season Dashboard ✅

- [x] `src/hooks/useSeasonData.js`
- [x] `src/hooks/useEvent.js`
- [x] `src/components/layout/AppShell.jsx` — full-width sticky navbar + left sidebar with event list, subnav, "AutoX-Ref" branding
- [x] `src/components/shared/StatCard.jsx`
- [x] `src/components/shared/ChartCard.jsx`
- [x] `src/components/shared/DataTable.jsx` — TanStack Table wrapper, `getRowClassName`, column `meta` for alignment
- [x] `src/components/shared/venueColors.js` — Michelin (navy) / ZMAX (red) color constants
- [x] `src/components/dashboard/SeasonSummary.jsx` — 4 stat cards
- [x] `src/components/dashboard/chartUtils.jsx` — shared: `getYearBands`, `linReg`, `TrendBadge`, `tireChangeLines`; all charts import from here
- [x] `src/components/dashboard/PercentileChart.jsx` — venue-colored bars + trend line + slope badge
- [x] `src/components/dashboard/GapBarChart.jsx` — venue-colored bars, click-through to event; null `pax_gap_pct` events included in x-axis (no bar) with trend regression skipping them
- [x] `src/components/dashboard/RunProgressionChart.jsx` — skinny per-run bars grouped by session; quality = run_time / session_worst × 100; best run color-coded green/amber/red by finish position; DNFs at fixed 78%; dual-session split with spacer gaps; y-axis hidden, domain 75–100% (offset trick)
- [x] `src/components/dashboard/PstRankChart.jsx` — percentile bars + trend lines + `(rank of total)` labels
- [x] `src/pages/DashboardPage.jsx` — charts + events table with venue dots
- [x] All dashboard charts: x-axis shows year-only labels (forced ticks at year boundaries); alternating year-band backgrounds at `rgba(0,0,0,0.07)`

---

## Phase 3 — Event Detail ✅

- [x] `src/components/event/PositionCard.jsx` — PAX and RAW rank cards with progress bar
- [x] `src/components/event/PstCard.jsx` — hypothetical PST ranking
- [x] `src/components/event/RunTimeline.jsx` — runs with cone/DNF badges, session dividers for dual-run
- [x] `src/components/event/FieldHistogram.jsx` — indexed time distribution, Ryan's bin highlighted
- [x] `src/components/event/ClassResults.jsx` — FS class standings table
- [x] `src/components/event/PstResults.jsx` — PST hypothetical table with raw/PAX delta columns, Mona Sans Mono for numeric alignment
- [x] `src/pages/EventDetailPage.jsx` — event header (title, venue, date, drivers), sticky subnav breadcrumb + persistent prev/next nav

---

## Phase 4 — Infrastructure (not started)

- [ ] `add-event.js` utility for appending new season events
- [ ] Multi-season JSON structure (`season-2025.json`, `season-2026.json`)
- [ ] Season selector in nav

---

## Phase 5 — Competitor Comparison (not started)

Compare performance against a specific rival across all shared events.

**DataTable changes:**
- [ ] Add `getExpandedContent?: (row) => ReactNode` prop
- [ ] Expand/collapse on row click; only one row open at a time
- [ ] Expanded content renders in a full-width row below the data row

**New hook:**
- [ ] `src/hooks/useCompetitor.js` — takes a competitor name, joins their `pax_results` entries with Ryan's data across all events, returns per-event comparison records

**Inline expansion (ClassResults + PstResults):**
- [ ] Clicking a non-Ryan row expands to show `ComparisonChart` (compact, ~160px)
- [ ] Summary line: shared event count, Ryan's win count, avg delta
- [ ] "Full comparison →" link to `/competitor/:name`

**New components:**
- [ ] `src/components/competitor/ComparisonChart.jsx` — dual-line indexed time chart, reused in expansion and competitor page
- [ ] `src/components/competitor/HeadToHeadTable.jsx` — per-event table (event, Ryan indexed, competitor indexed, delta, winner)

**New page:**
- [ ] `src/pages/CompetitorPage.jsx` — full `/competitor/:name` page with header, summary chips, charts, head-to-head table
- [ ] Add route to React Router config

---

## Manual JSON Corrections

Changes made directly to season JSON files (will be overwritten if those events are re-parsed):

| Event | Field | Old | New | Source |
|---|---|---|---|---|
| 2023-E04 | `pax_leader_time` | 0 | 103.563 | Mike Casino (manually looked up) |
| 2023-E04 | `pax_gap_seconds` | 112.411 | 8.848 | computed |
| 2023-E04 | `pax_gap_pct` | null | 8.54 | computed |
| 2024-E04 | `pax_leader_time` | 0 | 83.794 | Jonathan Mudge (manually looked up) |
| 2024-E04 | `pax_gap_seconds` | 92.59 | 8.796 | computed |
| 2024-E04 | `pax_gap_pct` | null | 10.50 | computed |
| 2025-E10 | `ryan.runs` | mangled (interleaved sessions, null times, phantom rerun) | 8 correct runs across sessions a+b | manually corrected from user's memory |

---

## Known Limitations / Future Improvements

- **Event titles**: Several events use placeholder titles ("Event 2", "Event 3", etc.) — could extract from PDF headers
- **Event 8 fallback**: pdf-parse CIDFont extraction also fails for E8; Ryan didn't attend so full-field data is unavailable. Would need a different extraction approach (e.g., pdftotext CLI) if E8 data is ever needed.
- **Chunk size**: The single JS bundle is ~832KB (recharts + season JSON). Acceptable for personal use; could be split with dynamic imports if needed.
- **Dual-run indexed time chart**: Excluded from trend chart since dual-run times (sum of sessions) aren't comparable to single-course times. Could add a separate dual-run chart.
- **Dual-run `pax_leader_time: 0`**: Parser fails to extract combined leader time for some dual-run events. `RUN_OVERRIDES` or a post-parse correction step would be the right long-term fix.
- **`base_time: null` with `dnf: false`**: Parser can produce invalid run entries. All consumers guard with `r.base_time != null`.
- **`RunTimeline`**: Guards against `scored_time: null` on non-DNF runs — renders `—` rather than crashing.
