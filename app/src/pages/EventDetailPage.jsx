import { useContext, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { useSeasonData } from '../hooks/useSeasonData'
import { SubnavContext } from '../contexts/SubnavContext'
import PositionCard from '../components/event/PositionCard'
import PstCard from '../components/event/PstCard'
import RunTimeline from '../components/event/RunTimeline'
import FieldHistogram from '../components/event/FieldHistogram'
import ClassResults from '../components/event/ClassResults'

const RYAN_NAME = 'Ryan Berg'

const NAV_BTN = {
  background: 'none',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  color: 'var(--color-fg-muted)',
  cursor: 'pointer',
  fontSize: 11,
  padding: '2px 8px',
  lineHeight: '20px',
}

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const result = useEvent(id)
  const { attendedEvents } = useSeasonData()
  const setSubnav = useContext(SubnavContext)

  const sorted = [...attendedEvents].sort((a, b) => a.event_number - b.event_number)
  const idx = result ? sorted.findIndex(e => e.id === id) : -1
  const prevEvent = idx > 0 ? sorted[idx - 1] : null
  const nextEvent = idx < sorted.length - 1 ? sorted[idx + 1] : null

  useEffect(() => {
    if (!result) return
    const { event } = result
    const dateStr = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })

    setSubnav(
      <div className="flex items-center gap-1.5 w-full text-xs" style={{ color: 'var(--color-fg-muted)' }}>
        <Link to="/" className="no-underline hover:underline" style={{ color: 'var(--color-fg-muted)' }}>
          Season
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--color-fg)' }}>
          Event {event.event_number} — {event.title}
        </span>
        {event.scoring_type === 'dual_run' && (
          <span
            className="px-1.5 font-medium"
            style={{
              color: 'var(--color-bmw-blue)',
              border: '1px solid var(--color-bmw-blue)',
              borderRadius: 'var(--radius-sm)',
              opacity: 0.8,
              fontSize: 10,
            }}
          >
            Dual Run
          </span>
        )}
        <span style={{ color: 'var(--color-border)' }}>·</span>
        <span>{dateStr}</span>
        <span style={{ color: 'var(--color-border)' }}>·</span>
        <span>{event.total_drivers_pax} drivers</span>

        <div className="flex-1" />

        {prevEvent && (
          <button style={NAV_BTN} onClick={() => navigate(`/event/${prevEvent.id}`)}>
            ← E{prevEvent.event_number}
          </button>
        )}
        {nextEvent && (
          <button style={NAV_BTN} onClick={() => navigate(`/event/${nextEvent.id}`)}>
            E{nextEvent.event_number} →
          </button>
        )}
      </div>
    )
    return () => setSubnav(null)
  }, [result, prevEvent, nextEvent, navigate, setSubnav])

  if (!result) {
    return (
      <div className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        Event not found.{' '}
        <Link to="/" style={{ color: 'var(--color-bmw-blue)' }}>Back to season</Link>
      </div>
    )
  }

  const { event } = result
  const ryan = event.ryan

  return (
    <div className="flex flex-col gap-5">
      {!event.ryan_attended || !ryan ? (
        <div
          className="p-8 text-center"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
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
            />
          </div>

          <RunTimeline
            runs={ryan.runs}
            scoringType={event.scoring_type}
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
        </>
      )}
    </div>
  )
}
