/**
 * Multi-season data pipeline: parses all event PDFs across all seasons
 * and outputs separate src/data/season-{year}.json files.
 *
 * Usage: node scripts/parse-all-seasons.js
 *
 * Generates: season-2023.json, season-2024.json, season-2025.json, season-2026.json
 */

import { readdirSync, readFileSync, existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { extractPdfText } from './lib/extract-pdf-text.js'
import { extractPdfTextFallback } from './lib/extract-pdf-text-fallback.js'
import { parsePaxResults } from './lib/parse-pax-results.js'
import { parseRawResults } from './lib/parse-raw-results.js'
import { parseRyanRuns, buildCarMap } from './lib/parse-overall-runs.js'
import { computeDerived } from './lib/compute-derived.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RYAN_NAME = 'Ryan Berg'

const PAX_PATTERNS     = ['pax', 'PAX', 'indexed', 'Indexed', 'INDEX', 'paxresults']
const RAW_PATTERNS     = ['raw', 'RAW', 'Raw']
const OVERALL_PATTERNS = ['overall', 'OVERALL', 'Overall', 'Results_O', 'results_O', 'FINAL', 'Final', 'final']

// Prefer REVISED files when available; exclude number-suffixed extra pages (-02, -03, etc.)
function findPdf(files, patterns) {
  const nonNumbered = files.filter(f => !/-\d{2}\.pdf$/i.test(f))
  for (const pattern of patterns) {
    const revised = nonNumbered.find(f =>
      f.toLowerCase().includes(pattern.toLowerCase()) &&
      f.toLowerCase().includes('revised') &&
      f.endsWith('.pdf')
    )
    if (revised) return revised
  }
  for (const pattern of patterns) {
    const match = nonNumbered.find(f =>
      f.toLowerCase().includes(pattern.toLowerCase()) && f.endsWith('.pdf')
    )
    if (match) return match
  }
  return null
}

async function extractText(pdfPath) {
  const text = extractPdfText(pdfPath)
  if (text.length > 500) return text
  console.log(`  Using pdf-parse fallback for ${pdfPath}`)
  try {
    return await extractPdfTextFallback(pdfPath)
  } catch (err) {
    console.warn(`  Fallback also failed: ${err.message}`)
    return ''
  }
}

// ---- Claude extraction cache helpers ----

/**
 * Load Claude-extracted PAX data if available. Returns array in same format as parsePaxResults.
 * @param {string} eventDir
 * @returns {Array|null}
 */
function loadPaxCache(eventDir) {
  const cachePath = join(eventDir, 'pax-extracted.json')
  if (!existsSync(cachePath)) return null
  try {
    return JSON.parse(readFileSync(cachePath, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Load Claude-extracted RAW data if available. Returns array in same format as parseRawResults.
 * @param {string} eventDir
 * @returns {Array|null}
 */
function loadRawCache(eventDir) {
  const cachePath = join(eventDir, 'raw-extracted.json')
  if (!existsSync(cachePath)) return null
  try {
    return JSON.parse(readFileSync(cachePath, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Load Claude-extracted FINAL data and derive Ryan's runs + car map.
 * @param {string} eventDir
 * @param {string} ryanName
 * @returns {{ ryanEntry: object|null, carMap: Map<string,string> }|null}
 */
function loadFinalCache(eventDir, ryanName) {
  const cachePath = join(eventDir, 'final-extracted.json')
  if (!existsSync(cachePath)) return null
  try {
    const data = JSON.parse(readFileSync(cachePath, 'utf8'))

    // Build car map from the cars array
    const carMap = new Map()
    for (const entry of (data.cars ?? [])) {
      if (entry.name && entry.car) carMap.set(entry.name, entry.car)
    }

    // Ryan's entry is in data.ryan
    const ryanEntry = data.ryan ?? null

    return { ryanEntry, carMap }
  } catch {
    return null
  }
}

/**
 * Convert a Claude-extracted final entry's runs to the app's internal run format.
 * Claude uses { session:'a'|'b', base_time, scored_time, cones, dnf, rerun }
 * which already matches the app schema.
 */
function mapFinalRuns(ryanEntry, meta) {
  if (!ryanEntry?.runs?.length) return null

  const runs = ryanEntry.runs.map((r, i) => ({
    run_number: r.run_number ?? i + 1,
    session: r.session ?? 'a',
    base_time: r.base_time ?? null,
    scored_time: r.scored_time ?? null,
    cones: r.cones ?? 0,
    dnf: r.dnf ?? false,
    rerun: r.rerun ?? false,
  }))

  // Compute best_raw_time
  let bestRawTime = null
  if (meta.sessions === 1) {
    const valid = runs.filter(r => !r.dnf && !r.rerun && r.scored_time !== null)
    if (valid.length > 0) bestRawTime = Math.min(...valid.map(r => r.scored_time))
  } else {
    const sessionA = runs.filter(r => r.session === 'a' && !r.dnf && !r.rerun && r.scored_time !== null)
    const sessionB = runs.filter(r => r.session === 'b' && !r.dnf && !r.rerun && r.scored_time !== null)
    const bestA = sessionA.length > 0 ? Math.min(...sessionA.map(r => r.scored_time)) : null
    const bestB = sessionB.length > 0 ? Math.min(...sessionB.map(r => r.scored_time)) : null
    if (bestA !== null && bestB !== null) bestRawTime = parseFloat((bestA + bestB).toFixed(3))
  }

  return { runs, best_raw_time: bestRawTime }
}

// ---- Season configs ----

const SEASONS = [
  // ---- 2023 ----
  {
    year: 2023,
    dataDir: join(__dirname, '../../data/2023'),
    outputFile: join(__dirname, '../src/data/season-2023.json'),
    subject: {
      name: 'Ryan Berg',
      class: 'FS',
      pax_index: 0.813,
      car: '2022 BMW M240i',
      tires: 'Bridgestone',
    },
    // Events 1 & 2 excluded (Novice group). Event 9 included as non-attended.
    EVENT_META: {
      3:  { date: '2023-05-06', title: 'AX3',                          runsPerSession: 5, sessions: 1, venue: 'michelin' },
      4:  { date: '2023-06-03', title: 'AX4 The Pre Tour',             runsPerSession: 4, sessions: 2, venue: 'zmax'     },
      5:  { date: '2023-06-24', title: 'AX5 Plinko',                   runsPerSession: 3, sessions: 2, venue: 'michelin' },
      6:  { date: '2023-07-15', title: 'AX6 Mid Season Mania',         runsPerSession: 4, sessions: 1, venue: 'zmax'     },
      7:  { date: '2023-08-19', title: 'AX7 Nationals Prep',           runsPerSession: 4, sessions: 1, venue: 'zmax'     },
      8:  { date: '2023-09-16', title: 'AX8 Welcome Back Hotter',      runsPerSession: 4, sessions: 1, venue: 'zmax'     },
      9:  { date: '2023-09-30', title: 'AX9',                          runsPerSession: 4, sessions: 1, venue: 'zmax'     },
      10: { date: '2023-10-14', title: 'AX10 Are We There Yet',        runsPerSession: 4, sessions: 1, venue: 'zmax'     },
      11: { date: '2023-11-11', title: 'AX11 Racing For Heroes Tour',  runsPerSession: 4, sessions: 2, venue: 'zmax'     },
    },
    RUN_OVERRIDES: {
      // Claude extracted 6 runs but run 6 is the PDF's "best score" column, not a real run.
      // Actual event: single session, 5 runs. Times confirmed via PAX raw_time = 45.319.
      3: [
        { run_number: 1, session: 'a', base_time: 48.650, scored_time: 48.650, cones: 0, dnf: false, rerun: false },
        { run_number: 2, session: 'a', base_time: 48.048, scored_time: 48.048, cones: 0, dnf: false, rerun: false },
        { run_number: 3, session: 'a', base_time: 45.744, scored_time: 45.744, cones: 0, dnf: false, rerun: false },
        { run_number: 4, session: 'a', base_time: 45.624, scored_time: 47.624, cones: 1, dnf: false, rerun: false },
        { run_number: 5, session: 'a', base_time: 45.319, scored_time: 45.319, cones: 0, dnf: false, rerun: false },
      ],
      // PDF extraction produces wrong session order; values confirmed against official results.
      4: [
        { run_number: 1, session: 'a', base_time: 76.503, scored_time: 76.503, cones: 0, dnf: false, rerun: false },
        { run_number: 2, session: 'a', base_time: 72.184, scored_time: 72.184, cones: 0, dnf: false, rerun: false },
        { run_number: 3, session: 'a', base_time: 70.813, scored_time: 74.813, cones: 2, dnf: false, rerun: false },
        { run_number: 4, session: 'a', base_time: 69.930, scored_time: 71.930, cones: 1, dnf: false, rerun: false },
        { run_number: 5, session: 'b', base_time: 69.580, scored_time: 71.580, cones: 1, dnf: false, rerun: false },
        { run_number: 6, session: 'b', base_time: 67.452, scored_time: 69.452, cones: 1, dnf: false, rerun: false },
        { run_number: 7, session: 'b', base_time: 66.542, scored_time: 66.542, cones: 0, dnf: false, rerun: false },
        { run_number: 8, session: 'b', base_time: 66.337, scored_time: 66.337, cones: 0, dnf: false, rerun: false },
      ],
      5: [
        { run_number: 1, session: 'a', base_time: 42.679, scored_time: 42.679, cones: 0, dnf: false, rerun: false },
        { run_number: 2, session: 'a', base_time: 43.435, scored_time: 43.435, cones: 0, dnf: false, rerun: false },
        { run_number: 3, session: 'a', base_time: 43.026, scored_time: 45.026, cones: 1, dnf: false, rerun: false },
        { run_number: 4, session: 'b', base_time: 42.089, scored_time: 46.089, cones: 2, dnf: false, rerun: false },
        { run_number: 5, session: 'b', base_time: 42.917, scored_time: 42.917, cones: 0, dnf: false, rerun: false },
        { run_number: 6, session: 'b', base_time: 42.621, scored_time: 42.621, cones: 0, dnf: false, rerun: false },
      ],
      11: [
        { run_number: 1, session: 'a', base_time: 81.787, scored_time: 81.787, cones: 0, dnf: false, rerun: false },
        { run_number: 2, session: 'a', base_time: 79.037, scored_time: 79.037, cones: 0, dnf: false, rerun: false },
        { run_number: 3, session: 'a', base_time: 78.725, scored_time: 78.725, cones: 0, dnf: false, rerun: false },
        { run_number: 4, session: 'a', base_time: 79.216, scored_time: 81.216, cones: 1, dnf: false, rerun: false },
        { run_number: 5, session: 'b', base_time: 71.251, scored_time: 71.251, cones: 0, dnf: false, rerun: false },
        { run_number: 6, session: 'b', base_time: 67.257, scored_time: 67.257, cones: 0, dnf: false, rerun: false },
        { run_number: 7, session: 'b', base_time: 67.528, scored_time: 67.528, cones: 0, dnf: false, rerun: false },
        { run_number: 8, session: 'b', base_time: 67.328, scored_time: 67.328, cones: 0, dnf: false, rerun: false },
      ],
    },
  },

  // ---- 2024 ----
  {
    year: 2024,
    dataDir: join(__dirname, '../../data/2024'),
    outputFile: join(__dirname, '../src/data/season-2024.json'),
    subject: {
      name: 'Ryan Berg',
      class: 'FS',
      pax_index: 0.814,
      car: '2022 BMW M240i',
      tires: 'Bridgestone',
    },
    EVENT_META: {
      1:  { date: '2024-02-24', title: 'AX1 Meant To Be Tour Prep',           runsPerSession: 4, sessions: 1, venue: 'zmax'     },
      2:  { date: '2024-03-16', title: 'AX2 Negative One Hundred Tread Wear', runsPerSession: 4, sessions: 1, venue: 'zmax'     },
      3:  { date: '2024-04-05', title: 'AX3 To Be Or Not To Be Plinko',       runsPerSession: 3, sessions: 2, venue: 'michelin' },
      4:  { date: '2024-05-18', title: 'AX4',                                 runsPerSession: 3, sessions: 2, venue: 'zmax'     },
      5:  { date: '2024-06-15', title: 'AX5 Put Away The Tire Warmers',       runsPerSession: 4, sessions: 1, venue: 'zmax'     },
      6:  { date: '2024-07-13', title: 'AX6 Half Way Home',                   runsPerSession: 4, sessions: 1, venue: 'zmax'     },
      7:  { date: '2024-08-03', title: 'AX7 The Lincoln Shakedown',           runsPerSession: 4, sessions: 2, venue: 'zmax'     },
      8:  { date: '2024-09-21', title: 'AX8 The Black Lake Day',              runsPerSession: 3, sessions: 2, venue: 'michelin' },
      9:  { date: '2024-10-19', title: 'AX9',                                 runsPerSession: 4, sessions: 1, venue: 'zmax'     },
      10: { date: '2024-11-16', title: 'AX10 Racing For Heroes Tour',         runsPerSession: 4, sessions: 2, venue: 'zmax'     },
    },
    RUN_OVERRIDES: {
      3: [
        { run_number: 1, session: 'a', base_time: 45.774, scored_time: 47.774, cones: 1, dnf: false, rerun: false },
        { run_number: 2, session: 'a', base_time: 45.285, scored_time: 45.285, cones: 0, dnf: false, rerun: false },
        { run_number: 3, session: 'a', base_time: 43.794, scored_time: 43.794, cones: 0, dnf: false, rerun: false },
        { run_number: 4, session: 'b', base_time: 43.983, scored_time: 43.983, cones: 0, dnf: false, rerun: false },
        { run_number: 5, session: 'b', base_time: 42.854, scored_time: 44.854, cones: 1, dnf: false, rerun: false },
        { run_number: 6, session: 'b', base_time: 44.205, scored_time: 44.205, cones: 0, dnf: false, rerun: false },
      ],
      4: [
        { run_number: 1, session: 'a', base_time: 62.906, scored_time: 62.906, cones: 0, dnf: false, rerun: false },
        { run_number: 2, session: 'a', base_time: 60.267, scored_time: 60.267, cones: 0, dnf: false, rerun: false },
        { run_number: 3, session: 'a', base_time: 58.074, scored_time: 58.074, cones: 0, dnf: false, rerun: false },
        { run_number: 4, session: 'b', base_time: 56.107, scored_time: 58.107, cones: 1, dnf: false, rerun: false },
        { run_number: 5, session: 'b', base_time: 55.673, scored_time: 55.673, cones: 0, dnf: false, rerun: false },
        { run_number: 6, session: 'b', base_time: 56.029, scored_time: 56.029, cones: 0, dnf: false, rerun: false },
      ],
      7: [
        { run_number: 1, session: 'a', base_time: 68.355, scored_time: 68.355, cones: 0, dnf: false, rerun: false },
        { run_number: 2, session: 'a', base_time: 68.185, scored_time: 68.185, cones: 0, dnf: false, rerun: false },
        { run_number: 3, session: 'a', base_time: 67.100, scored_time: 67.100, cones: 0, dnf: false, rerun: false },
        { run_number: 4, session: 'a', base_time: 66.529, scored_time: 66.529, cones: 0, dnf: false, rerun: false },
        { run_number: 5, session: 'b', base_time: 67.826, scored_time: 67.826, cones: 0, dnf: false, rerun: false },
        { run_number: 6, session: 'b', base_time: 66.121, scored_time: 66.121, cones: 0, dnf: false, rerun: false },
        { run_number: 7, session: 'b', base_time: 65.751, scored_time: 65.751, cones: 0, dnf: false, rerun: false },
        { run_number: 8, session: 'b', base_time: 65.184, scored_time: 65.184, cones: 0, dnf: false, rerun: false },
      ],
      8: [
        { run_number: 1, session: 'a', base_time: 33.543, scored_time: 33.543, cones: 0, dnf: false, rerun: false },
        { run_number: 2, session: 'a', base_time: 35.756, scored_time: 37.756, cones: 1, dnf: false, rerun: false },
        { run_number: 3, session: 'a', base_time: 32.994, scored_time: 32.994, cones: 0, dnf: false, rerun: false },
        { run_number: 4, session: 'b', base_time: 33.176, scored_time: 33.176, cones: 0, dnf: false, rerun: false },
        { run_number: 5, session: 'b', base_time: 32.210, scored_time: 32.210, cones: 0, dnf: false, rerun: false },
        { run_number: 6, session: 'b', base_time: 32.869, scored_time: 32.869, cones: 0, dnf: false, rerun: false },
      ],
      10: [
        { run_number: 1, session: 'a', base_time: 68.546, scored_time: 70.546, cones: 1, dnf: false, rerun: false },
        { run_number: 2, session: 'a', base_time: 66.789, scored_time: 68.789, cones: 1, dnf: false, rerun: false },
        { run_number: 3, session: 'a', base_time: 65.320, scored_time: 67.320, cones: 1, dnf: false, rerun: false },
        { run_number: 4, session: 'a', base_time: 65.278, scored_time: 65.278, cones: 0, dnf: false, rerun: false },
        { run_number: 5, session: 'b', base_time: null,   scored_time: null,   cones: 0, dnf: true,  rerun: false },
        { run_number: 6, session: 'b', base_time: 68.503, scored_time: 70.503, cones: 1, dnf: false, rerun: false },
        { run_number: 7, session: 'b', base_time: 66.729, scored_time: 68.729, cones: 1, dnf: false, rerun: false },
        { run_number: 8, session: 'b', base_time: 66.412, scored_time: 66.412, cones: 0, dnf: false, rerun: false },
      ],
    },
  },

  // ---- 2025 ----
  {
    year: 2025,
    dataDir: join(__dirname, '../../data/2025'),
    outputFile: join(__dirname, '../src/data/season-2025.json'),
    subject: {
      name: 'Ryan Berg',
      class: 'FS',
      pax_index: 0.817,
      car: '2022 BMW M240i',
      tires: 'Bridgestone',
    },
    EVENT_META: {
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
    },
    RUN_OVERRIDES: {
      5: [
        { run_number: 1, session: 'a', base_time: 40.347, scored_time: 40.347, cones: 0, dnf: false, rerun: false },
        { run_number: 2, session: 'a', base_time: 40.871, scored_time: 40.871, cones: 0, dnf: false, rerun: false },
        { run_number: 3, session: 'a', base_time: 40.198, scored_time: 40.198, cones: 0, dnf: false, rerun: false },
        { run_number: 4, session: 'b', base_time: 39.094, scored_time: 41.094, cones: 1, dnf: false, rerun: false },
        { run_number: 5, session: 'b', base_time: 38.575, scored_time: 38.575, cones: 0, dnf: false, rerun: false },
        { run_number: 6, session: 'b', base_time: 43.840, scored_time: 43.840, cones: 0, dnf: false, rerun: false },
      ],
      7: [
        { run_number: 1, session: 'a', base_time: 40.225, scored_time: 40.225, cones: 0, dnf: false, rerun: false },
        { run_number: 2, session: 'a', base_time: 39.917, scored_time: 39.917, cones: 0, dnf: false, rerun: false },
        { run_number: 3, session: 'a', base_time: 39.361, scored_time: 39.361, cones: 0, dnf: false, rerun: false },
        { run_number: 4, session: 'b', base_time: 40.197, scored_time: 40.197, cones: 0, dnf: false, rerun: false },
        { run_number: 5, session: 'b', base_time: 39.926, scored_time: 39.926, cones: 0, dnf: false, rerun: false },
        { run_number: 6, session: 'b', base_time: 38.962, scored_time: 38.962, cones: 0, dnf: false, rerun: false },
      ],
    },
  },

  // ---- 2026 ----
  {
    year: 2026,
    dataDir: join(__dirname, '../../data/2026'),
    outputFile: join(__dirname, '../src/data/season-2026.json'),
    subject: {
      name: 'Ryan Berg',
      class: 'PST/FS',
      pax_index: 0.817,
      car: '2022 BMW M240i',
      tires: 'Bridgestone',
    },
    EVENT_META: {
      1: { date: '2026-03-07', title: 'AX1 Purple Snow', runsPerSession: 4, sessions: 1, venue: 'zmax' },
    },
    RUN_OVERRIDES: {},
  },
]

// ---- Core processing ----

async function processSeason(config) {
  const { year, dataDir, outputFile, subject, EVENT_META, RUN_OVERRIDES } = config
  console.log(`\n========== Processing ${year} ==========`)

  const eventDirs = readdirSync(dataDir)
    .filter(d => /^Event \d/.test(d))
    .sort()

  const events = []

  for (const dir of eventDirs) {
    const numMatch = dir.match(/Event (\d+)/)
    if (!numMatch) continue
    const eventNum = parseInt(numMatch[1], 10)
    const meta = EVENT_META[eventNum]
    if (!meta) {
      console.log(`  Skipping event ${eventNum} (no metadata)`)
      continue
    }

    const eventDir = join(dataDir, dir)
    const files = readdirSync(eventDir)

    const paxFile     = findPdf(files, PAX_PATTERNS)
    const rawFile     = findPdf(files, RAW_PATTERNS)
    const overallFile = findPdf(files, OVERALL_PATTERNS)

    console.log(`\nEvent ${eventNum} (${dir}):`)
    console.log(`  PAX: ${paxFile || 'NOT FOUND'}`)
    console.log(`  RAW: ${rawFile || 'NOT FOUND'}`)
    console.log(`  OVERALL: ${overallFile || 'NOT FOUND'}`)

    const eventData = {
      id: `${year}-E${String(eventNum).padStart(2, '0')}`,
      season: year,
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

    // --- PAX results ---
    const paxCache = loadPaxCache(eventDir)
    if (paxCache) {
      eventData.pax_results = paxCache
      eventData.total_drivers_pax = paxCache.length
      console.log(`  PAX (cache): ${paxCache.length} drivers`)
      const ryanPax = paxCache.find(d => d.name === RYAN_NAME)
      if (ryanPax) {
        eventData.ryan_attended = true
        console.log(`  Ryan found in PAX: pos=${ryanPax.pos}, indexed=${ryanPax.indexed_time}, pax=${ryanPax.pax_index}`)
      }
    } else if (paxFile) {
      try {
        const paxText = await extractText(join(eventDir, paxFile))
        const paxDrivers = parsePaxResults(paxText)
        eventData.pax_results = paxDrivers
        eventData.total_drivers_pax = paxDrivers.length
        console.log(`  PAX parsed: ${paxDrivers.length} drivers`)
        const ryanPax = paxDrivers.find(d => d.name === RYAN_NAME)
        if (ryanPax) {
          eventData.ryan_attended = true
          console.log(`  Ryan found in PAX: pos=${ryanPax.pos}, indexed=${ryanPax.indexed_time}, pax=${ryanPax.pax_index}`)
        }
      } catch (err) {
        console.error(`  PAX parse error: ${err.message}`)
      }
    }

    // --- RAW results ---
    const rawCache = loadRawCache(eventDir)
    if (rawCache) {
      eventData.raw_results = rawCache
      eventData.total_drivers_raw = rawCache.length
      console.log(`  RAW (cache): ${rawCache.length} drivers`)
    } else if (rawFile) {
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

    let ryanRawTime = null
    let ryanIndexedTime = null
    const ryanPaxEntry = eventData.pax_results.find(d => d.name === RYAN_NAME)
    if (ryanPaxEntry) {
      ryanRawTime = ryanPaxEntry.raw_time
      ryanIndexedTime = ryanPaxEntry.indexed_time
    }

    // --- Car info for all drivers + Ryan's runs (prefer Claude cache) ---
    const finalCache = loadFinalCache(eventDir, RYAN_NAME)
    if (finalCache) {
      // Apply car info from cache
      let carHits = 0
      for (const driver of eventData.pax_results) {
        if (finalCache.carMap.has(driver.name)) {
          driver.car = finalCache.carMap.get(driver.name)
          carHits++
        }
      }
      console.log(`  Car info (cache): ${carHits}/${eventData.pax_results.length} drivers matched`)

      // Ryan's runs from cache
      if (eventData.ryan_attended && finalCache.ryanEntry) {
        let ryanRunData = mapFinalRuns(finalCache.ryanEntry, meta)
        if (ryanRunData) {
          if (RUN_OVERRIDES[eventNum]) {
            ryanRunData.runs = RUN_OVERRIDES[eventNum]
            ryanRunData.best_raw_time = null  // will be recomputed below
            console.log(`  Ryan runs: using manual override for event ${eventNum}`)
          } else {
            console.log(`  Ryan runs (cache): ${ryanRunData.runs.length} runs, best=${ryanRunData.best_raw_time}`)
          }
          if (ryanIndexedTime !== null && ryanRawTime !== null) {
            const derived = computeDerived({
              paxResults: eventData.pax_results,
              rawResults: eventData.raw_results,
              ryanIndexedTime,
              ryanRawTime,
              ryanName: RYAN_NAME,
              ryanClassCode: subject.class,
            })
            eventData.ryan = {
              car_number: ryanPaxEntry?.car_number ?? '',
              class_code: subject.class,
              pax_index: ryanPaxEntry?.pax_index ?? null,
              runs: ryanRunData.runs,
              best_raw_time: ryanRawTime,
              official_indexed_time: ryanIndexedTime,
              ...derived,
            }
          }
        }
      }
    } else if (overallFile) {
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

      if (eventData.ryan_attended) {
        try {
          const overallText = await extractText(join(eventDir, overallFile))
          const ryanRunData = parseRyanRuns(overallText, {
            runsPerSession: meta.runsPerSession,
            sessions: meta.sessions,
          })

          if (ryanRunData) {
            if (RUN_OVERRIDES[eventNum]) {
              ryanRunData.runs = RUN_OVERRIDES[eventNum]
              console.log(`  Ryan runs: using manual override for event ${eventNum}`)
            } else {
              console.log(`  Ryan runs: ${ryanRunData.runs.length} runs, best=${ryanRunData.best_raw_time}`)
            }

            if (ryanIndexedTime !== null && ryanRawTime !== null) {
              const derived = computeDerived({
                paxResults: eventData.pax_results,
                rawResults: eventData.raw_results,
                ryanIndexedTime,
                ryanRawTime,
                ryanName: RYAN_NAME,
                ryanClassCode: subject.class,
              })

              eventData.ryan = {
                car_number: ryanPaxEntry?.car_number ?? '',
                class_code: subject.class,
                pax_index: ryanPaxEntry?.pax_index ?? null,
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
      }
    }

    if (eventData.ryan_attended && !eventData.ryan && ryanIndexedTime !== null) {
      const derived = computeDerived({
        paxResults: eventData.pax_results,
        rawResults: eventData.raw_results,
        ryanIndexedTime,
        ryanRawTime,
        ryanName: RYAN_NAME,
        ryanClassCode: subject.class,
      })
      eventData.ryan = {
        car_number: ryanPaxEntry?.car_number ?? '',
        class_code: subject.class,
        pax_index: ryanPaxEntry?.pax_index ?? null,
        runs: [],
        best_raw_time: ryanRawTime,
        official_indexed_time: ryanIndexedTime,
        ...derived,
      }
    }

    events.push(eventData)
  }

  const output = { season: year, subject, events }
  writeFileSync(outputFile, JSON.stringify(output, null, 2))
  console.log(`\n✓ ${year}: Written to ${outputFile}`)
  console.log(`  ${events.length} events, ${events.filter(e => e.ryan_attended).length} attended by Ryan`)
}

async function main() {
  for (const config of SEASONS) {
    await processSeason(config)
  }
  console.log('\n✓ All seasons complete.')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
