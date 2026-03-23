import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea,
} from 'recharts'
import ChartCard from '../shared/ChartCard'
import { usePeerDrivers } from '../../hooks/usePeerDrivers'
import { getYearBands } from './chartUtils.jsx'

const COLORS = {
  grid: '#e5e7eb',
  fg: '#6b7280',
  ryan: '#1c69d4',
  pinned: '#94a3b8',
  highlight: '#f97316',
}

function CustomTooltip({ active, payload, selectedPeer }) {
  if (!active || !payload?.length) return null
  const ryanEntry = payload.find(p => p.dataKey === 'ryan')
  const avgEntry = payload.find(p => p.dataKey === 'peerAvg')
  const highlightEntry = selectedPeer ? payload.find(p => p.dataKey === selectedPeer) : null
  const d = payload[0]?.payload
  return (
    <div className="px-3 py-2 text-xs rounded bg-surface-2 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-fg min-w-[150px]">
      <div className="font-semibold mb-1">{d?.id}</div>
      {ryanEntry?.value != null && (
        <div className="text-bmw-blue font-semibold">Ryan: {ryanEntry.value.toFixed(1)}%</div>
      )}
      {highlightEntry?.value != null && (
        <div style={{ color: '#f97316' }} className="font-medium">
          {selectedPeer}: {highlightEntry.value.toFixed(1)}%
        </div>
      )}
      {avgEntry?.value != null && (
        <div className="text-fg-muted">
          Peer avg: <span className="text-fg">{avgEntry.value.toFixed(1)}%</span>
          {d?.peerCount != null && <span className="text-fg-subtle"> ({d.peerCount} drivers)</span>}
        </div>
      )}
    </div>
  )
}

function formatDelta(delta) {
  if (delta == null) return '—'
  const abs = Math.abs(delta).toFixed(3)
  return delta < 0 ? `−${abs}s` : `+${abs}s`
}

export default function PeerGroupSection({ events }) {
  const { peers, chartData } = usePeerDrivers(events)
  const [selectedPeer, setSelectedPeer] = useState(null)
  const [hoveredPeer, setHoveredPeer] = useState(null)
  const activePeerName = selectedPeer ?? hoveredPeer

  const handleRowClick = (peer) => {
    if (peer.notFound) return
    setSelectedPeer(prev => prev === peer.name ? null : peer.name)
  }

  if (!peers.length && !events.length) return null

  const activePeers = peers.filter(p => !p.notFound)

  // Compute per-event peer average percentile across all active peers
  const peerNames = activePeers.map(p => p.name)
  const avgChartData = chartData.map(point => {
    const vals = peerNames.map(n => point[n]).filter(v => v != null)
    return {
      ...point,
      peerAvg: vals.length > 0 ? parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)) : null,
      peerCount: vals.length,
    }
  })

  const yearBands = getYearBands(avgChartData.filter(d => d.id))

  const summary = (() => {
    if (!activePeers.length) return null
    const ahead = activePeers.filter(p => (p.avgDelta ?? 0) < 0).length
    const total = activePeers.length
    const behind = activePeers.filter(p => (p.avgDelta ?? 0) >= 0)
    const closest = behind.length > 0
      ? behind.reduce((a, b) => Math.abs(a.avgDelta ?? Infinity) < Math.abs(b.avgDelta ?? Infinity) ? a : b)
      : null
    const positionLine = ahead === total
      ? `You're running ahead of all ${total} tracked peer${total !== 1 ? 's' : ''}.`
      : ahead === 0
      ? `You're currently behind all ${total} tracked peer${total !== 1 ? 's' : ''}.`
      : `You're ahead of ${ahead} of ${total} tracked peers on average.`
    const gapLine = closest
      ? ` ${closest.name} is the gap to close — ${Math.abs(closest.avgDelta ?? 0).toFixed(3)}s back on average.`
      : ''
    return <>{positionLine}{gapLine}</>
  })()

  return (
    <ChartCard
      title="Peer Comparison"
      subtitle="Your PAX percentile vs the average of your peer group"
      summary={summary}
    >
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={avgChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
            domain={[0, 100]}
            tick={{ fill: COLORS.fg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip selectedPeer={activePeerName} />} cursor={{ stroke: 'rgba(0,0,0,0.08)', strokeWidth: 1 }} />
          <Line
            dataKey="peerAvg"
            stroke={COLORS.pinned}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          {activePeerName && (
            <Line
              key={activePeerName}
              dataKey={activePeerName}
              stroke={COLORS.highlight}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS.highlight, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: COLORS.highlight }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          <Line
            dataKey="ryan"
            stroke={COLORS.ryan}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: COLORS.ryan }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Peer summary table */}
      {peers.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-fg-subtle uppercase tracking-wider" style={{ fontSize: 10 }}>
                <th className="text-left pb-1.5 font-medium pr-3">Driver</th>
                <th className="text-left pb-1.5 font-medium pr-3">Class · Car</th>
                <th className="text-right pb-1.5 font-medium pr-3">Shared</th>
                <th className="text-right pb-1.5 font-medium pr-3">Their avg %</th>
                <th className="text-right pb-1.5 font-medium pr-3">Your avg %</th>
                <th className="text-right pb-1.5 font-medium pr-3">Avg gap</th>
                <th className="text-right pb-1.5 font-medium">H2H</th>
              </tr>
            </thead>
            <tbody>
              {peers.map(peer => (
                <tr
                  key={peer.name}
                  className={`border-t border-border-subtle transition-colors ${peer.notFound ? '' : 'cursor-pointer'} ${selectedPeer === peer.name ? 'bg-orange-100/80 dark:bg-orange-900/25' : activePeerName === peer.name ? 'bg-orange-50/60 dark:bg-orange-900/10' : ''}`}
                  onClick={() => handleRowClick(peer)}
                  onMouseEnter={() => !peer.notFound && setHoveredPeer(peer.name)}
                  onMouseLeave={() => setHoveredPeer(null)}
                >
                  <td className="py-1.5 pr-3 text-fg font-medium whitespace-nowrap">
                    {peer.name}
                    {peer.isPinned && <span className="ml-1 text-fg-subtle">★</span>}
                    {peer.notFound && <span className="ml-1.5 text-fg-subtle italic">(not found)</span>}
                  </td>
                  <td className="py-1.5 pr-3 text-fg-muted">
                    {peer.classes?.length
                      ? <div className="flex flex-col gap-0.5">
                          {peer.classes.map((cls, i) => (
                            <div key={cls}>
                              <span className="font-medium text-fg">{cls}</span>
                              {peer.cars?.[i] && <span className="ml-1.5">{peer.cars[i]}</span>}
                            </div>
                          ))}
                        </div>
                      : '—'}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-fg-muted">
                    {peer.sharedEvents.length}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-fg-muted">
                    {peer.avgPercentile != null ? `${peer.avgPercentile}%` : '—'}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-fg-muted">
                    {peer.ryanAvgPercentile != null ? `${peer.ryanAvgPercentile}%` : '—'}
                  </td>
                  <td className={`py-1.5 pr-3 text-right tabular-nums font-medium ${
                    peer.avgDelta == null ? 'text-fg-muted'
                    : peer.avgDelta < 0 ? 'text-success'
                    : 'text-accent'
                  }`}>
                    {formatDelta(peer.avgDelta)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-fg-muted">
                    {peer.notFound ? '—' : `${peer.h2hWins}/${peer.sharedEvents.length}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  )
}
