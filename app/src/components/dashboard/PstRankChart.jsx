import { useNavigate } from 'react-router-dom'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, ReferenceArea,
} from 'recharts'
import ChartCard from '../shared/ChartCard'
import { venueColor, venueTextClass } from '../shared/venueColors'
import { tireChangeLines } from './chartUtils.jsx'

const COLORS = {
  grid: '#e5e7eb',
  fg: '#6b7280',
}


function linReg(points) {
  const n = points.length
  if (n < 2) return null
  const sumX  = points.reduce((s, p) => s + p.x, 0)
  const sumY  = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function getYearBands(chartData) {
  const seen = []
  const yearMap = {}
  chartData.forEach(d => {
    const year = String(d.id).split('-')[0]
    if (!yearMap[year]) {
      yearMap[year] = { year, ids: [] }
      seen.push(year)
    }
    yearMap[year].ids.push(d.id)
  })
  return seen.map((year, idx) => ({
    year,
    x1: yearMap[year].ids[0],
    x2: yearMap[year].ids[yearMap[year].ids.length - 1],
    fill: idx % 2 === 1 ? 'rgba(0,0,0,0.07)' : 'transparent',
  }))
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="px-3 py-2 text-xs rounded bg-surface-2 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-fg min-w-[160px]">
      <div className="font-semibold mb-1">{d.label}</div>
      <div className="text-fg-muted">
        PST rank: <span className={`font-semibold ${venueTextClass(d.venue)}`}>{d.rank}</span> of {d.total}
      </div>
      <div className="text-fg-muted">
        Percentile: <span className="text-fg">{d.percentile}%</span>
      </div>
    </div>
  )
}

export default function PstRankChart({ data }) {
  const navigate = useNavigate()

  const base = data
    .filter(e => e.ryan.hypothetical_pst_rank !== null)
    .map((e, i) => ({
      i,
      id: e.id,
      tick: `#${e.event_number}`,
      percentile: e.ryan.hypothetical_pst_percentile,
      rank: e.ryan.hypothetical_pst_rank,
      total: e.ryan.hypothetical_pst_total,

      label: `${e.season} Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      venue: e.venue,
    }))

  if (base.length === 0) return null


  const overallReg = linReg(base.map(d => ({ x: d.i, y: d.percentile })))
  const slope = overallReg?.slope ?? null
  // Higher percentile = improving
  const trendBadge = slope !== null ? (
    <span className={`text-xs font-semibold tabular-nums ${slope >= 0 ? 'text-success' : 'text-accent'}`}>
      {slope >= 0 ? '↑' : '↓'} {slope >= 0 ? '+' : ''}{slope.toFixed(1)}% / event
    </span>
  ) : null

  const chartData = base.map(d => ({
    ...d,
    trend: overallReg ? parseFloat((overallReg.slope * d.i + overallReg.intercept).toFixed(1)) : null,
  }))

  const yearBands = getYearBands(chartData)

  const summary = (() => {
    const n = base.length
    if (n < 2) return null
    const avg = base.reduce((s, d) => s + d.percentile, 0) / n
    const best = base.reduce((a, b) => a.rank < b.rank ? a : b)
    const hasPodium = best.rank <= 3

    const position = avg >= 70
      ? 'You\'re a consistent PST contender'
      : avg >= 55
      ? 'You hold your own in the PST field'
      : avg >= 40
      ? 'You\'re mid-pack against PST competition'
      : 'PST pace is still a gap to close'

    const trendQ = slope === null ? '.'
      : slope >= 1.5  ? ', and climbing fast.'
      : slope >= 0.3  ? ', with an upward trend.'
      : slope <= -1.5 ? ', but the trend is heading the wrong way.'
      : slope <= -0.3 ? ', though results have softened lately.'
      : '.'

    const bestLine = hasPodium
      ? ` You've podiumed in PST (${best.rank} of ${best.total} at ${best.label}) — that pace exists.`
      : ` Best result was ${best.rank} of ${best.total} at ${best.label}.`

    return <>{position}{trendQ}{bestLine}</>
  })()

  return (
    <ChartCard title="PST Rank" subtitle="Where your indexed time places among PST competitors — higher is better" headerRight={
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 text-xs text-fg-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zmax inline-block" />ZMAX</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-michelin inline-block" />Michelin</span>
        </div>
        {trendBadge}
      </div>
    } summary={summary}>
      <ResponsiveContainer width="100%" height={174}>
        <ComposedChart data={chartData} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          {yearBands.map(band => (
            <ReferenceArea
              key={band.year}
              x1={band.x1}
              x2={band.x2}
              fill={band.fill}
              strokeOpacity={0}
              ifOverflow="extendDomain"
            />
          ))}
          <XAxis
            dataKey="id"
            ticks={yearBands.map(b => b.x1)}
            tickFormatter={id => String(id).split('-')[0]}
            tick={{ fill: 'rgba(0,0,0,0.45)', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: COLORS.fg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          {tireChangeLines(chartData)}
          <Bar
            dataKey="percentile"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
            minPointSize={4}
            onClick={d => navigate(`/event/${d.id}`)}
            style={{ cursor: 'pointer' }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="percentile"
              position="top"
              formatter={v => `${Math.round(v)}%`}
              style={{ fontSize: 11, fontWeight: 600, fill: COLORS.fg }}
            />
            {chartData.map(entry => (
              <Cell key={entry.id} fill={venueColor(entry.venue)} fillOpacity={0.85} />
            ))}
          </Bar>
          <Line
            dataKey="trend"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
