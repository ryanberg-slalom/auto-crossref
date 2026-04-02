import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceArea,
} from 'recharts'
import ChartCard from '../shared/ChartCard'

const COLORS = {
  grid: '#e5e7eb',
  fg: '#6b7280',
  normal: '#94a3b8',
}

function bestRunColor(entry) {
  if (entry.isFirstOfSession) return '#ef4444'
  if (entry.isLastOfSession)  return '#22c55e'
  return '#f59e0b'
}

function runColor(entry) {
  if (entry.isBest) return bestRunColor(entry)
  return COLORS.normal
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (!d.eventId) return null
  return (
    <div className="px-3 py-2 text-xs rounded bg-surface-2 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-fg min-w-[160px]">
      <div className="font-semibold mb-1">{d.eventLabel}</div>
      <div className="text-fg-muted">
        Run {d.runNumber}:{' '}
        {d.dnf
          ? <span className="text-accent">DNF</span>
          : <><span className="text-fg">{d.baseTime.toFixed(3)}</span>
            {d.cones > 0 && <span className="text-fg-muted"> (+{d.cones})</span>}</>
        }
      </div>
      {d.isBest && (
        <div className={`font-medium mt-0.5 ${d.isLastOfSession ? 'text-success' : d.isFirstOfSession ? 'text-accent' : 'text-amber-500'}`}>
          Best run {d.isLastOfSession ? '(last ✓)' : d.isFirstOfSession ? '(first)' : '(middle)'}
        </div>
      )}
      {d.quality != null && (
        <div className="text-fg-muted mt-0.5">
          Quality: <span className="text-fg">{d.quality.toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}

export default function RunProgressionChart({ data }) {
  const navigate = useNavigate()

  const eventBands = []
  const chartData = []

  data.forEach((e, eIdx) => {
    const allRuns = (e.ryan?.runs ?? []).filter(r => !r.rerun && (r.dnf || r.base_time != null))
    if (!allRuns.length) return

    const eventLabel = `${e.season} Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    const sessions = [...new Set(allRuns.map(r => r.session))].sort()

    let eventFirstKey = null
    let eventLastKey = null

    sessions.forEach((session, sIdx) => {
      const sessionRuns = allRuns.filter(r => r.session === session).sort((a, b) => a.run_number - b.run_number)
      const validTimes = sessionRuns.filter(r => !r.dnf).map(r => r.base_time)
      const sessionBest = Math.min(...validTimes)
      const sessionWorst = Math.max(...validTimes)

      if (chartData.length > 0) {
        chartData.push({ key: `spacer-${e.id}-${session}`, quality: null })
      }

      const entries = sessionRuns.map((r, rIdx) => {
        const quality = r.dnf ? null : parseFloat(((r.base_time / sessionWorst) * 100).toFixed(2))
        return {
          key: `${e.id}-s${r.session}-r${r.run_number}`,
          eventId: e.id,
          eventLabel,
          runNumber: r.run_number,
          session,
          baseTime: r.base_time,
          cones: r.cones,
          dnf: r.dnf,
          isBest: !r.dnf && r.base_time === sessionBest,
          isFirstOfSession: rIdx === 0,
          isLastOfSession: rIdx === sessionRuns.length - 1,
          quality,
          displayQuality: r.dnf ? 3 : Math.max(0, quality - 75),
        }
      })

      if (sIdx === 0) eventFirstKey = entries[0].key
      eventLastKey = entries[entries.length - 1].key

      chartData.push(...entries)
    })

    eventBands.push({
      eventId: e.id,
      x1: eventFirstKey,
      x2: eventLastKey,
      fill: eIdx % 2 === 1 ? 'rgba(0,0,0,0.06)' : 'transparent',
    })
  })

  if (!chartData.length) return null

  const summary = (() => {
    let finishedStrong = 0, peakedEarly = 0, totalSessions = 0, totalDnfs = 0, totalRuns = 0
    data.forEach(e => {
      const allRuns = (e.ryan?.runs ?? []).filter(r => !r.rerun && (r.dnf || r.base_time != null))
      const sessions = [...new Set(allRuns.map(r => r.session))].sort()
      sessions.forEach(session => {
        const sessionRuns = allRuns.filter(r => r.session === session).sort((a, b) => a.run_number - b.run_number)
        const valid = sessionRuns.filter(r => !r.dnf && r.base_time != null)
        totalRuns += sessionRuns.length
        totalDnfs += sessionRuns.filter(r => r.dnf).length
        if (valid.length === 0) return
        totalSessions++
        const bestTime = Math.min(...valid.map(r => r.base_time))
        const bestIdx = sessionRuns.findIndex(r => !r.dnf && r.base_time === bestTime)
        if (bestIdx === sessionRuns.length - 1) finishedStrong++
        else if (bestIdx === 0) peakedEarly++
      })
    })
    if (totalSessions < 2) return null
    const finishLine = finishedStrong > peakedEarly * 1.5
      ? `You're a late-session driver — you tend to find more time as the runs pile up, which is a good sign for consistency.`
      : peakedEarly > finishedStrong * 1.5
      ? `You're leaving time on the table by peaking early. The first run is your best more often than not — later runs should be opportunities, not step-backs.`
      : finishedStrong >= peakedEarly
      ? `Your best run is about as likely to come last as first — slight lean toward finishing strong, which is where you want to be.`
      : `No strong pattern yet in when your best run falls — worth watching as more events accumulate.`
    const dnfLine = totalDnfs > 0
      ? ` ${totalDnfs} DNF${totalDnfs !== 1 ? 's' : ''} in ${totalRuns} runs — each one is a gift to the field.`
      : ` No DNFs across ${totalRuns} runs — clean execution.`
    return <>{finishLine}{dnfLine}</>
  })()

  return (
    <ChartCard
      title="Run Progression"
      subtitle="Best run position per session"
      headerRight={
        <div className="flex items-center gap-2.5 text-xs text-fg-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />First</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Middle</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Last</span>
        </div>
      }
      summary={summary}
    >
      <ResponsiveContainer width="100%" height={90}>
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          {eventBands.map(band => (
            <ReferenceArea
              key={band.eventId}
              x1={band.x1}
              x2={band.x2}
              fill={band.fill}
              strokeOpacity={0}
              ifOverflow="extendDomain"
            />
          ))}
          <XAxis dataKey="key" hide />
          <YAxis domain={[0, 25]} hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar
            dataKey="displayQuality"
            maxBarSize={10}
            onClick={d => d.eventId && navigate(`/event/${d.eventId}`)}
            style={{ cursor: 'pointer' }}
            isAnimationActive={false}
          >
            {chartData.map(entry => (
              <Cell
                key={entry.key}
                fill={entry.eventId ? runColor(entry) : 'transparent'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
