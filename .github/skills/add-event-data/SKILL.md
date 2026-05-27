---
name: add-event-data
description: 'Add new autocross event results to the project. Use when the user wants to ingest a new event, add results for a recent event, process new PDFs, update season data, or says "add latest events".'
argument-hint: 'e.g. "AX2 2026, ZMAX, April 1 2026, dual-run"'
---

# Add New Event Data

## When to Use
- User drops new PDFs into the `data/` folder and asks to add/process them
- User mentions a recent event and wants results in the app
- User says "add event data", "process new event", "ingest results", etc.

## Prerequisites
- Three Pronto Timing System PDFs placed in `data/{year}/Event {N}  {date}/`:
  - PAX / Indexed results PDF
  - RAW results PDF
  - FINAL / OVERALL results PDF
- `ANTHROPIC_API_KEY` set in the environment

## Procedure

### 1. Extract PDFs with Claude

From the `app/` directory, run the extractor for the new event. This writes `pax-extracted.json`, `raw-extracted.json`, and `final-extracted.json` into the event folder.

```bash
cd app
node scripts/extract-all-with-claude.js --event {YEAR}-E{NN}
```

Replace `{YEAR}-E{NN}` with the year and zero-padded event number (e.g. `2026-E02`).

### 2. Register event metadata

Add an entry to the `EVENT_META` object for the relevant year in `app/scripts/parse-all-seasons.js`:

```js
2: { date: '2026-04-01', title: 'AX2 Example', runsPerSession: 4, sessions: 1, venue: 'zmax' },
```

Key fields:
- `date`: ISO 8601 (YYYY-MM-DD)
- `sessions`: `1` = single-run, `2` = dual-run
- `venue`: `'zmax'` or `'michelin'`
- `runsPerSession`: number of runs per session (typically 3–4)

### 3. Regenerate the season JSON

```bash
node scripts/parse-all-seasons.js
```

This overwrites `src/data/season-{year}.json`. The app picks up the new event automatically on next load.

### 4. Fetch weather (optional)

```bash
node scripts/fetch-weather.js
```

Idempotent — skips events that already have weather data.

### 5. Verify

Run `npm run dev` and navigate to the new event to confirm runs, PAX rank, and PST rank look correct. If run data is wrong, add a `RUN_OVERRIDES` entry for the event in `parse-all-seasons.js` and re-run step 3.
