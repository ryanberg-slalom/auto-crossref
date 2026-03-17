import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import ChartCard from '../shared/ChartCard'

const COLORS = {
  line: '#16a34a',
  dot: '#16a34a',
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
        minWidth: 150,
      }}
    >
      <div className="font-semibold mb-1">{d.label}</div>
      <div style={{ color: '#6b7280' }}>
        Beat <span style={{ color: '#16a34a', fontWeight: 600 }}>{d.percentile}%</span> of field
      </div>
      <div style={{ color: '#6b7280' }}>
        {d.rank} of {d.total} drivers
      </div>
    </div>
  )
}

function CustomDot(props) {
  const { cx, cy, payload, onClick } = props
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill={COLORS.dot} stroke={COLORS.line} strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(payload)}
    />
  )
}

export default function PercentileChart({ data }) {
  const navigate = useNavigate()

  const chartData = data.map(e => ({
    eventNum: `E${e.event_number}`,
    percentile: e.ryan.pax_percentile,
    rank: e.ryan.pax_rank,
    total: e.ryan.pax_total,
    label: `Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    id: e.id,
  }))

  const handleDotClick = (payload) => navigate(`/event/${payload.id}`)

  return (
    <ChartCard title="Percentile" subtitle="% of field beaten — higher is better">
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
            domain={[0, 100]}
            tick={{ fill: COLORS.fg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: COLORS.fgSubtle, strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Line
            type="monotone"
            dataKey="percentile"
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
