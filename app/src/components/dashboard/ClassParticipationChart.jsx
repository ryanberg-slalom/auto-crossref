import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea,
} from 'recharts'
import ChartCard from '../shared/ChartCard'
import { getYearBands } from './chartUtils.jsx'

const CLASS_COLORS = {
  pst: '#8b5cf6',
  fs:  '#1c69d4',
  sst: '#f59e0b',
}

const COLORS = {
  grid: '#e5e7eb',
  axis: '#6b7280',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="px-3 py-2 text-xs rounded bg-surface-2 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-fg min-w-[160px]">
      <div className="font-semibold mb-1">{d.label}</div>
      <div className="text-fg-muted">
        PST: <span className="font-semibold" style={{ color: CLASS_COLORS.pst }}>{d.pstCount} drivers</span>
      </div>
      <div className="text-fg-muted">
        FS: <span className="font-semibold" style={{ color: CLASS_COLORS.fs }}>{d.fsCount} drivers</span>
      </div>
      <div className="text-fg-muted">
        SST: <span className="font-semibold" style={{ color: CLASS_COLORS.sst }}>{d.sstCount} drivers</span>
      </div>
    </div>
  )
}

export default function ClassParticipationChart({ data }) {
  if (!data?.length) return null

  const chartData = data
    .filter(e => e.pax_results?.length > 0)
    .map(e => ({
      id: e.id,
      label: `${e.season} Event ${e.event_number} — ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      fsCount:  e.pax_results.filter(d => d.class_code === 'FS').length,
      pstCount: e.pax_results.filter(d => d.class_code?.toUpperCase().startsWith('PST')).length,
      sstCount: e.pax_results.filter(d => d.class_code === 'SST').length,
    }))

  if (chartData.length === 0) return null

  const yearBands = getYearBands(chartData)
  const maxCount = Math.max(...chartData.map(d => d.pstCount))
  const yMax = maxCount + 2

  const summary = (() => {
    if (chartData.length < 2) return null
    const avgPst = Math.round(chartData.reduce((s, d) => s + d.pstCount, 0) / chartData.length)
    const avgFs  = Math.round(chartData.reduce((s, d) => s + d.fsCount,  0) / chartData.length)
    return <>PST averages {avgPst} drivers per event (peak {maxCount}), FS averages {avgFs}. Field size affects how much any single rank placement means.</>
  })()

  return (
    <ChartCard
      title="Class Participation"
      subtitle="Driver count per event — FS, PST, and SST"
      headerRight={
        <div className="flex items-center gap-2.5 text-xs text-fg-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: CLASS_COLORS.pst }} />PST
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: CLASS_COLORS.fs }} />FS
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: CLASS_COLORS.sst }} />SST
          </span>
        </div>
      }
      summary={summary}
    >
      <ResponsiveContainer width="100%" height={174}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
            domain={[0, yMax]}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1 }} />
          <Line
            dataKey="pstCount"
            stroke={CLASS_COLORS.pst}
            strokeWidth={2}
            dot={{ r: 3, fill: CLASS_COLORS.pst, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line
            dataKey="fsCount"
            stroke={CLASS_COLORS.fs}
            strokeWidth={2}
            dot={{ r: 3, fill: CLASS_COLORS.fs, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line
            dataKey="sstCount"
            stroke={CLASS_COLORS.sst}
            strokeWidth={2}
            dot={{ r: 3, fill: CLASS_COLORS.sst, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
