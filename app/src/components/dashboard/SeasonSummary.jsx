import StatCard from '../shared/StatCard'

export default function SeasonSummary({ attendedEvents }) {
  const attended = attendedEvents.length
  const bestRank = Math.min(...attendedEvents.map(e => e.ryan.pax_rank))
  const bestPercentile = Math.max(...attendedEvents.map(e => e.ryan.pax_percentile))
  // Best indexed time: single-course events only (dual-run times are sums, not comparable)
  const singleEvents = attendedEvents.filter(e => e.scoring_type === 'single')
  const bestIndexed = singleEvents.length
    ? Math.min(...singleEvents.map(e => e.ryan.official_indexed_time))
    : null
  const bestGapPct = Math.min(...attendedEvents.filter(e => e.ryan.pax_gap_pct !== null).map(e => e.ryan.pax_gap_pct))
  const pstEvents = attendedEvents.filter(e => e.ryan.hypothetical_pst_rank !== null)
  const bestPstRank = pstEvents.length ? Math.min(...pstEvents.map(e => e.ryan.hypothetical_pst_rank)) : null
  const bestPstEvent = pstEvents.find(e => e.ryan.hypothetical_pst_rank === bestPstRank)

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCard
        label="Events Attended"
        value={`${attended}/10`}
        sub="2025 season"
      />
      <StatCard
        label="Best PAX Rank"
        value={`#${bestRank}`}
        sub={`of ${attendedEvents.find(e => e.ryan.pax_rank === bestRank)?.ryan?.pax_total} drivers`}
      />
      <StatCard
        label="Best Percentile"
        value={`${bestPercentile}%`}
        sub="of field beaten"
      />
      <StatCard
        label="Closest to Leader"
        value={`${bestGapPct}%`}
        sub="gap to PAX leader"
      />
      {bestPstRank !== null && (
        <StatCard
          label="Best PST Rank"
          value={`#${bestPstRank}`}
          sub={`of ${bestPstEvent?.ryan?.hypothetical_pst_total} PST drivers`}
        />
      )}
    </div>
  )
}
