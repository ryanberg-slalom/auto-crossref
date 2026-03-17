import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import ChartCard from '../shared/ChartCard'

const COLORS = {
  bar: '#1c69d4',
  barBest: '#16a34a',
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
        minWidth: 170,
      }}
    >
      <div className="font-semibold mb-1">{d.label}</div>
      <div style={{ color: '#6b7280' }}>
        Gap: <span style={{ color: '#1c69d4', fontWeight: 600 }}>{d.gapPct}%</span> ({d.gapSec > 0 ? '+' : ''}{d.gapSec}s)
      </div>
      <div style={{ color: '#6b7280' }}>
        Leader: <span style={{ color: '#111827' }}>{d.leaderTime}s</span>
      </div>
    </div>
  )
}

export default function GapBarChart({ data }) {
  const navigate = useNavigate()

  const chartData = data.map(e => ({
    eventNum: `E${e.event_number}`,
    gapPct: e.ryan.pax_gap_pct,
    gapSec: e.ryan.pax_gap_seconds,
    leaderTime: e.ryan.pax_leader_time,
    label: `Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    id: e.id,
  })).filter(d => d.gapPct !== null)

  const minGap = Math.min(...chartData.map(d => d.gapPct))

  return (
    <ChartCard title="Gap to PAX Leader" subtitle="How far behind the top indexed time — lower is better">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar
            dataKey="gapPct"
            radius={[4, 4, 0, 0]}
            onClick={(d) => navigate(`/event/${d.id}`)}
            style={{ cursor: 'pointer' }}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.eventNum}
                fill={entry.gapPct === minGap ? COLORS.barBest : COLORS.bar}
                fillOpacity={entry.gapPct === minGap ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
