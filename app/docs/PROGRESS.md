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
- [x] `src/components/layout/AppShell.jsx` — sticky nav, BMW roundel logo
- [x] `src/components/shared/StatCard.jsx`
- [x] `src/components/shared/ChartCard.jsx`
- [x] `src/components/dashboard/SeasonSummary.jsx` — 4 stat cards
- [x] `src/components/dashboard/PaxRankChart.jsx` — inverted Y axis, click-through to event
- [x] `src/components/dashboard/PercentileChart.jsx`
- [x] `src/components/dashboard/IndexedTimeChart.jsx` — single-course events only
- [x] `src/components/dashboard/GapBarChart.jsx` — best gap highlighted green
- [x] `src/pages/DashboardPage.jsx` — charts grid + events table

---

## Phase 3 — Event Detail ✅

- [x] `src/components/event/PositionCard.jsx` — PAX and RAW rank cards with progress bar
- [x] `src/components/event/PstCard.jsx` — hypothetical PST ranking
- [x] `src/components/event/RunTimeline.jsx` — runs with cone/DNF badges, session dividers for dual-run
- [x] `src/components/event/FieldHistogram.jsx` — indexed time distribution, Ryan's bin highlighted
- [x] `src/components/event/ClassResults.jsx` — FS class standings table
- [x] `src/pages/EventDetailPage.jsx` — full event detail with prev/next navigation

---

## Phase 4 — Future (not started)

- [ ] `add-event.js` utility for appending new season events
- [ ] Multi-season JSON structure (`season-2025.json`, `season-2026.json`)
- [ ] Season selector in nav
- [ ] Comparison view: overlay two events side-by-side
- [ ] Export chart as PNG

---

## Known Limitations / Future Improvements

- **Event titles**: Several events use placeholder titles ("Event 2", "Event 3", etc.) — could extract from PDF headers
- **Event 8 fallback**: pdf-parse CIDFont extraction also fails for E8; Ryan didn't attend so full-field data is unavailable. Would need a different extraction approach (e.g., pdftotext CLI) if E8 data is ever needed.
- **Chunk size**: The single JS bundle is ~832KB (recharts + season JSON). Acceptable for personal use; could be split with dynamic imports if needed.
- **Dual-run indexed time chart**: Excluded from trend chart since dual-run times (sum of sessions) aren't comparable to single-course times. Could add a separate dual-run chart.
