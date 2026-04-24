import { useMemo } from 'react'

const FS_PAX_MIN = 0.810
const FS_PAX_MAX = 0.820
const YEAR_MIN = 2015
const HIGH_SPEC_RE = /shelby|gt500|gt350|mach|dark horse/i

function isQualifyingMustang(driver) {
  const car = driver.car ?? ''
  if (!car.toLowerCase().includes('mustang')) return false
  const yearMatch = car.match(/\b(20\d\d)\b/)
  const year = yearMatch ? parseInt(yearMatch[1]) : null
  if (year !== null && year < YEAR_MIN) return false
  const isFs = driver.class_code === 'FS'
  const isPst = driver.class_code?.toUpperCase().startsWith('PST')
  if (!isFs && !isPst) return false
  if (isPst && !(driver.pax_index >= FS_PAX_MIN && driver.pax_index <= FS_PAX_MAX)) return false
  return true
}

export function useMustangDrivers(events) {
  return useMemo(() => {
    if (!events?.length) return { drivers: [], chartData: [] }

    const driverMap = new Map()

    for (const event of events) {
      const total = event.total_drivers_pax
      if (!total || !event.pax_results?.length) continue
      const ryanIndexed = event.ryan?.official_indexed_time
      if (ryanIndexed == null) continue

      for (const entry of event.pax_results) {
        if (!isQualifyingMustang(entry)) continue
        if (!entry.indexed_time || entry.indexed_time <= 0 || entry.pos == null) continue

        const percentile = parseFloat((((total - entry.pos) / total) * 100).toFixed(1))
        const divisor = event.scoring_type === 'dual_run' ? 2 : 1
        const deltaSeconds = parseFloat(((ryanIndexed - entry.indexed_time) / divisor).toFixed(3))

        if (!driverMap.has(entry.name)) {
          driverMap.set(entry.name, {
            name: entry.name,
            car: entry.car ?? '',
            isHighSpec: HIGH_SPEC_RE.test(entry.car ?? ''),
            sharedEvents: [],
          })
        }
        driverMap.get(entry.name).sharedEvents.push({
          eventId: event.id,
          percentile,
          indexedTime: entry.indexed_time,
          deltaSeconds,
        })
      }
    }

    const drivers = [...driverMap.values()]
      .map(d => {
        const { sharedEvents } = d
        const avgDelta = parseFloat(
          (sharedEvents.reduce((s, e) => s + e.deltaSeconds, 0) / sharedEvents.length).toFixed(3)
        )
        const h2hWins = sharedEvents.filter(e => e.deltaSeconds < 0).length
        return { ...d, avgDelta, h2hWins }
      })
      .sort((a, b) => b.sharedEvents.length - a.sharedEvents.length)

    // Per-driver event lookup maps
    const driverEventMaps = new Map()
    drivers.forEach(d => {
      const m = new Map()
      d.sharedEvents.forEach(se => m.set(se.eventId, { percentile: se.percentile, indexedTime: se.indexedTime }))
      driverEventMaps.set(d.name, m)
    })

    const chartData = events.map(event => {
      const point = {
        id: event.id,
        ryan: event.ryan?.pax_percentile ?? null,
        ryanIndexed: event.ryan?.official_indexed_time ?? null,
        ryanPaxIndex: event.ryan?.pax_index ?? null,
        bestMustang: null,
        bestMustangIndexed: null,
      }

      drivers.forEach(d => {
        const data = driverEventMaps.get(d.name)?.get(event.id)
        point[d.name] = data?.percentile ?? null
        point[`${d.name}_ix`] = data?.indexedTime ?? null
        // Best Mustang = highest percentile (fastest relative to full field)
        if (data && (point.bestMustang === null || data.percentile > point.bestMustang)) {
          point.bestMustang = data.percentile
          point.bestMustangIndexed = data.indexedTime
        }
      })

      return point
    })

    return { drivers, chartData }
  }, [events])
}
