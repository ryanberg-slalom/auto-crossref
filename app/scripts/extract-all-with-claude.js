/**
 * Extracts autocross results from all event PDFs using the Claude API.
 * Saves extracted data as JSON cache files alongside the PDFs.
 *
 * Usage:
 *   node scripts/extract-all-with-claude.js              # process all events
 *   node scripts/extract-all-with-claude.js --year 2026  # specific year
 *   node scripts/extract-all-with-claude.js --event 2026-E01  # specific event
 *   node scripts/extract-all-with-claude.js --force       # re-extract even if cached
 *   node scripts/extract-all-with-claude.js --pax-only    # only PAX PDFs
 *   node scripts/extract-all-with-claude.js --final-only  # only FINAL PDFs
 *
 * Cache files written per event directory:
 *   pax-extracted.json    — ranked list from PAX PDF
 *   raw-extracted.json    — ranked list from RAW PDF
 *   final-extracted.json  — per-class entries with runs from FINAL PDF
 */

import { readdirSync, existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import {
  extractPaxResults,
  extractRawResults,
  extractFinalResults,
} from './lib/claude-pdf-extractor.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = join(__dirname, '../../data')

const PAX_PATTERNS     = ['pax', 'PAX', 'indexed', 'Indexed', 'INDEX', 'paxresults']
const RAW_PATTERNS     = ['raw', 'RAW', 'Raw']
const OVERALL_PATTERNS = ['overall', 'OVERALL', 'Overall', 'FINAL', 'Final', 'final']

// Parse CLI args
const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const PAX_ONLY = args.includes('--pax-only')
const FINAL_ONLY = args.includes('--final-only')
const RAW_ONLY = args.includes('--raw-only')
const yearArg = args.find(a => a.startsWith('--year=') || a === '--year')
const eventArg = args.find(a => a.startsWith('--event=') || a === '--event')

const TARGET_YEAR = yearArg
  ? parseInt((yearArg.includes('=') ? yearArg.split('=')[1] : args[args.indexOf(yearArg) + 1]), 10)
  : null
const TARGET_EVENT = eventArg
  ? (eventArg.includes('=') ? eventArg.split('=')[1] : args[args.indexOf(eventArg) + 1])
  : null

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

async function processEvent(eventDir, eventId) {
  const files = readdirSync(eventDir)

  const paxFile     = findPdf(files, PAX_PATTERNS)
  const rawFile     = findPdf(files, RAW_PATTERNS)
  const overallFile = findPdf(files, OVERALL_PATTERNS)

  const shouldDoPax   = !FINAL_ONLY && !RAW_ONLY
  const shouldDoRaw   = !FINAL_ONLY && !PAX_ONLY
  const shouldDoFinal = !PAX_ONLY && !RAW_ONLY

  // ---- PAX ----
  if (shouldDoPax && paxFile) {
    const cachePath = join(eventDir, 'pax-extracted.json')
    if (FORCE || !existsSync(cachePath)) {
      console.log(`  Extracting PAX: ${paxFile}`)
      try {
        const data = await extractPaxResults(join(eventDir, paxFile))
        writeFileSync(cachePath, JSON.stringify(data, null, 2))
        console.log(`  ✓ PAX: ${data.length} drivers → pax-extracted.json`)
      } catch (err) {
        console.error(`  ✗ PAX extraction failed: ${err.message}`)
      }
    } else {
      console.log(`  ↩ PAX: cached (pax-extracted.json)`)
    }
  } else if (shouldDoPax && !paxFile) {
    console.log(`  ⚠ PAX: no PDF found`)
  }

  // ---- RAW ----
  if (shouldDoRaw && rawFile) {
    const cachePath = join(eventDir, 'raw-extracted.json')
    if (FORCE || !existsSync(cachePath)) {
      console.log(`  Extracting RAW: ${rawFile}`)
      try {
        const data = await extractRawResults(join(eventDir, rawFile))
        writeFileSync(cachePath, JSON.stringify(data, null, 2))
        console.log(`  ✓ RAW: ${data.length} drivers → raw-extracted.json`)
      } catch (err) {
        console.error(`  ✗ RAW extraction failed: ${err.message}`)
      }
    } else {
      console.log(`  ↩ RAW: cached (raw-extracted.json)`)
    }
  } else if (shouldDoRaw && !rawFile) {
    console.log(`  ⚠ RAW: no PDF found`)
  }

  // ---- FINAL ----
  if (shouldDoFinal && overallFile) {
    const cachePath = join(eventDir, 'final-extracted.json')
    if (FORCE || !existsSync(cachePath)) {
      console.log(`  Extracting FINAL: ${overallFile}`)
      try {
        const data = await extractFinalResults(join(eventDir, overallFile))
        writeFileSync(cachePath, JSON.stringify(data, null, 2))
        const ryanRuns = data.ryan?.runs?.length ?? 0
        const carCount = data.cars?.length ?? 0
        console.log(`  ✓ FINAL: Ryan ${ryanRuns} runs, ${carCount} cars → final-extracted.json`)
      } catch (err) {
        console.error(`  ✗ FINAL extraction failed: ${err.message}`)
      }
    } else {
      console.log(`  ↩ FINAL: cached (final-extracted.json)`)
    }
  } else if (shouldDoFinal && !overallFile) {
    console.log(`  ⚠ FINAL: no PDF found`)
  }
}

async function main() {
  const years = readdirSync(DATA_ROOT)
    .filter(d => /^\d{4}$/.test(d))
    .sort()

  let totalEvents = 0
  let processed = 0

  for (const year of years) {
    if (TARGET_YEAR && parseInt(year, 10) !== TARGET_YEAR) continue

    const yearDir = join(DATA_ROOT, year)
    const eventDirs = readdirSync(yearDir)
      .filter(d => /^Event \d/.test(d))
      .sort()

    for (const eventDirName of eventDirs) {
      const numMatch = eventDirName.match(/Event (\d+)/)
      if (!numMatch) continue
      const eventNum = parseInt(numMatch[1], 10)
      const eventId = `${year}-E${String(eventNum).padStart(2, '0')}`

      if (TARGET_EVENT && eventId !== TARGET_EVENT) continue

      totalEvents++
      console.log(`\n[${eventId}] ${eventDirName}`)

      const eventDir = join(yearDir, eventDirName)
      await processEvent(eventDir, eventId)
      processed++
    }
  }

  console.log(`\n✓ Done. Processed ${processed}/${totalEvents} events.`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
