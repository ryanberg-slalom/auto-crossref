import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import ChartCard from '../shared/ChartCard'

const COLORS = {
  line: '#1c69d4',
  dot: '#1c69d4',
  grid: '#e5e7eb',
  fg: '#6b7280',
  fgSubtle: '#9ca3af',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="px-3 py-2 text-xs"
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        color: '#111827',
        minWidth: 140,
      }}
    >
      <div className="font-semibold mb-1">{d.label}</div>
      <div style={{ color: '#6b7280' }}>
        PAX rank: <span style={{ color: '#1c69d4', fontWeight: 600 }}>{d.rank}</span> of {d.total}
      </div>
      <div style={{ color: '#6b7280' }}>
        Percentile: <span style={{ color: '#111827' }}>{d.percentile}%</span>
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
