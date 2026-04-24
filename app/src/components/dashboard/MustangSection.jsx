import CollapsibleCard from '../shared/CollapsibleCard'
import { useMustangDrivers } from '../../hooks/useMustangDrivers'

const CHART_H = 100 // px — fixed chart area height

function formatDelta(delta) {
  if (delta == null) return '—'
  const abs = Math.abs(delta).toFixed(3)
  return delta < 0 ? `−${abs}s` : `+${abs}s`
}

export default function MustangSection({ events }) {
  const { drivers, chartData } = useMustangDrivers(events)
  if (!drivers.length) return null

  // Only events where at least one Mustang competed
  const mustangEvents = chartData.filter(d => d.bestMustang !== null)

  // Compute summary stats
  const mustangEventCount = mustangEvents.length
  const totalH2hWins    = drivers.reduce((s, d) => s + d.h2hWins, 0)
  const totalEncounters = drivers.reduce((s, d) => s + d.sharedEvents.length, 0)
  const highSpecBeaten  = drivers.filter(d => d.isHighSpec && d.h2hWins > 0)

  const summary = (() => {
    const winLine = `${totalH2hWins} of ${totalEncounters} encounters against qualifying Mustangs across ${mustangEventCount} events.`
    const hsLine  = highSpecBeaten.length > 0
      ? ` Beat ${highSpecBeaten.length === 1 ? 'a' : highSpecBeaten.length} high-spec Mustang${highSpecBeaten.length !== 1 ? 's' : ''} (${highSpecBeaten.map(d => d.car).join(', ')}).`
      : ''
    return <>{winLine}{hsLine}</>
  })()

  return (
    <CollapsibleCard
      title="Mustang Cohort"
      subtitle="Events with 2015+ Mustangs running FS or PST/FS PAX"
      summary={summary}
    >
      {/* Dot chart */}
      <div className="flex items-end gap-1 mt-1">
        {mustangEvents.map((point, idx) => {
          const prevYear = idx > 0 ? mustangEvents[idx - 1].id.split('-')[0] : null
          const thisYear = point.id.split('-')[0]
          const yearChanged = thisYear !== prevYear

          // Collect dots for this event: Ryan + each Mustang present
          const dots = []
          if (point.ryan != null) {
            dots.push({ key: 'ryan', label: 'Ryan Berg', percentile: point.ryan, isRyan: true })
          }
          for (const d of drivers) {
            if (point[d.name] != null) {
              dots.push({
                key: d.name,
                label: d.name,
                percentile: point[d.name],
                isRyan: false,
                car: d.car,
                isHighSpec: d.isHighSpec,
              })
            }
          }
          dots.sort((a, b) => a.percentile - b.percentile) // slowest first → fastest at top of stack

          const eventNum = point.id.split('-E')[1]?.replace(/^0/, '') ?? ''

          return (
            <div
              key={point.id}
              className="relative flex flex-col items-center group"
              style={{ flex: 1, minWidth: 24 }}
            >
              {/* Year label — only on year transition */}
              <div className="h-4 flex items-end justify-center w-full">
                {yearChanged && (
                  <span className="text-[9px] text-fg-subtle leading-none">{thisYear}</span>
                )}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1.5 text-xs rounded bg-surface-2 border border-border shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-100">
                <div className="font-semibold text-fg mb-1">{point.id}</div>
                {dots.map(dot => (
                  <div key={dot.key} className="flex items-center gap-1.5 leading-snug">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${dot.isRyan ? 'bg-bmw-blue' : dot.isHighSpec ? 'bg-violet-500' : 'bg-gray-400'}`} />
                    <span className={dot.isRyan ? 'text-bmw-blue font-semibold' : 'text-fg-muted'}>
                      {dot.isRyan ? 'You' : dot.label}
                      {dot.isHighSpec && <span className="ml-1 text-violet-600 font-normal">★</span>}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chart column — dots stacked from bottom */}
              <div
                className="flex flex-col-reverse items-center justify-start gap-1 w-full"
                style={{ height: CHART_H }}
              >
                {dots.map(dot => (
                  <div
                    key={dot.key}
                    className={`w-3 h-3 rounded-full shrink-0 ${dot.isRyan ? 'bg-bmw-blue' : dot.isHighSpec ? 'bg-violet-500' : 'bg-gray-400'}`}
                  />
                ))}
              </div>

              {/* X-axis label */}
              <div className="text-[10px] text-fg-subtle mt-1 tabular-nums leading-none">
                #{eventNum}
              </div>
            </div>
          )
        })}
      </div>

      {/* Driver table */}
      <div className="mt-3 border-t border-border pt-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-fg-subtle uppercase tracking-wider" style={{ fontSize: 10 }}>
              <th className="text-left pb-1.5 font-medium pr-3">Car</th>
              <th className="text-left pb-1.5 font-medium pr-3">Driver</th>
              <th className="text-right pb-1.5 font-medium pr-3">Events</th>
              <th className="text-right pb-1.5 font-medium pr-3">Avg gap</th>
              <th className="text-right pb-1.5 font-medium">H2H</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(driver => (
              <tr key={driver.name} className="border-t border-border-subtle">
                <td className="py-1.5 pr-3 font-medium text-fg whitespace-nowrap">
                  {driver.car || '—'}
                  {driver.isHighSpec && (
                    <span className="ml-1.5 text-[10px] px-1 py-px rounded bg-violet-100 text-violet-700 font-semibold dark:bg-violet-900/40 dark:text-violet-300">
                      High Spec
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-3 text-fg-muted">{driver.name}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-fg-muted">
                  {driver.sharedEvents.length}
                </td>
                <td className={`py-1.5 pr-3 text-right tabular-nums font-medium ${
                  driver.avgDelta == null ? 'text-fg-muted'
                  : driver.avgDelta < 0 ? 'text-success'
                  : 'text-accent'
                }`}>
                  {formatDelta(driver.avgDelta)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-fg-muted">
                  {driver.h2hWins}/{driver.sharedEvents.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </CollapsibleCard>
  )
}
