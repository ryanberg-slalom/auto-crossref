import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import ChartCard from '../shared/ChartCard'

const COLORS = {
  line: '#f59e0b',
  dot: '#fbbf24',
  grid: '#2a3348',
  fg: '#94a3b8',
  fgSubtle: '#64748b',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{ backgroundColor: '#1e2535', border: '1px solid #2a3348', color: '#f1f5f9', minWidth: 160 }}
    >
      <div className="font-semibold mb-1">{d.label}</div>
      <div style={{ color: '#94a3b8' }}>
        Indexed: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{d.indexed}s</span>
      </div>
      {d.isDualRun && (
        <div className="mt-0.5" style={{ color: '#64748b', fontSize: 10 }}>dual-run (sum of sessions)</div>
      )}
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

export default function IndexedTimeChart({ data }) {
  const navigate = useNavigate()

  const chartData = data.map(e => ({
    eventNum: `E${e.event_number}`,
    indexed: e.ryan.official_indexed_time,
    isDualRun: e.scoring_type === 'dual_run',
    label: `Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    id: e.id,
  }))

  // Exclude dual-run events from single-course trend (different course/scoring)
  const singleEvents = chartData.filter(d => !d.isDualRun)

  const handleDotClick = (payload) => navigate(`/event/${payload.id}`)

  return (
    <ChartCard title="Indexed Time" subtitle="PAX-adjusted time — lower is better (single-course events)">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={singleEvents} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="eventNum"
            tick={{ fill: COLORS.fg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: COLORS.fg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={v => `${v}s`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: COLORS.fgSubtle, strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Line
            type="monotone"
            dataKey="indexed"
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
