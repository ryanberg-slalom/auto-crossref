import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
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
    <div className="px-3 py-2 text-xs rounded bg-surface-2 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-fg">
      <div className="font-semibold">{d.range}</div>
      <div className="text-fg-muted">{d.count} driver{d.count !== 1 ? 's' : ''}</div>
      {d.containsRyan && <div className="text-bmw-blue">← your time</div>}
    </div>
  )
}

export default function FieldHistogram({ paxResults, ryanIndexedTime }) {
  const times = paxResults.map(d => d.indexed_time)
  const histData = buildHistogramData(times, ryanIndexedTime)

  return (
    <div className="p-5 flex flex-col gap-4 rounded-lg bg-surface-2 border border-border">
      <div>
        <h3 className="text-sm font-extrabold text-fg">PAX Field Distribution</h3>
        <p className="text-xs mt-0.5 text-fg-subtle">
          Indexed time histogram — blue bar is your bin
        </p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={histData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="8%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="bin"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={64}>
            {histData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.containsRyan ? '#1c69d4' : '#d1d5db'}
                fillOpacity={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
