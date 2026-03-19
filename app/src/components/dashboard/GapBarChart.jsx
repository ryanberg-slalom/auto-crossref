import { useNavigate } from 'react-router-dom'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceArea,
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
  }))
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="px-3 py-2 text-xs rounded bg-surface-2 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-fg min-w-[170px]">
      <div className="font-semibold mb-1">{d.label}</div>
      <div className="text-fg-muted">
        Gap: <span className="text-bmw-blue font-semibold">{d.gapPct}%</span> ({d.gapSec > 0 ? '+' : ''}{Number(d.gapSec).toFixed(3)})
      </div>
      <div className="text-fg-muted">
        Leader: <span className="text-fg">{Number(d.leaderTime).toFixed(3)}</span>
      </div>
    </div>
  )
}

export default function GapBarChart({ data }) {
  const navigate = useNavigate()

  const allPoints = data.map(e => ({
    id: e.id,
    tick: `#${e.event_number}`,
    gapPct: e.ryan.pax_gap_pct,
    gapSec: e.ryan.pax_gap_seconds,
    leaderTime: e.ryan.pax_leader_time,
    label: `${e.season} Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    venue: e.venue,
  })).filter(d => d.gapPct !== null)

  const tickMap = Object.fromEntries(allPoints.map(d => [d.id, d.tick]))
  const yearBands = getYearBands(allPoints)

  const overallReg = linReg(allPoints.map((d, i) => ({ x: i, y: d.gapPct })))
  const chartData = allPoints.map((d, i) => ({
    ...d,
    trend: overallReg ? parseFloat((overallReg.slope * i + overallReg.intercept).toFixed(2)) : null,
  }))
  const slope = overallReg?.slope ?? null
  // Lower gap = improving, so negative slope is good
  const trendBadge = slope !== null ? (
    <span className={`text-xs font-semibold tabular-nums ${slope <= 0 ? 'text-success' : 'text-accent'}`}>
      {slope >= 0 ? '↑' : '↓'} {slope >= 0 ? '+' : ''}{slope.toFixed(2)}% / event
    </span>
  ) : null

  return (
    <ChartCard title="Gap to PAX Leader" subtitle="How far behind the top indexed time — lower is better" headerRight={trendBadge}>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          {yearBands.map(band => (
            <ReferenceArea
              key={band.year}
              x1={band.x1}
              x2={band.x2}
              fill={band.fill}
              strokeOpacity={0}
              label={{ value: band.year, position: 'insideTopLeft', fontSize: 9, fill: 'rgba(0,0,0,0.2)', dy: -2 }}
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
            tick={{ fill: COLORS.fg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar
            dataKey="gapPct"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
            onClick={(d) => navigate(`/event/${d.id}`)}
            style={{ cursor: 'pointer' }}
            isAnimationActive={false}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.id}
                fill={venueColor(entry.venue)}
                fillOpacity={0.85}
              />
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
