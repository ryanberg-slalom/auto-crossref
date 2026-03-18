export default function PstCard({ indexedTime, pstRank, pstTotal, pstPercentile }) {
  const barWidth = pstRank && pstTotal ? Math.max(4, Math.round((pstRank / pstTotal) * 100)) : 0

  return (
    <div className="p-5 flex flex-col gap-3 rounded-lg bg-surface-2 border border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-wider text-fg-subtle">
          Hypothetical PST
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-surface-3 text-fg-subtle border border-border">
          if you ran PST
        </span>
      </div>

      {pstRank ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-fg">
              #{pstRank}
            </span>
            <span className="text-sm text-fg-muted">
              of {pstTotal}
            </span>
          </div>

          <div className="h-1.5 rounded-full overflow-hidden bg-surface-3">
            <div
              className="h-full rounded-full bg-fg-muted opacity-50"
              style={{ width: `${barWidth}%` }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-fg-subtle">Your indexed time</span>
              <span className="tabular-nums font-medium text-fg">{Number(indexedTime).toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-fg-subtle">Beat</span>
              <span className="tabular-nums text-fg-muted">{pstPercentile}% of PST field</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-fg-subtle">No PST drivers this event</div>
      )}
    </div>
  )
}
