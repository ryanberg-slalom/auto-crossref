import { useNavigate } from 'react-router-dom'
import { useSeasonData } from '../hooks/useSeasonData'
import SeasonSummary from '../components/dashboard/SeasonSummary'
import PaxRankChart from '../components/dashboard/PaxRankChart'
import PercentileChart from '../components/dashboard/PercentileChart'
import IndexedTimeChart from '../components/dashboard/IndexedTimeChart'
import GapBarChart from '../components/dashboard/GapBarChart'

export default function DashboardPage() {
  const { attendedEvents, subject, season } = useSeasonData()
  const navigate = useNavigate()

  const sorted = [...attendedEvents].sort((a, b) => a.event_number - b.event_number)

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-fg)' }}
          >
            {season} Season
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>
            {subject.name} · {subject.class} · {subject.car}
          </p>
        </div>
        <div
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{
            backgroundColor: 'var(--color-surface-3)',
            color: 'var(--color-fg-muted)',
            border: '1px solid var(--color-border)',
          }}
        >
          PAX {subject.pax_index}
        </div>
      </div>

      {/* Season summary stats */}
      <SeasonSummary attendedEvents={sorted} />

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PaxRankChart data={sorted} />
        <PercentileChart data={sorted} />
        <IndexedTimeChart data={sorted} />
        <GapBarChart data={sorted} />
      </div>

      {/* Events list */}
      <div>
        <h2
          className="text-sm font-semibold mb-3 uppercase tracking-wider"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          All Events
        </h2>
        <EventsTable events={sorted} navigate={navigate} />
      </div>
    </div>
  )
}

function EventsTable({ events, navigate }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--color-border)' }}
    >
      <table className="w-full text-xs">
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-3)', borderBottom: '1px solid var(--color-border)' }}>
            {['Event', 'Date', 'PAX Rank', 'Percentile', 'Indexed', 'Gap', 'PST Hyp.'].map(h => (
              <th
                key={h}
                className="px-4 py-2.5 text-left font-medium uppercase tracking-wider"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => {
            const r = e.ryan
            return (
              <EventRow
                key={e.id}
                event={e}
                ryan={r}
                index={i}
                total={events.length}
                navigate={navigate}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EventRow({ event: e, ryan: r, index: i, total, navigate }) {
  const handleClick = () => navigate(`/event/${e.id}`)

  return (
    <tr
      className="transition-colors"
      style={{
        backgroundColor: i % 2 === 0 ? 'var(--color-surface-2)' : 'transparent',
        borderBottom: i < total - 1 ? '1px solid var(--color-border-subtle)' : 'none',
        cursor: 'pointer',
      }}
      onClick={handleClick}
      onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = 'var(--color-surface-3)')}
      onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = i % 2 === 0 ? 'var(--color-surface-2)' : 'transparent')}
    >
      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-fg)' }}>
        E{e.event_number}
        {e.scoring_type === 'dual_run' && (
          <span
            className="ml-1.5 px-1.5 py-0.5 rounded text-xs"
            style={{ backgroundColor: 'var(--color-surface-3)', color: 'var(--color-fg-subtle)' }}
          >
            2×
          </span>
        )}
      </td>
      <td className="px-4 py-3" style={{ color: 'var(--color-fg-muted)' }}>
        {new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </td>
      <td className="px-4 py-3 font-semibold tabular-nums" style={{ color: 'var(--color-bmw-blue)' }}>
        {r.pax_rank} / {r.pax_total}
      </td>
      <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-fg)' }}>
        {r.pax_percentile}%
      </td>
      <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-fg)' }}>
        {r.official_indexed_time}s
      </td>
      <td
        className="px-4 py-3 tabular-nums"
        style={{ color: r.pax_gap_pct !== null && r.pax_gap_pct < 5 ? 'var(--color-success)' : 'var(--color-fg-muted)' }}
      >
        {r.pax_gap_pct !== null ? `+${r.pax_gap_pct}%` : '—'}
      </td>
      <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>
        {r.hypothetical_pst_rank !== null ? `${r.hypothetical_pst_rank} / ${r.hypothetical_pst_total}` : '—'}
      </td>
    </tr>
  )
}
