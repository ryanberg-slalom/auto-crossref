import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import ChartCard from '../shared/ChartCard'

const COLORS = {
  line: '#1c69d4',
  dot: '#4d8fe0',
  grid: '#2a3348',
  fg: '#94a3b8',
  fgSubtle: '#64748b',
  surface3: '#1e2535',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        backgroundColor: '#1e2535',
        border: '1px solid #2a3348',
        color: '#f1f5f9',
        minWidth: 140,
      }}
    >
      <div className="font-semibold mb-1" style={{ color: '#f1f5f9' }}>{d.label}</div>
      <div style={{ color: '#94a3b8' }}>
        PAX rank: <span style={{ color: '#1c69d4', fontWeight: 600 }}>{d.rank}</span> of {d.total}
      </div>
      <div style={{ color: '#94a3b8' }}>
        Percentile: <span style={{ color: '#f1f5f9' }}>{d.percentile}%</span>
      </div>
    </div>
  )
}

function CustomDot(props) {
  const { cx, cy, payload, onClick } = props
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={COLORS.dot}
      stroke={COLORS.line}
      strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(payload)}
    />
  )
}

export default function PaxRankChart({ data }) {
  const navigate = useNavigate()

  const chartData = data.map(e => ({
    eventNum: `E${e.event_number}`,
    rank: e.ryan.pax_rank,
    total: e.ryan.pax_total,
    percentile: e.ryan.pax_percentile,
    label: `Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    id: e.id,
  }))

  const maxRank = Math.max(...chartData.map(d => d.total))
  const minRank = Math.max(1, Math.min(...chartData.map(d => d.rank)) - 5)
  const maxY = Math.min(maxRank, Math.max(...chartData.map(d => d.rank)) + 10)

  const handleDotClick = (payload) => navigate(`/event/${payload.id}`)

  return (
    <ChartCard title="PAX Rank" subtitle="Position in full indexed field — lower is better">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="eventNum"
            tick={{ fill: COLORS.fg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            reversed
            domain={[minRank, maxY]}
            tick={{ fill: COLORS.fg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: COLORS.fgSubtle, strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Line
            type="monotone"
            dataKey="rank"
            stroke={COLORS.line}
            strokeWidth={2}
            dot={<CustomDot onClick={handleDotClick} />}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
