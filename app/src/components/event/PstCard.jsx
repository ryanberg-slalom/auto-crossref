export default function PstCard({ indexedTime, pstRank, pstTotal, pstPercentile }) {
  const barWidth = pstRank && pstTotal ? Math.max(4, Math.round((pstRank / pstTotal) * 100)) : 0

  return (
    <div
      className="p-5 flex flex-col gap-3"
      style={{ borderRadius: 'var(--radius-lg)' }}
      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          Hypothetical PST
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ backgroundColor: 'var(--color-surface-3)', color: 'var(--color-fg-subtle)', border: '1px solid var(--color-border)' }}
        >
          if you ran PST
        </span>
      </div>

      {pstRank ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight" style={{ color: 'var(--color-fg)' }}>
              #{pstRank}
            </span>
            <span className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
              of {pstTotal}
            </span>
          </div>

          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-3)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${barWidth}%`, backgroundColor: 'var(--color-fg-muted)', opacity: 0.5 }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-fg-subtle)' }}>Your indexed time</span>
              <span className="tabular-nums font-medium" style={{ color: 'var(--color-fg)' }}>{indexedTime}s</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-fg-subtle)' }}>Beat</span>
              <span className="tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>{pstPercentile}% of PST field</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm" style={{ color: 'var(--color-fg-subtle)' }}>No PST drivers this event</div>
      )}
    </div>
  )
}
