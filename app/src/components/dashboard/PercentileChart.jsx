import { useNavigate } from 'react-router-dom'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, ReferenceArea,
} from 'recharts'
import ChartCard from '../shared/ChartCard'
import { venueColor } from '../shared/venueColors'

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

// Returns [{year, x1, x2, fill}] for alternating year band backgrounds
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
    fill: idx % 2 === 1 ? 'rgba(0,0,0,0.03)' : 'transparent',
    showLabel: true,
  }))
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="px-3 py-2 text-xs rounded bg-surface-2 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-fg min-w-[150px]">
      <div className="font-semibold mb-1">{d.label}</div>
      <div className="text-fg-muted">
        Beat <span style={{ color: venueColor(d.venue), fontWeight: 600 }}>{d.percentile}%</span> of field
      </div>
      <div className="text-fg-muted">
        {d.rank} of {d.total} drivers
      </div>
    </div>
  )
}

export default function PercentileChart({ data }) {
  const navigate = useNavigate()

  const base = data.map((e, i) => ({
    i,
    id: e.id,
    tick: `#${e.event_number}`,
    percentile: e.ryan.pax_percentile,
    rank: e.ryan.pax_rank,
    total: e.ryan.pax_total,
    label: `${e.season} Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    id: e.id,
    venue: e.venue,
  }))

  const tickMap = Object.fromEntries(base.map(d => [d.id, d.tick]))

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

  return (
    <ChartCard title="Percentile" subtitle="% of field beaten — higher is better" headerRight={trendBadge}>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          {yearBands.map(band => (
            <ReferenceArea
              key={band.year}
              x1={band.x1}
              x2={band.x2}
              fill={band.fill}
              strokeOpacity={0}
              label={{ value: band.year, position: 'insideTopLeft', fontSize: 9, fill: 'rgba(0,0,0,0.2)', dy: -18 }}
              ifOverflow="extendDomain"
            />
          ))}
          <XAxis
            dataKey="id"
            tickFormatter={id => tickMap[id] ?? id}
            tick={{ fill: COLORS.fg, fontSize: 11 }}
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
