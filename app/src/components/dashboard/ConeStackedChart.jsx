import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea,
} from 'recharts'
import ChartCard from '../shared/ChartCard'
import { getYearBands } from './chartUtils.jsx'
import { coneChartData } from './coneUtils.js'

const COLORS = {
  grid: '#e5e7eb',
  fg: '#6b7280',
  clean: '#22c55e',
  coned: '#f59e0b',
  dnf: '#ef4444',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="px-3 py-2 text-xs rounded bg-surface-2 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-fg min-w-[160px]">
      <div className="font-semibold mb-1">{d.label}</div>
      <div className="flex items-center gap-1.5 text-fg-muted">
        <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS.clean }} />
        Clean: <span className="text-fg">{d.cleanRuns}</span>
      </div>
      {d.conedRuns > 0 && (
        <div className="flex items-center gap-1.5 text-fg-muted">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS.coned }} />
          Coned: <span className="text-fg">{d.conedRuns}</span>
        </div>
      )}
      {d.dnfRuns > 0 && (
        <div className="flex items-center gap-1.5 text-fg-muted">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS.dnf }} />
          DNF: <span className="text-fg">{d.dnfRuns}</span>
        </div>
      )}
    </div>
  )
}

export default function ConeStackedChart({ data }) {
  const navigate = useNavigate()
  const chartData = coneChartData(data)
  if (chartData.length === 0) return null

  const yearBands = getYearBands(chartData)

  return (
    <ChartCard
      title="Run Breakdown"
      subtitle="Clean, coned, and DNF runs per event"
      headerRight={
        <div className="flex items-center gap-3 text-xs text-fg-muted">
          {[
            { label: 'Clean', color: COLORS.clean },
            { label: 'Coned', color: COLORS.coned },
            { label: 'DNF',   color: COLORS.dnf },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color, opacity: 0.85 }} />
              {label}
            </span>
          ))}
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          {yearBands.map(band => (
            <ReferenceArea
              key={band.year}
              x1={band.x1}
              x2={band.x2}
              fill={band.fill}
              strokeOpacity={0}

              ifOverflow="extendDomain"
            />
          ))}
          <XAxis
            dataKey="id"
            ticks={yearBands.map(b => b.x1)}
            tickFormatter={id => String(id).split('-')[0]}
            tick={{ fill: 'rgba(0,0,0,0.45)', fontSize: 9 }}
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
            dataKey="cleanRuns"
            stackId="runs"
            fill={COLORS.clean}
            fillOpacity={0.8}
            maxBarSize={48}
            onClick={d => navigate(`/event/${d.id}`)}
            style={{ cursor: 'pointer' }}
            isAnimationActive={false}
          />
          <Bar
            dataKey="conedRuns"
            stackId="runs"
            fill={COLORS.coned}
            fillOpacity={0.85}
            maxBarSize={48}
            onClick={d => navigate(`/event/${d.id}`)}
            style={{ cursor: 'pointer' }}
            isAnimationActive={false}
          />
          <Bar
            dataKey="dnfRuns"
            stackId="runs"
            radius={[4, 4, 0, 0]}
            fill={COLORS.dnf}
            fillOpacity={0.85}
            maxBarSize={48}
            onClick={d => navigate(`/event/${d.id}`)}
            style={{ cursor: 'pointer' }}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
