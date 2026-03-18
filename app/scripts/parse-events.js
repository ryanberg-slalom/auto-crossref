/**
 * Main data pipeline: parses all event PDFs and outputs src/data/season-2025.json
 *
 * Usage: node scripts/parse-events.js
 *
 * Requires: pdf-parse (dev dependency)
 * Run from the app/ directory.
 */

import { readdirSync, existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { extractPdfText } from './lib/extract-pdf-text.js'
import { extractPdfTextFallback } from './lib/extract-pdf-text-fallback.js'
import { parsePaxResults } from './lib/parse-pax-results.js'
import { parseRawResults } from './lib/parse-raw-results.js'
import { parseRyanRuns, buildCarMap } from './lib/parse-overall-runs.js'
import { computeDerived } from './lib/compute-derived.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '../../data')
const OUTPUT = join(__dirname, '../src/data/season-2025.json')

const RYAN_NAME = 'Ryan Berg'

// ---- Event metadata ----
// Dual-run events: score = best_run_A + best_run_B
// runsPerSession: number of runs per session (3 or 4)
//
// runsOverride: manually-verified run arrays for events where PDF text extraction
// produces runs in the wrong session order. Values confirmed against official results.
// E5: PDF text has PM runs in reverse order interleaved with last AM run, causing
// the simple sequential split to assign sessions incorrectly.
const RUN_OVERRIDES = {
  5: [
    { run_number: 1, session: 'a', base_time: 40.347, scored_time: 40.347, cones: 0, dnf: false, rerun: false },
    { run_number: 2, session: 'a', base_time: 40.871, scored_time: 40.871, cones: 0, dnf: false, rerun: false },
    { run_number: 3, session: 'a', base_time: 40.198, scored_time: 40.198, cones: 0, dnf: false, rerun: false },
    { run_number: 4, session: 'b', base_time: 39.094, scored_time: 41.094, cones: 1, dnf: false, rerun: false },
    { run_number: 5, session: 'b', base_time: 38.575, scored_time: 38.575, cones: 0, dnf: false, rerun: false },
    { run_number: 6, session: 'b', base_time: 43.840, scored_time: 43.840, cones: 0, dnf: false, rerun: false },
  ],
  // E7: PDF text has session B runs interleaved with session A, causing wrong session assignments.
  // AM (session A) runs are displayed in red, PM (session B) runs in blue in the official results.
  7: [
    { run_number: 1, session: 'a', base_time: 40.225, scored_time: 40.225, cones: 0, dnf: false, rerun: false },
    { run_number: 2, session: 'a', base_time: 39.917, scored_time: 39.917, cones: 0, dnf: false, rerun: false },
    { run_number: 3, session: 'a', base_time: 39.361, scored_time: 39.361, cones: 0, dnf: false, rerun: false },
    { run_number: 4, session: 'b', base_time: 40.197, scored_time: 40.197, cones: 0, dnf: false, rerun: false },
    { run_number: 5, session: 'b', base_time: 39.926, scored_time: 39.926, cones: 0, dnf: false, rerun: false },
    { run_number: 6, session: 'b', base_time: 38.962, scored_time: 38.962, cones: 0, dnf: false, rerun: false },
  ],
}

const EVENT_META = {
  1:  { date: '2025-02-22', title: "We're Back Baby",           runsPerSession: 4, sessions: 1, venue: 'zmax'     },
  2:  { date: '2025-03-08', title: 'Event 2',                   runsPerSession: 4, sessions: 1, venue: 'zmax'     },
  3:  { date: '2025-03-29', title: 'Event 3',                   runsPerSession: 4, sessions: 1, venue: 'zmax'     },
  4:  { date: '2025-05-03', title: 'Event 4',                   runsPerSession: 4, sessions: 1, venue: 'zmax'     },
  5:  { date: '2025-06-01', title: 'Event 5 Dual Run',          runsPerSession: 3, sessions: 2, venue: 'michelin' },
  6:  { date: '2025-07-19', title: 'CCR Autocross #6 Overhalf', runsPerSession: 4, sessions: 1, venue: 'zmax'     },
  7:  { date: '2025-08-09', title: 'Event 7 Dual Run',          runsPerSession: 3, sessions: 2, venue: 'michelin' },
  8:  { date: '2025-09-20', title: 'Event 8',                   runsPerSession: 4, sessions: 1, venue: 'zmax'     },
  9:  { date: '2025-10-11', title: 'Event 9',                   runsPerSession: 4, sessions: 1, venue: 'zmax'     },
  10: { date: '2025-11-15', title: 'Event 10 Dual Run',         runsPerSession: 4, sessions: 2, venue: 'zmax'     },
}

// ---- PDF filename detection ----
const PAX_PATTERNS = ['pax', 'PAX', 'indexed', 'Indexed', 'INDEX', 'paxresults']
const RAW_PATTERNS = ['raw', 'RAW', 'Raw']
const OVERALL_PATTERNS = ['overall', 'OVERALL', 'Overall', 'Results_O', 'results_O', 'FINAL', 'Final', 'final']

function findPdf(files, patterns) {
  for (const pattern of patterns) {
    const match = files.find(f =>
      f.toLowerCase().includes(pattern.toLowerCase()) && f.endsWith('.pdf')
    )
    if (match) return match
  }
  return null
}

async function extractText(pdfPath) {
  const text = extractPdfText(pdfPath)
  if (text.length > 500) return text
  // Fallback for CIDFont PDFs (Event 8)
  console.log(`  Using pdf-parse fallback for ${pdfPath}`)
  try {
    return await extractPdfTextFallback(pdfPath)
  } catch (err) {
    console.warn(`  Fallback also failed: ${err.message}`)
    return ''
  }
}

// ---- Main ----
async function main() {
  const eventDirs = readdirSync(DATA_DIR)
    .filter(d => /^Event \d/.test(d))
    .sort()

  const events = []

  for (const dir of eventDirs) {
    const numMatch = dir.match(/Event (\d+)/)
    if (!numMatch) continue
    const eventNum = parseInt(numMatch[1], 10)
    const meta = EVENT_META[eventNum]
    if (!meta) {
      console.warn(`No metadata for event ${eventNum}, skipping`)
      continue
    }

    const eventDir = join(DATA_DIR, dir)
    const files = readdirSync(eventDir)

    const paxFile = findPdf(files, PAX_PATTERNS)
    const rawFile = findPdf(files, RAW_PATTERNS)
    const overallFile = findPdf(files, OVERALL_PATTERNS)

    console.log(`\nEvent ${eventNum} (${dir}):`)
    console.log(`  PAX: ${paxFile || 'NOT FOUND'}`)
    console.log(`  RAW: ${rawFile || 'NOT FOUND'}`)
    console.log(`  OVERALL: ${overallFile || 'NOT FOUND'}`)

    const eventData = {
      id: `2025-E${String(eventNum).padStart(2, '0')}`,
      event_number: eventNum,
      date: meta.date,
      title: meta.title,
      venue: meta.venue,
      scoring_type: meta.sessions > 1 ? 'dual_run' : 'single',
      ryan_attended: false,
      total_drivers_pax: 0,
      total_drivers_raw: 0,
      pax_results: [],
      raw_results: [],
      ryan: null,
    }

    // --- Parse PAX results ---
    if (paxFile) {
      try {
        const paxText = await extractText(join(eventDir, paxFile))
        const paxDrivers = parsePaxResults(paxText)
        eventData.pax_results = paxDrivers
        eventData.total_drivers_pax = paxDrivers.length
        console.log(`  PAX parsed: ${paxDrivers.length} drivers`)

        // Check if Ryan is in pax results
        const ryanPax = paxDrivers.find(d => d.name === RYAN_NAME)
        if (ryanPax) {
          eventData.ryan_attended = true
          console.log(`  Ryan found in PAX: pos=${ryanPax.pos}, indexed=${ryanPax.indexed_time}, pax=${ryanPax.pax_index}`)
        }
      } catch (err) {
        console.error(`  PAX parse error: ${err.message}`)
      }
    }

    // --- Parse RAW results ---
    if (rawFile) {
      try {
        const rawText = await extractText(join(eventDir, rawFile))
        const rawDrivers = parseRawResults(rawText)
        eventData.raw_results = rawDrivers
        eventData.total_drivers_raw = rawDrivers.length
        console.log(`  RAW parsed: ${rawDrivers.length} drivers`)
      } catch (err) {
        console.error(`  RAW parse error: ${err.message}`)
      }
    }

    // --- Parse Ryan's runs from OVERALL ---
    let ryanRawTime = null
    let ryanIndexedTime = null

    const ryanPaxEntry = eventData.pax_results.find(d => d.name === RYAN_NAME)
    if (ryanPaxEntry) {
      ryanRawTime = ryanPaxEntry.raw_time
      ryanIndexedTime = ryanPaxEntry.indexed_time
    }

    // --- Extract car info for all drivers from OVERALL ---
    if (overallFile) {
      try {
        const overallTextForCars = await extractText(join(eventDir, overallFile))
        const names = eventData.pax_results.map(d => d.name)
        const carMap = buildCarMap(overallTextForCars, names)
        let carHits = 0
        for (const driver of eventData.pax_results) {
          if (carMap.has(driver.name)) { driver.car = carMap.get(driver.name); carHits++ }
        }
        console.log(`  Car info: ${carHits}/${names.length} drivers matched`)
      } catch (err) {
        console.warn(`  Car map extraction failed: ${err.message}`)
      }
    }

    if (eventData.ryan_attended && overallFile) {
      try {
        const overallText = await extractText(join(eventDir, overallFile))
        const ryanRunData = parseRyanRuns(overallText, {
          runsPerSession: meta.runsPerSession,
          sessions: meta.sessions,
        })

        if (ryanRunData) {
          // Apply manual run override if present (for events where PDF extraction
          // produces incorrect session assignments)
          if (RUN_OVERRIDES[eventNum]) {
            ryanRunData.runs = RUN_OVERRIDES[eventNum]
            console.log(`  Ryan runs: using manual override for event ${eventNum}`)
          } else {
            console.log(`  Ryan runs: ${ryanRunData.runs.length} runs, best=${ryanRunData.best_raw_time}`)
          }
          // Use OVERALL best as raw time if more precise (PAX PDF is authoritative for ranking)
          // but we use the PAX value for ryanRawTime since that's what determines ranking
          const paxIndex = ryanPaxEntry?.pax_index ?? null

          // Compute derived metrics
          if (ryanIndexedTime !== null && ryanRawTime !== null) {
            const derived = computeDerived({
              paxResults: eventData.pax_results,
              rawResults: eventData.raw_results,
              ryanIndexedTime,
              ryanRawTime,
              ryanName: RYAN_NAME,
            })

            eventData.ryan = {
              car_number: ryanPaxEntry?.car_number ?? '',
              class_code: 'FS',
              pax_index: paxIndex,
              runs: ryanRunData.runs,
              best_raw_time: ryanRawTime,
              official_indexed_time: ryanIndexedTime,
              ...derived,
            }
          }
        }
      } catch (err) {
        console.error(`  OVERALL parse error: ${err.message}`)
      }
    } else if (eventData.ryan_attended && ryanIndexedTime !== null) {
      // Ryan attended but no OVERALL file — compute derived without run details
      const derived = computeDerived({
        paxResults: eventData.pax_results,
        rawResults: eventData.raw_results,
        ryanIndexedTime,
        ryanRawTime,
        ryanName: RYAN_NAME,
      })
      eventData.ryan = {
        car_number: ryanPaxEntry?.car_number ?? '',
        class_code: 'FS',
        pax_index: ryanPaxEntry?.pax_index ?? null,
        runs: [],
        best_raw_time: ryanRawTime,
        official_indexed_time: ryanIndexedTime,
        ...derived,
      }
    }

    events.push(eventData)
  }

  const output = {
    season: 2025,
    subject: {
      name: 'Ryan Berg',
      class: 'FS',
      pax_index: 0.817,
      car: '2022 BMW M240i',
      tires: 'Bridgestone',
    },
    events,
  }

  writeFileSync(OUTPUT, JSON.stringify(output, null, 2))
  console.log(`\n✓ Written to ${OUTPUT}`)
  console.log(`  ${events.length} events, ${events.filter(e => e.ryan_attended).length} attended by Ryan`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
