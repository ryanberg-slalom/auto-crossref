import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeasonData } from '../hooks/useSeasonData'
import { SubnavContext } from '../contexts/SubnavContext'
import SeasonSummary from '../components/dashboard/SeasonSummary'
import PercentileChart from '../components/dashboard/PercentileChart'
import GapBarChart from '../components/dashboard/GapBarChart'
import PstRankChart from '../components/dashboard/PstRankChart'
import ConeStats from '../components/dashboard/ConeStats'
import ConeBarChart from '../components/dashboard/ConeBarChart'
import ConeStackedChart from '../components/dashboard/ConeStackedChart'
import RunProgressionChart from '../components/dashboard/RunProgressionChart'
import { venueColor } from '../components/shared/venueColors'

export default function DashboardPage() {
  const { attendedEvents, subject, season } = useSeasonData()
  const navigate = useNavigate()
  const setSubnav = useContext(SubnavContext)

  const sorted = [...attendedEvents].sort((a, b) => a.date.localeCompare(b.date))

  useEffect(() => {
    setSubnav(
      <div className="flex items-center gap-3 min-w-0 w-full">
        <span className="text-sm font-extrabold text-fg">Dashboard</span>
        <span className="text-fg-subtle text-xs">·</span>
        <span className="text-xs text-fg-muted">{season}</span>
        <div className="flex-1" />
        <span className="text-xs text-fg-muted">
          {subject.name} · {subject.class}
        </span>
        <span className="text-xs px-2 py-0.5 font-medium text-fg-muted bg-surface-3 border border-border rounded">
          PAX {subject.pax_index}
        </span>
      </div>
    )
    return () => setSubnav(null)
  }, [season, subject, setSubnav])

  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-6 -mt-20 h-72 overflow-hidden z-0 [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]">
        <img
          src={`${import.meta.env.BASE_URL}cover-image-1-optimized.jpeg`}
          alt="Season cover"
          className="w-full h-full object-cover"
        />
        {/* <img
          src={`${import.meta.env.BASE_URL}558766540_10116331002846307_1863611152442060381_n.jpg`}
          alt="Season cover"
          className="w-full h-full object-cover"
        /> */}
      </div>

      <div className="-mt-24 relative z-10">
        <SeasonSummary attendedEvents={sorted} />
      </div>

      <div className="flex flex-col gap-4">
        <PercentileChart data={sorted} />
        <GapBarChart data={sorted} />
        <PstRankChart data={sorted} />
        <RunProgressionChart data={sorted} />
      </div>

      <div>
        <h2 className="text-xs font-semibold mb-2 uppercase tracking-wider text-fg-subtle">
          Cone Tracker
        </h2>
        <div className="flex flex-col gap-4">
          <ConeStats attendedEvents={sorted} />
          <ConeBarChart data={sorted} />
          <ConeStackedChart data={sorted} />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold mb-2 uppercase tracking-wider text-fg-subtle">
          Events
        </h2>
        <EventsTable events={[...sorted].reverse()} navigate={navigate} />
      </div>
    </div>
  )
}

function EventsTable({ events, navigate }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-subnav">
            {['Year', 'Event', 'Date', 'PAX Rank', 'Percentile', 'Indexed', 'Gap', 'PST Rank'].map(h => (
              <th
                key={h}
                className="px-4 py-2 text-left font-medium uppercase tracking-wider text-fg-subtle"
                style={{ fontSize: 10 }}
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
      className={[
        i < total - 1 ? 'border-b border-border-subtle' : '',
        'cursor-pointer hover:bg-surface-3',
      ].join(' ')}
      onClick={() => navigate(`/event/${e.id}`)}
    >
      <td className="px-4 py-2.5 tabular-nums text-fg-subtle">
        {e.season}
      </td>
      <td className="px-4 py-2.5 font-medium text-fg">
        <span
          className="inline-block w-[7px] h-[7px] rounded-full mr-1.5 align-middle shrink-0"
          style={{ backgroundColor: venueColor(e.venue) }}
        />
        #{e.event_number}
        {e.scoring_type === 'dual_run' && (
          <span className="ml-1.5 px-1 text-xs text-fg-subtle border border-border rounded-sm">
            2×
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-fg-muted">
        {new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </td>
      <td className="px-4 py-2.5 font-semibold tabular-nums text-bmw-blue">
        {r.pax_rank} / {r.pax_total}
      </td>
      <td className="px-4 py-2.5 tabular-nums text-fg">
        {r.pax_percentile}%
      </td>
      <td className="px-4 py-2.5 tabular-nums text-fg">
        {Number(r.official_indexed_time).toFixed(3)}
      </td>
      <td className={`px-4 py-2.5 tabular-nums ${r.pax_gap_pct < 5 ? 'text-success' : 'text-fg-muted'}`}>
        {r.pax_gap_pct !== null ? `+${r.pax_gap_pct}%` : '—'}
      </td>
      <td className="px-4 py-2.5 tabular-nums text-fg-muted">
        {r.hypothetical_pst_rank !== null ? `${r.hypothetical_pst_rank} / ${r.hypothetical_pst_total}` : '—'}
      </td>
    </tr>
  )
}
