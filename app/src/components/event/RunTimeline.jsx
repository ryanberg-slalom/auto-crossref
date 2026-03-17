export default function RunTimeline({ runs, scoringType, bestRawTime }) {
  if (!runs || runs.length === 0) {
    return (
      <div
        className="rounded-xl p-5 text-xs"
        style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-fg-subtle)' }}
      >
        No run data available
      </div>
    )
  }

  const isDualRun = scoringType === 'dual_run'
  const sessions = isDualRun ? ['a', 'b'] : ['a']

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-fg)' }}>
        Run Times
      </h3>
      <div className={isDualRun ? 'grid grid-cols-2 gap-6' : 'flex flex-col gap-2'}>
        {sessions.map(session => {
          const sessionRuns = runs.filter(r => r.session === session)
          const sessionLabel = isDualRun ? (session === 'a' ? 'AM Session' : 'PM Session') : null
          const sessionBest = isDualRun
            ? Math.min(...sessionRuns.filter(r => !r.dnf && r.scored_time !== null).map(r => r.scored_time))
            : null

          return (
            <div key={session}>
              {sessionLabel && (
                <div
                  className="text-xs font-medium uppercase tracking-wider mb-2"
                  style={{ color: 'var(--color-fg-subtle)' }}
                >
                  {sessionLabel}
                  {sessionBest && (
                    <span className="ml-2 normal-case" style={{ color: 'var(--color-fg-muted)' }}>
                      best {sessionBest}s
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                {sessionRuns.map(run => (
                  <RunRow key={run.run_number} run={run} bestRawTime={bestRawTime} isDualRun={isDualRun} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {!isDualRun && (
        <div
          className="mt-3 pt-3 flex justify-between text-xs"
          style={{ borderTop: '1px solid var(--color-border-subtle)' }}
        >
          <span style={{ color: 'var(--color-fg-subtle)' }}>Best time</span>
          <span className="tabular-nums font-semibold" style={{ color: 'var(--color-bmw-blue)' }}>
            {bestRawTime}s
          </span>
        </div>
      )}
    </div>
  )
}

function RunRow({ run, bestRawTime, isDualRun }) {
  const isBest = !run.dnf && run.scored_time === bestRawTime && !isDualRun

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
      style={{
        backgroundColor: isBest ? 'rgba(28, 105, 212, 0.12)' : 'var(--color-surface-3)',
        border: isBest ? '1px solid rgba(28, 105, 212, 0.3)' : '1px solid transparent',
      }}
    >
      {/* Run number */}
      <span
        className="w-5 text-center font-mono"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        {run.run_number}
      </span>

      {/* Time */}
      <span
        className="tabular-nums font-semibold flex-1"
        style={{
          color: run.dnf ? 'var(--color-accent)' : isBest ? 'var(--color-bmw-blue)' : 'var(--color-fg)',
          textDecoration: run.dnf ? 'line-through' : 'none',
        }}
      >
        {run.dnf ? 'DNF' : `${run.scored_time}s`}
      </span>

      {/* Cone penalty */}
      {run.cones > 0 && !run.dnf && (
        <span
          className="px-1.5 py-0.5 rounded text-xs"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
        >
          +{run.cones} cone{run.cones !== 1 ? 's' : ''}
        </span>
      )}
      {run.dnf && (
        <span
          className="px-1.5 py-0.5 rounded text-xs"
          style={{ backgroundColor: 'rgba(230, 57, 70, 0.15)', color: 'var(--color-accent)', border: '1px solid rgba(230, 57, 70, 0.3)' }}
        >
          DNF
        </span>
      )}

      {/* Base time (if cones) */}
      {run.cones > 0 && !run.dnf && (
        <span className="tabular-nums text-xs" style={{ color: 'var(--color-fg-subtle)' }}>
          base {run.base_time}s
        </span>
      )}

      {/* Best indicator */}
      {isBest && (
        <span className="text-xs font-medium" style={{ color: 'var(--color-bmw-blue)' }}>
          best
        </span>
      )}
    </div>
  )
}
