import { useNavigate } from 'react-router-dom'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import ChartCard from '../shared/ChartCard'
import { venueColor } from '../shared/venueColors'

const COLORS = {
  grid: '#e5e7eb',
  fg: '#6b7280',
}

const TREND = {
  michelin: '#001a40',
  zmax: '#7a1414',
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

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="px-3 py-2 text-xs rounded bg-surface-2 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-fg min-w-[160px]">
      <div className="font-semibold mb-1">{d.label}</div>
      <div className="text-fg-muted">
        PST rank: <span style={{ color: venueColor(d.venue), fontWeight: 600 }}>{d.rank}</span> of {d.total}
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
      eventNum: `#${e.event_number}`,
      percentile: e.ryan.hypothetical_pst_percentile,
      rank: e.ryan.hypothetical_pst_rank,
      total: e.ryan.hypothetical_pst_total,
      barLabel: `${e.ryan.hypothetical_pst_percentile}% (${e.ryan.hypothetical_pst_rank} of ${e.ryan.hypothetical_pst_total})`,
      label: `Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      id: e.id,
      venue: e.venue,
    }))

  if (base.length === 0) return null

  const michelinReg = linReg(base.filter(d => d.venue === 'michelin').map(d => ({ x: d.i, y: d.percentile })))
  const zmaxReg    = linReg(base.filter(d => d.venue === 'zmax').map(d => ({ x: d.i, y: d.percentile })))

  const chartData = base.map(d => ({
    ...d,
    trendMichelin: michelinReg ? parseFloat((michelinReg.slope * d.i + michelinReg.intercept).toFixed(1)) : null,
    trendZmax:     zmaxReg    ? parseFloat((zmaxReg.slope    * d.i + zmaxReg.intercept).toFixed(1))    : null,
  }))

  return (
    <ChartCard title="Hypothetical PST Rank" subtitle="Where your indexed time places among PST competitors — higher is better">
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="eventNum"
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
            maxBarSize={64}
            minPointSize={4}
            onClick={d => navigate(`/event/${d.id}`)}
            style={{ cursor: 'pointer' }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="barLabel"
              position="top"
              style={{ fontSize: 11, fontWeight: 600, fill: COLORS.fg }}
            />
            {chartData.map(entry => (
              <Cell key={entry.eventNum} fill={venueColor(entry.venue)} fillOpacity={0.85} />
            ))}
          </Bar>
          <Line
            dataKey="trendMichelin"
            stroke={TREND.michelin}
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="trendZmax"
            stroke={TREND.zmax}
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
