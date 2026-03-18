export default function PositionCard({ title, rank, total, time, timeLabel, gapSeconds, gapPct, percentile }) {
  const barWidth = rank && total ? Math.max(4, Math.round((rank / total) * 100)) : 0

  return (
    <div className="p-5 flex flex-col gap-3 rounded-lg bg-surface-2 border border-border">
      <span className="text-xs font-extrabold uppercase tracking-wider text-fg-subtle">
        {title}
      </span>

      {rank ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-fg">
              #{rank}
            </span>
            <span className="text-sm text-fg-muted">
              of {total}
            </span>
          </div>

          <div className="h-1.5 rounded-full overflow-hidden bg-surface-3">
            <div
              className="h-full rounded-full bg-fg opacity-70"
              style={{ width: `${barWidth}%` }}
            />
          </div>

          <div className="flex flex-col gap-1">
            {time && (
              <div className="flex justify-between text-xs">
                <span className="text-fg-subtle">{timeLabel}</span>
                <span className="tabular-nums font-medium text-fg">{time}s</span>
              </div>
            )}
            {gapSeconds !== null && gapSeconds !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-fg-subtle">Gap to leader</span>
                <span className="tabular-nums text-fg-muted">
                  +{gapSeconds}s ({gapPct}%)
                </span>
              </div>
            )}
            {percentile !== null && percentile !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-fg-subtle">Percentile</span>
                <span className="tabular-nums text-fg">{percentile}%</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-sm text-fg-subtle">No data</div>
      )}
    </div>
  )
}
