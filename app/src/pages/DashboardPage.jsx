import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeasonData } from '../hooks/useSeasonData'
import { SubnavContext } from '../contexts/SubnavContext'
import SeasonSummary from '../components/dashboard/SeasonSummary'
import PaxRankChart from '../components/dashboard/PaxRankChart'
import PercentileChart from '../components/dashboard/PercentileChart'
import IndexedTimeChart from '../components/dashboard/IndexedTimeChart'
import GapBarChart from '../components/dashboard/GapBarChart'

export default function DashboardPage() {
  const { attendedEvents, subject, season } = useSeasonData()
  const navigate = useNavigate()
  const setSubnav = useContext(SubnavContext)

  const sorted = [...attendedEvents].sort((a, b) => a.event_number - b.event_number)

  useEffect(() => {
    setSubnav(
      <div className="flex items-center gap-3 w-full">
        <span className="text-xs font-medium" style={{ color: 'var(--color-fg)' }}>
          {season} Season
        </span>
        <span style={{ color: 'var(--color-border)' }}>·</span>
        <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
          {subject.name} · {subject.class} · {subject.car}
        </span>
        <div className="flex-1" />
        <span
          className="text-xs px-2 py-0.5 font-medium"
          style={{
            color: 'var(--color-fg-muted)',
            backgroundColor: 'var(--color-surface-3)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
          }}
        >
          PAX {subject.pax_index}
        </span>
      </div>
    )
    return () => setSubnav(null)
  }, [season, subject, setSubnav])

  return (
    <div className="flex flex-col gap-6">
      <SeasonSummary attendedEvents={sorted} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PaxRankChart data={sorted} />
        <PercentileChart data={sorted} />
        <IndexedTimeChart data={sorted} />
        <GapBarChart data={sorted} />
      </div>

      <div>
        <h2
          className="text-xs font-semibold mb-2 uppercase tracking-wider"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          Events
        </h2>
        <EventsTable events={sorted} navigate={navigate} />
      </div>
    </div>
  )
}

function EventsTable({ events, navigate }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface-2)',
      }}
    >
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-subnav)' }}>
            {['Event', 'Date', 'PAX Rank', 'Percentile', 'Indexed', 'Gap', 'PST Hyp.'].map(h => (
              <th
                key={h}
                className="px-4 py-2 text-left font-medium uppercase tracking-wider"
                style={{ color: 'var(--color-fg-subtle)', fontSize: 10 }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <EventRow
              key={e.id}
              event={e}
              ryan={e.ryan}
              index={i}
              total={events.length}
              navigate={navigate}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EventRow({ event: e, ryan: r, index: i, total, navigate }) {
  return (
    <tr
      style={{
        borderBottom: i < total - 1 ? '1px solid var(--color-border-subtle)' : 'none',
        cursor: 'pointer',
      }}
      onClick={() => navigate(`/event/${e.id}`)}
      onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = 'var(--color-surface-3)')}
      onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = '')}
    >
      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-fg)' }}>
        E{e.event_number}
        {e.scoring_type === 'dual_run' && (
          <span
            className="ml-1.5 px-1 text-xs"
            style={{
              color: 'var(--color-fg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            2×
          </span>
        )}
      </td>
      <td className="px-4 py-2.5" style={{ color: 'var(--color-fg-muted)' }}>
        {new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </td>
      <td className="px-4 py-2.5 font-semibold tabular-nums" style={{ color: 'var(--color-bmw-blue)' }}>
        {r.pax_rank} / {r.pax_total}
      </td>
      <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--color-fg)' }}>
        {r.pax_percentile}%
      </td>
      <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--color-fg)' }}>
        {r.official_indexed_time}s
      </td>
      <td
        className="px-4 py-2.5 tabular-nums"
        style={{ color: r.pax_gap_pct < 5 ? 'var(--color-success)' : 'var(--color-fg-muted)' }}
      >
        {r.pax_gap_pct !== null ? `+${r.pax_gap_pct}%` : '—'}
      </td>
      <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>
        {r.hypothetical_pst_rank !== null ? `${r.hypothetical_pst_rank} / ${r.hypothetical_pst_total}` : '—'}
      </td>
    </tr>
  )
}
