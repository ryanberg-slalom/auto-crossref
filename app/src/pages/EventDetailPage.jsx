import { useContext, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import { useEvent } from '../hooks/useEvent'
import { useSeasonData } from '../hooks/useSeasonData'
import { SubnavContext } from '../contexts/SubnavContext'
import { venueColor } from '../components/shared/venueColors'
import PositionCard from '../components/event/PositionCard'
import PstCard from '../components/event/PstCard'
import RunTimeline from '../components/event/RunTimeline'
import FieldHistogram from '../components/event/FieldHistogram'
import ClassResults from '../components/event/ClassResults'
import PstResults from '../components/event/PstResults'

const RYAN_NAME = 'Ryan Berg'

function NavIconBtn({ onClick, disabled, children }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex items-center justify-center w-7 h-7 rounded border bg-transparent',
        disabled
          ? 'border-border text-fg-subtle opacity-30 cursor-not-allowed'
          : 'border-border text-fg-muted cursor-pointer hover:text-fg hover:border-fg-muted',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const result = useEvent(id)
  const { attendedEvents, subject } = useSeasonData()
  const setSubnav = useContext(SubnavContext)

  const sorted = [...attendedEvents].sort((a, b) => a.date.localeCompare(b.date))
  const idx = result ? sorted.findIndex(e => e.id === id) : -1
  const prevEvent = idx > 0 ? sorted[idx - 1] : null
  const nextEvent = idx < sorted.length - 1 ? sorted[idx + 1] : null

  useEffect(() => {
    if (!result) return

    const { event } = result
    const venueName = event.venue === 'michelin' ? 'Michelin' : 'ZMAX'
    const dateStr = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    })

    setSubnav(
      <div className="flex items-center min-w-0 w-full gap-3">
        {/* Event identity */}
        <span className="text-xs font-semibold text-fg-subtle shrink-0">
          #{event.event_number}
        </span>
        <span className="text-sm font-extrabold text-fg truncate">
          {event.title}
        </span>

        {/* Metadata pills */}
        <div className="flex items-center gap-2 shrink-0 text-xs text-fg-muted">
          <span className="text-fg-subtle">·</span>
          <span
            className="flex items-center gap-1 font-medium"
            style={{ color: venueColor(event.venue) }}
          >
            <span className="text-[7px] leading-none">●</span>
            {venueName}
          </span>
          <span className="text-fg-subtle">·</span>
          <span>{dateStr}</span>
          <span className="text-fg-subtle">·</span>
          <span>{event.total_drivers_pax} drivers</span>
          {event.scoring_type === 'dual_run' && (
            <>
              <span className="text-fg-subtle">·</span>
              <span className="font-medium px-1.5 py-px rounded-sm text-bmw-blue border border-bmw-blue/40 bg-bmw-blue/5">
                Dual Run
              </span>
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* Prev / next */}
        <div className="flex items-center gap-1 shrink-0">
          <NavIconBtn
            disabled={!prevEvent}
            onClick={() => navigate(`/event/${prevEvent.id}`)}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </NavIconBtn>
          <NavIconBtn
            disabled={!nextEvent}
            onClick={() => navigate(`/event/${nextEvent.id}`)}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </NavIconBtn>
        </div>
      </div>
    )
    return () => setSubnav(null)
  }, [result, prevEvent, nextEvent, navigate, setSubnav])

  if (!result) {
    return (
      <div className="text-sm text-fg-muted">
        Event not found.{' '}
        <Link to="/" className="text-bmw-blue">Back to season</Link>
      </div>
    )
  }

  const { event } = result
  const ryan = event.ryan
  const isActualPst = ryan?.class_code?.toUpperCase().startsWith('PST') ?? false

  return (
    <div className="flex flex-col gap-5">
      {!event.ryan_attended || !ryan ? (
        <div className="p-8 text-center bg-surface-2 border border-border rounded-lg">
          <p className="text-sm text-fg-muted">
            Ryan did not attend this event.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PositionCard
              title="PAX Position"
              rank={ryan.pax_rank}
              total={ryan.pax_total}
              time={ryan.official_indexed_time}
              timeLabel="Indexed time"
              gapSeconds={ryan.pax_gap_seconds}
              gapPct={ryan.pax_gap_pct}
              percentile={ryan.pax_percentile}
            />
            <PositionCard
              title="RAW Position"
              rank={ryan.raw_rank}
              total={ryan.raw_total}
              time={ryan.best_raw_time}
              timeLabel="Best raw time"
              gapSeconds={ryan.raw_gap_seconds}
              gapPct={ryan.raw_gap_pct}
            />
            <PstCard
              indexedTime={ryan.hypothetical_pst_indexed_time}
              pstRank={ryan.hypothetical_pst_rank}
              pstTotal={ryan.hypothetical_pst_total}
              pstPercentile={ryan.hypothetical_pst_percentile}
              isActualPst={isActualPst}
            />
          </div>

          <RunTimeline
            runs={ryan.runs}
            scoringType={event.scoring_type}
            venue={event.venue}
            bestRawTime={ryan.best_raw_time}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.pax_results.length > 0 && (
              <FieldHistogram
                paxResults={event.pax_results}
                ryanIndexedTime={ryan.official_indexed_time}
              />
            )}
            <ClassResults
              paxResults={event.pax_results}
              classCode={ryan.class_code || 'FS'}
              ryanName={RYAN_NAME}
            />
          </div>

          {event.pax_results.some(d => d.class_code?.startsWith('PST')) && (
            <PstResults
              paxResults={event.pax_results}
              ryan={ryan}
              ryanCar={subject?.car}
              ryanName={RYAN_NAME}
              isActualPst={isActualPst}
            />
          )}
        </>
      )}
    </div>
  )
}
