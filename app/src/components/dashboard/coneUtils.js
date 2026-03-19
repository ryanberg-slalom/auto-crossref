/**
 * Shared cone data utilities for dashboard cone tracker components.
 */

/**
 * Computes summary cone stats across all attended events (run-based streaks).
 * @param {Array} attendedEvents - sorted chronologically
 */
export function computeConeStats(attendedEvents) {
  const eventsWithRuns = attendedEvents.filter(e => e.ryan?.runs?.length)

  // Flatten all non-rerun runs in chronological order
  const allRuns = eventsWithRuns.flatMap(e =>
    e.ryan.runs
      .filter(r => !r.rerun)
      .map(r => ({ ...r, event: e }))
  )

  const totalCones = allRuns.reduce((s, r) => s + (r.cones || 0), 0)

  const totalConedRuns = allRuns.filter(r => r.cones > 0).length
  const avgConedRunsPerEvent = eventsWithRuns.length
    ? totalConedRuns / eventsWithRuns.length
    : 0

  // Worst event by total cones
  let worstEvent = null
  let worstCones = 0
  for (const e of eventsWithRuns) {
    const cones = e.ryan.runs.filter(r => !r.rerun).reduce((s, r) => s + (r.cones || 0), 0)
    if (cones > worstCones) {
      worstCones = cones
      worstEvent = e
    }
  }

  // Run-based streak: clean = no cones AND no DNF
  let longestStreak = 0
  let cur = 0
  let lastConeRun = null

  for (const run of allRuns) {
    if (run.cones === 0 && !run.dnf) {
      cur++
      if (cur > longestStreak) longestStreak = cur
    } else {
      lastConeRun = run
      cur = 0
    }
  }
  const currentStreak = cur

  return {
    totalCones,
    avgConedRunsPerEvent,
    worstEvent,
    worstCones,
    longestStreak,
    currentStreak,
    lastConeRun,
  }
}

/**
 * Returns per-event cone breakdown for chart components.
 */
export function coneChartData(attendedEvents) {
  return attendedEvents
    .filter(e => e.ryan?.runs?.length)
    .map((e, i) => {
      const runs = e.ryan.runs.filter(r => !r.rerun)
      const cleanRuns = runs.filter(r => r.cones === 0 && !r.dnf).length
      const conedRuns = runs.filter(r => r.cones > 0).length
      const dnfRuns = runs.filter(r => r.dnf).length
      const totalCones = runs.reduce((s, r) => s + (r.cones || 0), 0)
      return {
        i,
        id: e.id,
        tick: `#${e.event_number}`,
        label: `${e.season} Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        venue: e.venue,
        totalCones,
        cleanRuns,
        conedRuns,
        dnfRuns,
        totalRuns: runs.length,
      }
    })
}
