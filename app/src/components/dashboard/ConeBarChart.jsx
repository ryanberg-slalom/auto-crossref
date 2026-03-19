import { useNavigate } from 'react-router-dom'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceArea,
} from 'recharts'
import ChartCard from '../shared/ChartCard'
import { venueColor } from '../shared/venueColors'
import { linReg, getYearBands, TrendBadge } from './chartUtils.jsx'
import { coneChartData } from './coneUtils.js'

const COLORS = { grid: '#e5e7eb', fg: '#6b7280' }

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="px-3 py-2 text-xs rounded bg-surface-2 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-fg min-w-[160px]">
      <div className="font-semibold mb-1">{d.label}</div>
      <div className="text-fg-muted">
        Cones: <span className="text-fg font-semibold">{d.totalCones}</span>
      </div>
      <div className="text-fg-muted">
        {d.conedRuns} coned run{d.conedRuns !== 1 ? 's' : ''} of {d.totalRuns}
      </div>
    </div>
  )
}

export default function ConeBarChart({ data }) {
  const navigate = useNavigate()
  const base = coneChartData(data)
  if (base.length === 0) return null

  const tickMap = Object.fromEntries(base.map(d => [d.id, d.tick]))
  const overallReg = linReg(base.map(d => ({ x: d.i, y: d.totalCones })))
  const slope = overallReg?.slope ?? null
  const chartData = base.map(d => ({
    ...d,
    trend: overallReg ? parseFloat((overallReg.slope * d.i + overallReg.intercept).toFixed(2)) : null,
  }))
  const yearBands = getYearBands(chartData)

  return (
    <ChartCard
      title="Cones per Event"
      subtitle="Total cones hit — lower is better"
      headerRight={<TrendBadge slope={slope} positiveIsGood={false} decimals={2} />}
    >
      <ResponsiveContainer width="100%" height={200}>
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
            allowDecimals={false}
            tick={{ fill: COLORS.fg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar
            dataKey="totalCones"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
            minPointSize={2}
            onClick={d => navigate(`/event/${d.id}`)}
            style={{ cursor: 'pointer' }}
            isAnimationActive={false}
          >
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
