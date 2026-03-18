import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import ChartCard from '../shared/ChartCard'
import { venueColor } from '../shared/venueColors'

const COLORS = {
  grid: '#e5e7eb',
  fg: '#6b7280',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="px-3 py-2 text-xs rounded bg-surface-2 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-fg min-w-[170px]">
      <div className="font-semibold mb-1">{d.label}</div>
      <div className="text-fg-muted">
        Gap: <span className="text-bmw-blue font-semibold">{d.gapPct}%</span> ({d.gapSec > 0 ? '+' : ''}{d.gapSec}s)
      </div>
      <div className="text-fg-muted">
        Leader: <span className="text-fg">{d.leaderTime}s</span>
      </div>
    </div>
  )
}

export default function GapBarChart({ data }) {
  const navigate = useNavigate()

  const chartData = data.map(e => ({
    eventNum: `#${e.event_number}`,
    gapPct: e.ryan.pax_gap_pct,
    gapSec: e.ryan.pax_gap_seconds,
    leaderTime: e.ryan.pax_leader_time,
    label: `Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    id: e.id,
    venue: e.venue,
  })).filter(d => d.gapPct !== null)

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
            maxBarSize={64}
            onClick={(d) => navigate(`/event/${d.id}`)}
            style={{ cursor: 'pointer' }}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.eventNum}
                fill={venueColor(entry.venue)}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
