/**
 * Shared utilities for dashboard chart components.
 */
import { Customized, useXAxisScale, useOffset, useChartHeight } from 'recharts'

// Events before which new tires were fitted — shown as annotations on performance charts
export const TIRE_CHANGES = [
  { eventId: '2023-E02', label: 'New F+R tires', short: 'F+R', strokeWidth: 2 },
  { eventId: '2023-E09', label: 'New front tires', short: 'F',   strokeWidth: 1 },
  { eventId: '2025-E01', label: 'New F+R tires', short: 'F+R', strokeWidth: 2 },
]

function TireChangeLayer({ entries }) {
  const scale = useXAxisScale()
  const offset = useOffset()
  const height = useChartHeight()
  if (!scale || !offset) return null

  const y1 = offset.top
  const y2 = height - offset.bottom

  return entries.map(({ id, short, strokeWidth }) => {
    const x = scale(id)
    if (x == null || isNaN(x)) return null
    return (
      <g key={id}>
        <line x1={x} y1={y1} x2={x} y2={y2} stroke="#c4c9d0" strokeWidth={strokeWidth} />
        <text x={x + 3} y={y1 + 13} fontSize={9} fill="#9ca3af" fontFamily="sans-serif">
          {short}
        </text>
      </g>
    )
  })
}

/**
 * Returns a Customized element that draws tire-change annotations at the left
 * edge of the first attended event at or after each change.
 */
export function tireChangeLines(chartData) {
  const sortedIds = [...chartData].sort((a, b) => a.id.localeCompare(b.id)).map(d => d.id)
  const entries = []
  for (const tc of TIRE_CHANGES) {
    const id = sortedIds.find(id => id >= tc.eventId)
    if (id) entries.push({ id, short: tc.short, strokeWidth: tc.strokeWidth })
  }
  if (!entries.length) return null
  const Component = () => <TireChangeLayer entries={entries} />
  return <Customized key="tire-changes" component={Component} />
}


export function linReg(points) {
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

export function getYearBands(chartData) {
  const seen = []
  const yearMap = {}
  chartData.forEach(d => {
    const year = String(d.id).split('-')[0]
    if (!yearMap[year]) {
      yearMap[year] = { year, ids: [] }
      seen.push(year)
    }
    yearMap[year].ids.push(d.id)
  })
  return seen.map((year, idx) => ({
    year,
    x1: yearMap[year].ids[0],
    x2: yearMap[year].ids[yearMap[year].ids.length - 1],
    fill: idx % 2 === 1 ? 'rgba(0,0,0,0.07)' : 'transparent',
  }))
}

// positiveIsGood=true for percentile/rank charts; false for gap/cone charts (lower is better)
export function TrendBadge({ slope, positiveIsGood = true, decimals = 1 }) {
  if (slope === null || slope === undefined) return null
  const isGood = positiveIsGood ? slope >= 0 : slope <= 0
  return (
    <span className={`text-xs font-semibold tabular-nums ${isGood ? 'text-success' : 'text-accent'}`}>
      {slope >= 0 ? '↑' : '↓'} {slope >= 0 ? '+' : ''}{slope.toFixed(decimals)}% / event
    </span>
  )
}
