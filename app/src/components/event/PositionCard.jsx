export default function PositionCard({ title, rank, total, time, timeLabel, gapSeconds, gapPct, percentile }) {
  const pct = rank > 0 && total > 0 ? Math.round((rank / total) * 100) : null
  const barWidth = rank && total ? Math.max(4, Math.round((rank / total) * 100)) : 0

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <span
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        {title}
      </span>

      {rank ? (
        <>
          {/* Rank */}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight" style={{ color: 'var(--color-bmw-blue)' }}>
              #{rank}
            </span>
            <span className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
              of {total}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-3)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${barWidth}%`,
                backgroundColor: 'var(--color-bmw-blue)',
                opacity: 0.7,
              }}
            />
          </div>

          {/* Time and gap */}
          <div className="flex flex-col gap-1">
            {time && (
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-fg-subtle)' }}>{timeLabel}</span>
                <span className="tabular-nums font-medium" style={{ color: 'var(--color-fg)' }}>{time}s</span>
              </div>
            )}
            {gapSeconds !== null && gapSeconds !== undefined && (
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-fg-subtle)' }}>Gap to leader</span>
                <span className="tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>
                  +{gapSeconds}s ({gapPct}%)
                </span>
              </div>
            )}
            {percentile !== null && percentile !== undefined && (
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-fg-subtle)' }}>Percentile</span>
                <span className="tabular-nums" style={{ color: 'var(--color-fg)' }}>{percentile}%</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-sm" style={{ color: 'var(--color-fg-subtle)' }}>No data</div>
      )}
    </div>
  )
}
