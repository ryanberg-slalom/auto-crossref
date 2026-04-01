import { useMemo } from 'react'
import pinnedConfig from '../data/pinned-peers.json'

const PINNED_NAMES = new Set(pinnedConfig.pinned)
const CAR_FILTERS = pinnedConfig.carFilters ?? {}
const MIN_SHARED_EVENTS = 10
const AUTO_PEER_CAP = 5
// H2H balance: only include drivers where Ryan's win rate is in this range.
// Excludes drivers Ryan always beats (not a peer) and who always beat Ryan (not a peer).
const H2H_MIN = 0.25
const H2H_MAX = 0.75

/**
 * Auto-detects similar drivers from pax_results across attended events,
 * and always includes manually pinned drivers from pinned-peers.json.
 *
 * Returns:
 *   peers      — array of peer metadata for the summary table
 *   chartData  — per-event data shaped for Recharts LineChart
 */
export function usePeerDrivers(events) {
  return useMemo(() => {
    if (!events || events.length === 0) return { peers: [], chartData: [] }

    // Pre-build Ryan's percentile by event for efficient lookup
    const ryanPercentileByEvent = {}
    events.forEach(e => { ryanPercentileByEvent[e.id] = e.ryan?.pax_percentile ?? null })

    // Build a map of driver name -> per-event data across all filtered events
    const driverMap = new Map() // name -> [{ eventId, percentile, indexedTime, deltaSeconds }]

    for (const event of events) {
      const total = event.total_drivers_pax
      if (!total || !event.pax_results?.length) continue
      const ryanIndexed = event.ryan?.official_indexed_time
      if (ryanIndexed == null) continue

      for (const entry of event.pax_results) {
        if (!entry.name || entry.pos == null || entry.indexed_time == null || entry.indexed_time <= 0) continue
        // Guard against corrupted pax_results entries (e.g. misparsed DNF/penalty raw times)
        if (entry.indexed_time > ryanIndexed * 3) continue
        // Per-driver car filter (e.g. exclude events when driver switched equipment)
        const carFilter = CAR_FILTERS[entry.name]
        if (carFilter && entry.car !== carFilter) continue
        const percentile = parseFloat((((total - entry.pos) / total) * 100).toFixed(1))
        const deltaSeconds = parseFloat((ryanIndexed - entry.indexed_time).toFixed(3))

        if (!driverMap.has(entry.name)) driverMap.set(entry.name, [])
        driverMap.get(entry.name).push({
          eventId: event.id,
          percentile,
          indexedTime: entry.indexed_time,
          deltaSeconds,
          classCode: entry.class_code ?? null,
          car: entry.car ?? null,
        })
      }
    }

    // Pinned drivers — always included (in config order), regardless of filters
    const pinnedPeers = pinnedConfig.pinned.map(name => ({
      name,
      isPinned: true,
      notFound: !driverMap.has(name),
      sharedEvents: driverMap.get(name) ?? [],
    }))

    // Auto-detected peers: score all candidates, filter, rank, cap
    const autoCandidates = []
    for (const [name, sharedEvents] of driverMap) {
      if (PINNED_NAMES.has(name)) continue
      if (sharedEvents.length < MIN_SHARED_EVENTS) continue

      // H2H balance: negative deltaSeconds = Ryan faster = Ryan won
      const h2hWins = sharedEvents.filter(se => se.deltaSeconds < 0).length
      const h2hRate = h2hWins / sharedEvents.length
      if (h2hRate < H2H_MIN || h2hRate > H2H_MAX) continue

      // Median absolute percentile delta (event-by-event closeness to Ryan)
      const diffs = sharedEvents
        .map(se => Math.abs(se.percentile - (ryanPercentileByEvent[se.eventId] ?? 0)))
        .sort((a, b) => a - b)
      const medianDelta = diffs[Math.floor(diffs.length / 2)]

      autoCandidates.push({ name, isPinned: false, notFound: false, sharedEvents, medianDelta })
    }

    autoCandidates.sort((a, b) => a.medianDelta - b.medianDelta)
    const autoPeers = autoCandidates.slice(0, AUTO_PEER_CAP)

    const allPeers = [...pinnedPeers, ...autoPeers]

    // Compute display stats for each peer
    const peersWithStats = allPeers.map(peer => {
      const { sharedEvents } = peer
      if (!sharedEvents.length) {
        return { ...peer, avgPercentile: null, ryanAvgPercentile: null, avgDelta: null, h2hWins: 0 }
      }
      const avgPercentile = parseFloat(
        (sharedEvents.reduce((s, e) => s + e.percentile, 0) / sharedEvents.length).toFixed(1)
      )
      const ryanPctsAtShared = sharedEvents.map(se => ryanPercentileByEvent[se.eventId] ?? 0)
      const ryanAvgPercentile = parseFloat(
        (ryanPctsAtShared.reduce((s, v) => s + v, 0) / ryanPctsAtShared.length).toFixed(1)
      )
      const avgDelta = parseFloat(
        (sharedEvents.reduce((s, e) => s + e.deltaSeconds, 0) / sharedEvents.length).toFixed(3)
      )
      const h2hWins = sharedEvents.filter(e => e.deltaSeconds < 0).length
      // Collect unique classes and cars seen across shared events
      const classes = [...new Set(sharedEvents.map(se => se.classCode).filter(Boolean))]
      const cars = [...new Set(sharedEvents.map(se => se.car).filter(Boolean))]
      return { ...peer, avgPercentile, ryanAvgPercentile, avgDelta, h2hWins, classes, cars }
    })

    // Build per-event lookup maps for each peer
    const peerEventMaps = peersWithStats.map(peer => {
      const m = new Map()
      peer.sharedEvents.forEach(se => m.set(se.eventId, { percentile: se.percentile, indexedTime: se.indexedTime }))
      return m
    })

    // One chart point per event; include indexed times for raw gap computation in tooltip
    const chartData = events.map(event => {
      const point = {
        id: event.id,
        ryan: event.ryan?.pax_percentile ?? null,
        ryanIndexed: event.ryan?.official_indexed_time ?? null,
        ryanPaxIndex: event.ryan?.pax_index ?? null,
      }
      peersWithStats.forEach((peer, idx) => {
        const data = peerEventMaps[idx].get(event.id)
        point[peer.name] = data?.percentile ?? null
        point[`${peer.name}_ix`] = data?.indexedTime ?? null
      })
      return point
    })

    return { peers: peersWithStats, chartData }
  }, [events])
}
