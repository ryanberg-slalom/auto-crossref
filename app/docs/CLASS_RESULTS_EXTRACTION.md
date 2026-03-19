# Claude Code Instructions: Autocross PDF Parser

## Task Overview

Parse Pronto Timing System autocross results PDFs into structured JSON (or database-ready tables). Two event formats exist and must be handled differently.

---

## Source Material

You will be given one or more PDF files from the Pronto Timing System. Each PDF contains autocross event results organized by class. Use the Anthropic API (vision/document capability) to read each PDF page, then extract the structured data described below.

---

## Format Detection

Before parsing, determine which format the PDF uses:

**Format A — Two-Session (e.g., Event 5)**
- Column headers include **Course 1** and **Course 2**
- Each driver has two rows of run times (morning runs, then afternoon runs)
- The final column is a **combined time** (best C1 + best C2)
- A driver's best run per course is shown in **bold** in the PDF

**Format B — Single-Session (e.g., Event 9)**
- Column header is just **Course 1**
- All runs are in a single sequence across two rows
- The rightmost column is a **repeat of the best run** (or indexed score) — it is NOT an additional run
- Strikethrough times are DNFs (did not finish) — they cannot count as a scored run

Detection hint: if the PDF header row contains both "Course 1" and "Course 2", use Format A. Otherwise use Format B.

---

## PDF Reading Strategy

Use the Anthropic API to read the PDF. Process it **page by page**, passing each page as a document or image. For each page:

1. Extract the raw text content carefully, preserving the layout structure
2. Note that runs appear across **two visual rows** per driver — both rows belong to the same driver entry
3. Numbers in parentheses after a time indicate **cone penalties**: `39.887(1)` means 1 cone = +2 seconds already included in the displayed time
4. Strikethrough text (Format B only) indicates a **DNF** run
5. `RRN` = re-run (driver was given another attempt; treat as a run slot, not a time)
6. `DNF` appearing as a literal string also means did not finish

---

## Data Model

Output one record per driver per event. The schema is:

```json
{
  "event": {
    "name": "string",
    "date": "string (ISO 8601)",
    "format": "two_session | single_session"
  },
  "results": [
    {
      "category": "string",
      "class": "string",
      "position": "integer",
      "trophy": "boolean",
      "car_number": "integer or string",
      "driver": "string",
      "car": "string",
      "sponsor": "string or null",
      "tire": "string or null",
      "index": "string or null",
      "runs": [
        {
          "run_number": "integer (1-based, sequential across all runs)",
          "session": "C1 | C2 | combined",
          "raw_time": "number or null",
          "cones": "integer (0 if clean)",
          "penalty_seconds": "integer (cones * 2)",
          "total_time": "number or null",
          "is_dnf": "boolean",
          "is_rrn": "boolean",
          "is_best": "boolean"
        }
      ],
      "best_time": "number or null",
      "score": "number or null",
      "gap_to_leader": "number or null"
    }
  ]
}
```

**Field notes:**
- `raw_time`: the time as printed, which already includes cone penalties
- `penalty_seconds`: `cones * 2`, for reference
- `total_time`: same as `raw_time` (penalties are pre-applied in Pronto's output)
- `is_best`: true for the run(s) that count toward the final score
- `score`: for non-indexed classes, equals `best_time`; for indexed classes (CAM, PST, PRT, etc.), equals `best_time * index_factor`
- `gap_to_leader`: the value in parentheses shown next to non-leaders in the PDF (e.g., `(1.363)`)
- `session`: use `"C1"` or `"C2"` for Format A; use `"C1"` for all runs in Format B; use `"combined"` only for Format A's final score

---

## Parsing Rules by Format

### Format A (Two-Session)

Each driver's runs are split across two courses:
- **Top row in PDF** = Course 1 runs (typically 3 runs)
- **Bottom row in PDF** = Course 2 runs (typically 3 runs)
- The **bold time** in each course row is that session's best run
- Final score = best C1 time + best C2 time

Run numbering: number C1 runs 1–3 and C2 runs 1–3 separately (i.e., `run_number` resets per session, and `session` distinguishes them), OR number them sequentially 1–6 with `session` as the differentiator — your application can decide.

### Format B (Single-Session)

- All runs are in a single sequence; number them 1–N
- The rightmost column value is **not a run** — it is the score (skip it when enumerating runs)
- For indexed classes, that rightmost value is `best_raw_time * index_factor`
- DNF runs (strikethrough in PDF): set `is_dnf: true`, `is_best: false`; these cannot be the scoring run
- The best run is the lowest `total_time` among non-DNF runs
- Cone penalties are already baked into displayed times; parse `(N)` suffix to populate `cones`

---

## Class & Index Handling

Some classes apply a multiplicative index factor to raw times. The factor appears next to the driver's car info (e.g., `CAMT 0.821`, `CS 0.813`). Store this in the `index` field as a string (e.g., `"CAMT 0.821"`).

To compute `score` for indexed classes:
```
score = best_raw_time * index_factor
```

Non-indexed classes: `score = best_raw_time`.

Known indexed class prefixes: `CAM`, `SM`, `KM`, `CS`, `HS`, `AST`, `CST`, `BST`, `EVX`, `SSP`, `SMF`, `FSP`, `GS`, `ES`, `EST`, `BS`, `DST`, `SST`, `CSP`.

---

## Special Entries

- **Misc / Seat Time Only / No Time**: drivers with no run times recorded. Include them with an empty `runs` array and `null` for `best_time` and `score`.
- **Rookie / Novice / Masters**: parse identically to regular classes; just preserve the class name.
- **Multiple drivers with the same car number**: this happens within different classes — they are distinct entries.

---

## Output Options

### Option 1: JSON file per event
Write one `.json` file per PDF following the schema above.

### Option 2: CSV/TSV for database import
Produce two flat files:
- `entries.csv` — one row per driver (all fields except runs)
- `runs.csv` — one row per run, with a `driver_id` or `(event, class, car_number)` foreign key

### Option 3: Direct database insert
If a database connection is available, insert into:
- `events` table
- `entries` table (FK to event)
- `runs` table (FK to entry)

---

## Suggested Implementation Approach

```
for each PDF file:
  1. Detect format (A or B) from column headers on page 1
  2. Extract event name and date from the header
  3. For each page:
     a. Identify class header rows (bold, full-width)
     b. For each driver block (1–2 visual rows):
        - Parse name, car, sponsor, tire, index, gap
        - Parse run times row by row
        - Apply cone/DNF/RRN flags
        - Identify best run(s)
        - Compute score
  4. Serialize to chosen output format
```

Use the Anthropic API with a prompt like:

```
You are parsing an autocross timing results page. Extract every driver entry in order.
For each driver return structured JSON with: class, position, trophy (T prefix), 
car_number, driver_name, car, sponsor, tire, index, all run times in order with 
cone counts and DNF flags, and final score. Strikethrough times are DNFs.
Times with (N) suffix have N cones. RRN means re-run. Return only valid JSON.
```

Process responses page by page and merge results, deduplicating class headers.

---

## Validation Checklist

After parsing, verify:
- [ ] Every driver's `score` matches the rightmost column value in the PDF (within 0.001s rounding)
- [ ] For Format A: `score` equals `best_c1 + best_c2`
- [ ] For indexed classes: `score ≈ best_raw * factor` (may differ slightly due to PDF rounding)
- [ ] DNF runs are never marked `is_best: true`
- [ ] Each class has the correct number of drivers (shown in the class header)
- [ ] Trophy count matches the "Trophies: N" value in the class header
- [ ] No duplicate driver entries within the same class

---

## Edge Cases to Handle

| Situation | How to handle |
|-----------|--------------|
| `RRN` in run slot | `is_rrn: true`, `raw_time: null`, `is_best: false` |
| `DNF` as literal text | `is_dnf: true`, `raw_time: null` |
| Strikethrough time (Format B) | `is_dnf: true`, time still parsed if readable |
| Driver with only DNF runs | `best_time: null`, `score: null` |
| Same driver name, different class | Treat as separate entries |
| Misc/Seat Time Only with no times | `runs: []`, `best_time: null` |
| Gap shown for leader | Leader has `gap_to_leader: 0` or `null` |
| Multi-page classes | Merge seamlessly; class header may not repeat |
| Cone time already includes penalty | Do NOT add 2s per cone yourself — it's pre-applied |