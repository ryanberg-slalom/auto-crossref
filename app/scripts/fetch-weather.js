/**
 * Weather enrichment script — fetches historical weather for each event
 * from the Open-Meteo Historical Archive API and writes it to season JSON files.
 *
 * Usage: node scripts/fetch-weather.js
 *
 * Idempotent: skips events where weather is already populated.
 * For ZMAX 2-day dual-run events, fetches both Day 1 and Day 2.
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const VENUES = {
  zmax:     { lat: 35.3783, lon: -80.7027 },
  michelin: { lat: 34.5035, lon: -81.9973 },
}

// Returns a Map<dateStr, { maxF, minF, precip }> for the given date range
async function fetchDailyWeather(lat, lon, startDate, endDate) {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum')
  url.searchParams.set('temperature_unit', 'fahrenheit')
  url.searchParams.set('precipitation_unit', 'inch')
  url.searchParams.set('timezone', 'America/New_York')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  const json = await res.json()

  const map = new Map()
  const { time, temperature_2m_max, temperature_2m_min, precipitation_sum } = json.daily
  for (let i = 0; i < time.length; i++) {
    map.set(time[i], {
      maxF:   temperature_2m_max[i] != null ? Math.round(temperature_2m_max[i]) : null,
      minF:   temperature_2m_min[i] != null ? Math.round(temperature_2m_min[i]) : null,
      precip: precipitation_sum[i] ?? 0,
    })
  }
  return map
}

// Advances a YYYY-MM-DD string by one calendar day
function getDay2Date(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function buildWeatherObject(day1, day2 = null) {
  const w = {
    temp_min_f:       day1.minF,
    temp_max_f:       day1.maxF,
    precipitation_in: Number(day1.precip.toFixed(2)),
  }
  if (day2) {
    w.day2_temp_min_f       = day2.minF
    w.day2_temp_max_f       = day2.maxF
    w.day2_precipitation_in = Number(day2.precip.toFixed(2))
  }
  return w
}

async function processFile(filePath) {
  const raw = JSON.parse(readFileSync(filePath, 'utf8'))
  let changed = false

  for (const event of raw.events) {
    // Idempotency: skip already-populated events
    if (event.weather != null) {
      console.log(`  ${event.id}: already has weather, skipping`)
      continue
    }

    const venue = VENUES[event.venue]
    if (!venue) {
      console.warn(`  ${event.id}: unknown venue "${event.venue}", skipping`)
      continue
    }

    const isZmaxDual = event.venue === 'zmax' && event.scoring_type === 'dual_run'
    const day1Date = event.date
    const day2Date = isZmaxDual ? getDay2Date(day1Date) : day1Date

    console.log(`  ${event.id}: fetching ${day1Date}${isZmaxDual ? ' + ' + day2Date : ''}...`)

    try {
      const weatherMap = await fetchDailyWeather(venue.lat, venue.lon, day1Date, day2Date)
      const day1 = weatherMap.get(day1Date)
      const day2 = isZmaxDual ? weatherMap.get(day2Date) : null

      if (!day1 || day1.maxF == null) {
        console.warn(`  ${event.id}: no data returned for ${day1Date} (future event?)`)
        continue
      }

      event.weather = buildWeatherObject(day1, day2 ?? null)
      changed = true
      console.log(`  ${event.id}: ${JSON.stringify(event.weather)}`)
    } catch (err) {
      console.error(`  ${event.id}: ERROR — ${err.message}`)
      // Leave weather as null; script is re-runnable
    }

    // Be a polite API citizen
    await new Promise(r => setTimeout(r, 300))
  }

  if (changed) {
    writeFileSync(filePath, JSON.stringify(raw, null, 2))
    console.log(`  Written: ${filePath}`)
  } else {
    console.log(`  No changes needed.`)
  }
}

async function main() {
  const dataDir = join(__dirname, '../src/data')
  const files = readdirSync(dataDir)
    .filter(f => /^season-\d{4}\.json$/.test(f))
    .sort()

  for (const file of files) {
    console.log(`\nProcessing ${file}...`)
    await processFile(join(dataDir, file))
  }

  console.log('\nDone.')
}

main().catch(err => { console.error(err); process.exit(1) })
