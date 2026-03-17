import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

function buildHistogramData(indexedTimes, ryanTime, binWidth = 1) {
  if (!indexedTimes.length) return []
  const min = Math.floor(Math.min(...indexedTimes))
  const max = Math.ceil(Math.max(...indexedTimes))
  const bins = []
  for (let lo = min; lo < max; lo += binWidth) {
    const hi = lo + binWidth
    const count = indexedTimes.filter(t => t >= lo && t < hi).length
    const containsRyan = ryanTime >= lo && ryanTime < hi
    bins.push({
      bin: `${lo}`,
      range: `${lo}–${hi}s`,
      count,
      containsRyan,
    })
  }
  return bins
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{ backgroundColor: '#1e2535', border: '1px solid #2a3348', color: '#f1f5f9' }}
    >
      <div className="font-semibold">{d.range}</div>
      <div style={{ color: '#94a3b8' }}>{d.count} driver{d.count !== 1 ? 's' : ''}</div>
      {d.containsRyan && <div style={{ color: '#1c69d4' }}>← your time</div>}
    </div>
  )
}

export default function FieldHistogram({ paxResults, ryanIndexedTime }) {
  const times = paxResults.map(d => d.indexed_time)
  const histData = buildHistogramData(times, ryanIndexedTime)

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>
          PAX Field Distribution
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-subtle)' }}>
          Indexed time histogram — blue bar is your bin
        </p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={histData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="8%">
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3348" vertical={false} />
          <XAxis
            dataKey="bin"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {histData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.containsRyan ? '#1c69d4' : '#2a3348'}
                fillOpacity={entry.containsRyan ? 1 : 0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
