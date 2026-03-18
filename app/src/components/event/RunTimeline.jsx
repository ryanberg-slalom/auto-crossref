export default function RunTimeline({ runs, scoringType, bestRawTime }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="rounded bg-surface-2 border border-border p-5 text-xs text-fg-subtle">
        No run data available
      </div>
    )
  }

  const isDualRun = scoringType === 'dual_run'
  const sessions = isDualRun ? ['a', 'b'] : ['a']

  return (
    <div className="rounded bg-surface-2 border border-border p-5">
      <h3 className="text-sm font-extrabold mb-4 text-fg">
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
                <div className="text-xs font-medium uppercase tracking-wider mb-2 text-fg-subtle">
                  {sessionLabel}
                  {sessionBest && (
                    <span className="ml-2 normal-case text-fg-muted">
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
        <div className="mt-3 pt-3 flex justify-between text-xs border-t border-border-subtle">
          <span className="text-fg-subtle">Best time</span>
          <span className="tabular-nums font-semibold text-bmw-blue">
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
      className={[
        'flex items-center gap-3 px-3 py-2 text-xs rounded',
        isBest
          ? 'bg-bmw-blue/[6%] border border-bmw-blue/20'
          : 'bg-surface-3 border border-border-subtle',
      ].join(' ')}
    >
      <span className="w-5 text-center font-mono text-fg-subtle">
        {run.run_number}
      </span>

      <span
        className={[
          'tabular-nums font-semibold flex-1',
          run.dnf ? 'text-accent line-through' : isBest ? 'text-bmw-blue' : 'text-fg',
        ].join(' ')}
      >
        {run.dnf ? 'DNF' : `${run.scored_time}s`}
      </span>

      {run.cones > 0 && !run.dnf && (
        <span className="px-1.5 py-0.5 rounded text-xs bg-warning/15 text-warning border border-warning/30">
          +{run.cones} cone{run.cones !== 1 ? 's' : ''}
        </span>
      )}
      {run.dnf && (
        <span className="px-1.5 py-0.5 rounded text-xs bg-accent/15 text-accent border border-accent/30">
          DNF
        </span>
      )}

      {run.cones > 0 && !run.dnf && (
        <span className="tabular-nums text-xs text-fg-subtle">
          base {run.base_time}s
        </span>
      )}

      {isBest && (
        <span className="text-xs font-medium text-bmw-blue">
          best
        </span>
      )}
    </div>
  )
}
