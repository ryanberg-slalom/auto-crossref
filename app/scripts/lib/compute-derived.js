/**
 * Computes all derived fields for Ryan's entry at each event.
 * Requires the full pax_results and raw_results arrays (novices already excluded).
 */

/**
 * @param {object} params
 * @param {Array} params.paxResults - full PAX field [{name, class_code, raw_time, pax_index, indexed_time}]
 * @param {Array} params.rawResults - full RAW field [{name, class_code, raw_time}]
 * @param {number} params.ryanIndexedTime - Ryan's official indexed time for this event
 * @param {number} params.ryanRawTime - Ryan's best raw time for this event
 * @param {string} params.ryanName - "Ryan Berg"
 * @returns {object} derived metrics for Ryan's event entry
 */
export function computeDerived({ paxResults, rawResults, ryanIndexedTime, ryanRawTime, ryanName = 'Ryan Berg' }) {
  // --- PAX ranking ---
  // Sort by indexed_time ascending
  const sortedPax = [...paxResults].sort((a, b) => a.indexed_time - b.indexed_time)
  const paxRank = sortedPax.findIndex(d => d.name === ryanName) + 1
  const paxTotal = sortedPax.length
  const paxLeaderTime = sortedPax[0]?.indexed_time ?? null
  const paxGapSeconds = paxLeaderTime !== null
    ? parseFloat((ryanIndexedTime - paxLeaderTime).toFixed(3))
    : null
  const paxGapPct = paxLeaderTime
    ? parseFloat(((paxGapSeconds / paxLeaderTime) * 100).toFixed(2))
    : null
  // Percentile = % of field Ryan beats
  const paxPercentile = paxRank > 0
    ? parseFloat((((paxTotal - paxRank) / paxTotal) * 100).toFixed(1))
    : null

  // --- RAW ranking ---
  const sortedRaw = [...rawResults].sort((a, b) => a.raw_time - b.raw_time)
  const rawRank = sortedRaw.findIndex(d => d.name === ryanName) + 1
  const rawTotal = sortedRaw.length
  const rawLeaderTime = sortedRaw[0]?.raw_time ?? null
  const rawGapSeconds = rawLeaderTime !== null
    ? parseFloat((ryanRawTime - rawLeaderTime).toFixed(3))
    : null
  const rawGapPct = rawLeaderTime
    ? parseFloat(((rawGapSeconds / rawLeaderTime) * 100).toFixed(2))
    : null

  // --- Hypothetical PST ranking ---
  // PST drivers have class_code starting with "PST"
  // Their indexed_time from PAX results IS their competitive PST time
  // Ryan's PST time = ryanIndexedTime (same as his official indexed time)
  const pstDrivers = paxResults.filter(d => d.class_code.toUpperCase().startsWith('PST'))
  const pstSorted = [...pstDrivers].sort((a, b) => a.indexed_time - b.indexed_time)

  // Add Ryan's hypothetical entry and re-sort
  const ryanPstEntry = { name: ryanName, indexed_time: ryanIndexedTime }
  const pstWithRyan = [...pstSorted, ryanPstEntry].sort((a, b) => a.indexed_time - b.indexed_time)
  const pstRank = pstWithRyan.findIndex(d => d.name === ryanName) + 1
  const pstTotal = pstWithRyan.length

  // PST percentile (% of PST field Ryan would beat)
  const pstPercentile = parseFloat((((pstTotal - pstRank) / pstTotal) * 100).toFixed(1))

  // --- FS class results ---
  const fsDrivers = paxResults.filter(d => d.class_code === 'FS')
  const fsSorted = [...fsDrivers].sort((a, b) => a.indexed_time - b.indexed_time)
  const fsRank = fsSorted.findIndex(d => d.name === ryanName) + 1
  const fsTotal = fsSorted.length

  return {
    // PAX
    pax_rank: paxRank || null,
    pax_total: paxTotal,
    pax_percentile: paxPercentile,
    pax_leader_time: paxLeaderTime,
    pax_gap_seconds: paxGapSeconds,
    pax_gap_pct: paxGapPct,

    // RAW
    raw_rank: rawRank || null,
    raw_total: rawTotal,
    raw_leader_time: rawLeaderTime,
    raw_gap_seconds: rawGapSeconds,
    raw_gap_pct: rawGapPct,

    // Hypothetical PST
    hypothetical_pst_indexed_time: ryanIndexedTime,
    hypothetical_pst_rank: pstRank || null,
    hypothetical_pst_total: pstTotal,
    hypothetical_pst_percentile: pstPercentile,

    // FS class
    fs_class_rank: fsRank || null,
    fs_class_total: fsTotal,
  }
}
